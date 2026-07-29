#!/usr/bin/env python3
"""
Validator pentru `webdev/nginx.conf` — rulează FĂRĂ Docker și fără nginx instalat.

Folosește `crossplane`, parserul oficial NGINX (același lexer/parser ca nginx,
împachetat de NGINX Inc.), deci „se parsează" înseamnă aici chiar ce ar spune
`nginx -t`, nu o aproximare cu regexuri.

Ce verifică, în AMBELE stări ale măștii de pre-lansare (pornită și oprită):

  1. configul se parsează fără erori (directive necunoscute, context greșit,
     paranteze, `;` lipsă) — inclusiv conținutul REAL al lui `mask.conf`, extras
     din `scripts/site-mask.sh`, nu o copie care poate diverge;
  2. locațiile care TREBUIE să rămână accesibile fără parolă nu au `auth_basic`:
       /.well-known/                → ACME; blocat = certificatul TLS expiră
       /healthz                     → healthcheck-ul Docker al frontendului
       /api_crowe_bizcheck/health   → smoke-testul din deploy.sh
       /robots.txt                  → trebuie citibil ca `noindex` să conteze
  3. locațiile de conținut chiar SUNT protejate când masca e pornită;
  4. `X-Robots-Tag: noindex` apare exact acolo unde apare și `auth_basic`
     (același fișier → nu pot diverge), și are `always` (fără el nu s-ar
     aplica pe 401, singurul răspuns pe care îl vede un crawler);
  5. cu masca OPRITĂ nu rămâne niciun `noindex` agățat — capcana clasică.

Rulare (din webdev/):
    python3 scripts/validate-nginx.py
Cod de ieșire: 0 = ambele stări sunt valide, 1 = cel puțin o problemă.
"""

from __future__ import annotations

import re
import shutil
import sys
import tempfile
from pathlib import Path

try:
    import crossplane
except ImportError:
    print("FAIL: crossplane nu e instalat.  pip3 install crossplane", file=sys.stderr)
    sys.exit(2)

ROOT = Path(__file__).resolve().parent.parent          # webdev/
NGINX_CONF = ROOT / "nginx.conf"
MASK_SCRIPT = ROOT / "scripts" / "site-mask.sh"

# Calea absolută din nginx.conf, rescrisă spre directorul temporar la validare.
MASK_INCLUDE = "/etc/nginx/maintenance"

# Locații care NU au voie să ajungă niciodată sub Basic Auth, cu motivul.
MUST_STAY_OPEN = {
    "/.well-known/": "ACME http-01 — blocat, `certbot renew` pică și TLS expiră in 90 de zile",
    "/healthz": "healthcheck-ul Docker al serviciului frontend — 401 = container unhealthy = rollback",
    "/api_crowe_bizcheck/health": "smoke-testul din deploy.sh — 401 = rollback la fiecare deploy",
    "/robots.txt": "trebuie citibil: blocat, crawlerul nu mai vede `noindex`",
}

# Locații de conținut care TREBUIE protejate când masca e pornită.
MUST_BE_MASKED = {
    "/": "SPA-ul public + panoul de admin",
    "/api_crowe_bizcheck/": "API-ul — altfel conținutul se descarcă ca JSON",
    "/sitemap.xml": "lista de URL-uri gata de indexat",
    "/pdf/": "PDF-urile statice",
}

errors: list[str] = []
checks = 0


def check(ok: bool, msg: str) -> bool:
    global checks
    checks += 1
    if not ok:
        errors.append(msg)
    return ok


def mask_conf_body() -> str:
    """Conținutul real al lui mask.conf, extras din heredocul lui site-mask.sh."""
    src = MASK_SCRIPT.read_text(encoding="utf-8")
    m = re.search(r"# MASK-CONF-BEGIN\n(.*?)# MASK-CONF-END", src, re.S)
    if not m:
        print("FAIL: nu găsesc blocul MASK-CONF-BEGIN/END în scripts/site-mask.sh",
              file=sys.stderr)
        sys.exit(1)
    body = m.group(1)
    # Singura interpolare de shell din heredoc.
    return body.replace("${REALM}", "BizCheck - site in preparation")


def flatten(directives, configs):
    """Rezolvă `include` în linie, ca să vedem directivele efective ale unei locații."""
    out = []
    for d in directives:
        if d["directive"] == "include":
            for idx in d.get("includes", []):
                out.extend(flatten(configs[idx]["parsed"], configs))
        else:
            out.append(d)
    return out


def walk_locations(directives, configs, acc):
    """Adună {eticheta locației: [directive efective]} pentru tot arborele."""
    for d in flatten(directives, configs):
        block = d.get("block")
        if block is None:
            continue
        if d["directive"] == "location":
            label = " ".join(d["args"])
            acc[label] = flatten(block, configs)
        walk_locations(block, configs, acc)
    return acc


def analyse(state: str, mask_on: bool) -> None:
    """Parsează configul într-un arbore temporar și verifică invariantele."""
    tmp = Path(tempfile.mkdtemp(prefix="bizcheck-nginx-"))
    try:
        maint = tmp / "maintenance"
        maint.mkdir()
        if mask_on:
            (maint / "mask.conf").write_text(mask_conf_body(), encoding="utf-8")

        # nginx.conf din repo e un fragment de conf.d (context `http`) → îl
        # împachetăm exact cum îl împachetează nginx în container.
        frag = tmp / "default.conf"
        frag.write_text(
            NGINX_CONF.read_text(encoding="utf-8").replace(MASK_INCLUDE, str(maint)),
            encoding="utf-8",
        )
        main = tmp / "nginx.conf"
        main.write_text(
            "events { worker_connections 1024; }\n"
            f"http {{\n    include {frag};\n}}\n",
            encoding="utf-8",
        )

        payload = crossplane.parse(str(main), catch_errors=True)
        parse_errors = payload.get("errors", [])
        if not check(payload.get("status") == "ok" and not parse_errors,
                     f"[{state}] nginx.conf NU se parsează: "
                     + "; ".join(f"{e.get('file')}:{e.get('line')} {e.get('error')}"
                                 for e in parse_errors)):
            return

        configs = payload["config"]
        locs: dict[str, list] = {}
        for cfg in configs:
            walk_locations(cfg["parsed"], configs, locs)

        check(bool(locs), f"[{state}] nu am găsit nicio locație — s-a schimbat forma configului?")

        def names(label: str) -> set[str]:
            return {d["directive"] for d in locs[label]}

        def find(prefix: str) -> str | None:
            """Eticheta locației care servește `prefix` (cu sau fără `=` / `^~`)."""
            for label in locs:
                if label.split()[-1] == prefix:
                    return label
            return None

        # ── 2. Ce trebuie să rămână deschis ──────────────────────────────────
        for path, why in MUST_STAY_OPEN.items():
            label = find(path)
            if not check(label is not None, f"[{state}] lipsește locația `{path}` — {why}"):
                continue
            check("auth_basic" not in names(label),
                  f"[{state}] `{label}` a ajuns sub Basic Auth. {why}")

        # ── 3 + 4. Ce trebuie protejat, și noindex-ul care merge la pachet ───
        assets = next((l for l in locs if l.startswith("~*") and "woff2" in l), None)
        check(assets is not None,
              f"[{state}] nu găsesc locația de asset-uri statice (regex cu woff2)")

        targets = {}
        for path, why in MUST_BE_MASKED.items():
            label = find(path)
            if check(label is not None, f"[{state}] lipsește locația `{path}` ({why})"):
                targets[label] = why
        if assets:
            targets[assets] = "bundle-ul JS = tot site-ul"

        for label, why in targets.items():
            has_auth = "auth_basic" in names(label)
            check(has_auth == mask_on,
                  f"[{state}] `{label}`: auth_basic={has_auth}, așteptat {mask_on} ({why})")

        # ── 5. `noindex` legat de mască, nicăieri altundeva ──────────────────
        # /healthz are un noindex permanent propriu (nu e conținut) — exceptat.
        healthz = find("/healthz")
        for label, directives in locs.items():
            robots = [d for d in directives
                      if d["directive"] == "add_header" and d["args"][:1] == ["X-Robots-Tag"]]
            auth = any(d["directive"] == "auth_basic" for d in directives)
            if label == healthz:
                check(bool(robots), f"[{state}] `/healthz` ar trebui să poarte X-Robots-Tag")
                continue
            check(bool(robots) == auth,
                  f"[{state}] `{label}`: X-Robots-Tag={bool(robots)} dar auth_basic={auth} — "
                  f"cele două TREBUIE să apară împreună (același mask.conf). Un `noindex` "
                  f"rămas fără mască ține site-ul invizibil în Google.")
            for d in robots:
                check("noindex" in " ".join(d["args"]),
                      f"[{state}] `{label}`: X-Robots-Tag fără `noindex`: {d['args']}")
                check(d["args"][-1] == "always",
                      f"[{state}] `{label}`: X-Robots-Tag fără `always` → nu se aplică pe 401, "
                      f"exact răspunsul pe care îl vede crawlerul")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


analyse("mască OPRITĂ", mask_on=False)
analyse("mască PORNITĂ", mask_on=True)

for e in errors:
    print(f"FAIL  {e}")
if errors:
    print(f"\n{len(errors)} problemă(e) din {checks} verificări.")
    sys.exit(1)
print(f"OK    {checks} verificări trecute (ambele stări ale măștii), crossplane "
      f"{getattr(crossplane, '__version__', '?')}.")
