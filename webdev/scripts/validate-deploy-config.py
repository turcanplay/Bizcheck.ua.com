#!/usr/bin/env python3
"""
Validator de configurație de deploy — rulează FĂRĂ Docker.

De ce există: două liste care trebuie să coincidă, dar nimic nu le lega.
`deploy.sh` verifica 4 variabile, backendul cerea la boot altele (JWT_REFRESH_SECRET
lipsea), iar boții mureau la pornire pe tokenuri neverificate. Rezultatul era mereu
același: healthcheck-ul nu devenea verde, deploy.sh făcea rollback la timeout și
operatorul rămânea fără cauză vizibilă. La fel, SITEMAP_API_URL nu avea cum să ajungă
la `npm run build` — lipsea ARG-ul din Dockerfile și `build.args` din compose.

Verificările de aici prind exact aceste divergențe, citind sursele de adevăr:
  1. docker-compose.yml se parsează și respectă invariantele de rețea ale proiectului
  2. tot ce cere backendul la boot (`_required_env` din backend/server.py) e în
     REQUIRED_VARS din deploy.sh
  3. tot ce face un bot să moară la pornire (`raise RuntimeError("X is not set")`)
     e în REQUIRED_VARS din deploy.sh
  4. lanțul de build-time e complet: compose build.args → ARG → ENV în Dockerfile
  5. .env.example documentează fiecare variabilă obligatorie și fiecare build arg

Rulare:
    python3 scripts/validate-deploy-config.py          # din webdev/
Cod de ieșire: 0 = totul e consistent, 1 = cel puțin o eroare.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

try:
    import yaml
except ImportError:  # pragma: no cover
    print("FAIL: PyYAML nu e instalat.  pip install pyyaml", file=sys.stderr)
    sys.exit(1)

ROOT = Path(__file__).resolve().parent.parent  # webdev/

errors: list[str] = []
warnings: list[str] = []
checks = 0


def check(ok: bool, msg: str) -> bool:
    global checks
    checks += 1
    if not ok:
        errors.append(msg)
    return ok


def read(rel: str) -> str:
    return (ROOT / rel).read_text(encoding="utf-8")


# ---------------------------------------------------------------------------
# 1. docker-compose.yml — se parsează + invariantele din CLAUDE.md
# ---------------------------------------------------------------------------
try:
    compose = yaml.safe_load(read("docker-compose.yml"))
except Exception as exc:  # noqa: BLE001
    print(f"FAIL: docker-compose.yml nu se parsează: {exc}", file=sys.stderr)
    sys.exit(1)

check(isinstance(compose, dict) and isinstance(compose.get("services"), dict),
      "docker-compose.yml: cheia `services` lipsește sau nu e o mapare")
services = compose.get("services", {})

for name in ("db", "backend", "frontend", "tgbot", "groupbot"):
    check(name in services, f"docker-compose.yml: serviciul `{name}` lipsește")

# Backendul și baza NU se publică pe gazdă (CLAUDE.md → „Network shape").
for name in ("backend", "db"):
    svc = services.get(name, {})
    check("ports" not in svc,
          f"docker-compose.yml: `{name}` are `ports:` — backendul/baza nu se expun public")
check("4001" in [str(p) for p in services.get("backend", {}).get("expose", [])],
      "docker-compose.yml: `backend` nu mai are `expose: 4001`")

# Singura legare pe gazdă e frontendul, și numai pe loopback.
for port in services.get("frontend", {}).get("ports", []):
    check(str(port).startswith("127.0.0.1:"),
          f"docker-compose.yml: `frontend` publică `{port}` în afara loopbackului")

# Fiecare serviciu din SERVICES al lui deploy.sh trebuie să existe în compose.
deploy_sh = read("deploy.sh")
m = re.search(r"^SERVICES=\(([^)]*)\)", deploy_sh, re.M)
check(m is not None, "deploy.sh: nu găsesc declarația SERVICES=(...)")
if m:
    for name in m.group(1).split():
        check(name in services, f"deploy.sh: SERVICES conține `{name}`, absent din compose")

# ---------------------------------------------------------------------------
# 2 + 3. Variabile obligatorii: deploy.sh vs. ce cer efectiv serviciile la boot
# ---------------------------------------------------------------------------
m = re.search(r"^REQUIRED_VARS=\(([^)]*)\)", deploy_sh, re.M | re.S)
check(m is not None, "deploy.sh: nu găsesc declarația REQUIRED_VARS=(...)")
required_vars: set[str] = set()
if m:
    # Ignorăm comentariile de la capăt de linie din interiorul array-ului.
    body = re.sub(r"#.*", "", m.group(1))
    required_vars = set(re.findall(r"\b[A-Z][A-Z0-9_]+\b", body))

# 2. backend/server.py → `_required_env = [...]` și `_required_env += [...]`
server_py = read("backend/server.py")
backend_required: set[str] = set()
for block in re.findall(r"_required_env\s*\+?=\s*\[(.*?)\]", server_py, re.S):
    backend_required.update(re.findall(r'"([A-Z][A-Z0-9_]+)"', block))
check(bool(backend_required),
      "backend/server.py: nu am putut extrage `_required_env` (s-a schimbat forma?)")
for var in sorted(backend_required):
    check(var in required_vars,
          f"DIVERGENȚĂ: backend/server.py cere `{var}` la boot, dar lipsește din "
          f"REQUIRED_VARS al lui deploy.sh → backend în restart-loop, rollback fără cauză")

# 3. Boți: `raise RuntimeError("<VAR> is not set")` = moarte la pornire → restart-loop
bot_required: dict[str, str] = {}
for rel in ("tgbot/bot.py", "groupbot/bot.py"):
    for var in re.findall(r'RuntimeError\(\s*["\']([A-Z][A-Z0-9_]+) is not set', read(rel)):
        bot_required[var] = rel
check(bool(bot_required), "Nu am găsit niciun `RuntimeError(\"X is not set\")` în boți")
for var, rel in sorted(bot_required.items()):
    check(var in required_vars,
          f"DIVERGENȚĂ: {rel} moare la pornire fără `{var}`, dar lipsește din "
          f"REQUIRED_VARS al lui deploy.sh → serviciu în restart-loop, rollback la timeout")

# ---------------------------------------------------------------------------
# 4. Lanțul de build-time: compose build.args → ARG → ENV în Dockerfile.frontend
# ---------------------------------------------------------------------------
fe_build = services.get("frontend", {}).get("build", {})
check(isinstance(fe_build, dict),
      "docker-compose.yml: `frontend.build` e formă scurtă — nu poate purta `args:`")
build_args = fe_build.get("args", {}) if isinstance(fe_build, dict) else {}
if isinstance(build_args, list):  # forma „KEY=value"
    build_args = dict(a.split("=", 1) for a in build_args if "=" in a)

check("SITEMAP_API_URL" in build_args,
      "docker-compose.yml: `frontend.build.args` nu transmite SITEMAP_API_URL → "
      "sitemapul va fi mereu incomplet")

dockerfile = read("Dockerfile.frontend")
declared_args = set(re.findall(r"^\s*ARG\s+([A-Z][A-Z0-9_]+)", dockerfile, re.M))
# ENV poate fi scris pe mai multe linii cu `\` — normalizăm continuările.
env_block = re.sub(r"\\\n", " ", dockerfile)
declared_env = set(re.findall(r"(?:^|\s)([A-Z][A-Z0-9_]+)=\$", env_block))
build_line = re.search(r"^\s*RUN\s+npm run build", dockerfile, re.M)
check(build_line is not None, "Dockerfile.frontend: nu găsesc `RUN npm run build`")

for arg, value in sorted(build_args.items()):
    check(arg in declared_args,
          f"Dockerfile.frontend: `ARG {arg}` lipsește, deși compose îl trimite ca build arg")
    check(arg in declared_env,
          f"Dockerfile.frontend: `{arg}` e ARG dar nu e promovat în `ENV` → "
          f"nu ajunge în process.env la `npm run build`")
    # Default sigur în compose: fără el, un .env care nu definește variabila oprește buildul.
    check(isinstance(value, str) and re.fullmatch(r"\$\{%s:-.*\}" % re.escape(arg), value or ""),
          f"docker-compose.yml: `{arg}` ar trebui scris ca ${{{arg}:-}} (default gol), "
          f"nu `{value}` — altfel un .env fără variabila asta face buildul imprevizibil")
    # ARG-ul trebuie să fie declarat ÎNAINTE de `npm run build`, altfel nu are efect.
    arg_pos = dockerfile.find(f"ARG {arg}")
    if build_line and arg_pos >= 0:
        check(arg_pos < build_line.start(),
              f"Dockerfile.frontend: `ARG {arg}` e declarat DUPĂ `npm run build`")

# Variabilele pe care le citesc efectiv scripturile de build trebuie să fie acoperite.
script_env: set[str] = set()
for rel in ("frontend/scripts/generate-sitemap.mjs",
            "frontend/scripts/generate-static-html.mjs",
            "frontend/scripts/lib/routing.mjs"):
    script_env.update(re.findall(r"process\.env\.([A-Z][A-Z0-9_]+)", read(rel)))
script_env.update(re.findall(r"import\.meta\.env\.(VITE_[A-Z0-9_]+)",
                             read("frontend/src/config/api.ts")))
for var in sorted(script_env):
    check(var in build_args,
          f"BUILD-TIME NEACOPERIT: frontendul citește `{var}` la build, dar compose nu îl "
          f"trimite prin `frontend.build.args` → valoarea din .env nu ajunge niciodată acolo")

# ---------------------------------------------------------------------------
# 5. .env.example documentează tot ce e obligatoriu / transmis la build
# ---------------------------------------------------------------------------
env_example = read(".env.example")
documented = set(re.findall(r"^([A-Z][A-Z0-9_]+)=", env_example, re.M))
for var in sorted(required_vars | set(build_args)):
    check(var in documented, f".env.example: `{var}` nu e documentat")

if "SITEMAP_API_URL" in documented:
    m = re.search(r"^SITEMAP_API_URL=(.*)$", env_example, re.M)
    value = (m.group(1) if m else "").strip()
    if not value:
        warnings.append(".env.example: SITEMAP_API_URL e gol — sitemapul iese incomplet")
    else:
        check(value.startswith("http") and value.rstrip("/") == value and "/api" in value,
              f".env.example: SITEMAP_API_URL={value!r} nu arată ca o origine + prefix de API "
              f"fără slash final (ex. https://bizcheck.ua.com/api_crowe_bizcheck)")
        if "127.0.0.1" in value or "localhost" in value or "//backend" in value:
            warnings.append(
                f".env.example: SITEMAP_API_URL={value!r} nu se poate rezolva din containerul "
                "de build (altă rețea decât compose) — folosește URL-ul public")

# ---------------------------------------------------------------------------
# 6. DATABASE_URL trebuie să fie SUPRASCRIIBIL din .env
# ---------------------------------------------------------------------------
# Bugul pe care îl blochează: ultimul pas al procedurii din
# backend/DATABASE_ROLE.md e `echo "DATABASE_URL=..." >> .env`. Cât timp
# valoarea din compose era un literal calculat din ${DB_USER}/${DB_PASSWORD},
# pasul ăla era un NO-OP — niciun serviciu nu are `env_file:`, deci `.env` e
# folosit exclusiv pentru substituția ${...}. Backendul rămânea pe superuser,
# dar operatorul credea că a securizat baza. Asta e mai rău decât să n-o fi
# făcut, pentru că elimină și suspiciunea.
#
# Verificăm SEMANTIC, nu prin potrivire de șabloane: reimplementăm regulile de
# substituție ale Compose v2 (compose-go/template: potrivire pe acolade
# echilibrate + substituție recursivă a valorii implicite) și rulăm valoarea
# reală din compose în ambele scenarii.


def compose_interpolate(value: str, env: dict[str, str]) -> str:
    """Substituție în stilul Docker Compose v2 (compose-go/template).

    Acoperă formele folosite în acest compose: $$, ${VAR}, ${VAR:-def},
    ${VAR-def}, ${VAR:?err}, ${VAR?err}, $VAR. Valoarea implicită e
    interpolată recursiv, deci ${A:-${B:-x}} funcționează — exact ce face
    compose-go prin getFirstBraceClosingIndex (potrivire pe acolade
    echilibrate, nu regex lacom/leneș).
    """
    out: list[str] = []
    i = 0
    n = len(value)
    while i < n:
        ch = value[i]
        if ch != "$":
            out.append(ch)
            i += 1
            continue
        if i + 1 < n and value[i + 1] == "$":     # $$ = $ literal
            out.append("$")
            i += 2
            continue
        if i + 1 < n and value[i + 1] == "{":
            depth = 0
            j = i + 1
            while j < n:
                if value[j] == "{":
                    depth += 1
                elif value[j] == "}":
                    depth -= 1
                    if depth == 0:
                        break
                j += 1
            if j >= n:
                raise ValueError(f"acoladă neînchisă în {value!r}")
            body = value[i + 2:j]
            i = j + 1
            for op in (":-", ":?", ":+", "-", "?", "+"):
                idx = body.find(op)
                if idx > 0:
                    name, arg = body[:idx], body[idx + len(op):]
                    break
            else:
                name, op, arg = body, "", ""
            cur = env.get(name)
            if op in (":-", ":?", ":+"):
                present = bool(cur)          # setat ȘI nevid
            else:
                present = cur is not None    # doar „setat"
            if op in (":-", "-"):
                out.append(cur if present else compose_interpolate(arg, env))
            elif op in (":+", "+"):
                out.append(compose_interpolate(arg, env) if present else "")
            elif op in (":?", "?"):
                if not present:
                    raise ValueError(f"{name}: {arg}")
                out.append(cur or "")
            else:
                out.append(cur or "")
            continue
        j = i + 1
        while j < n and (value[j].isalnum() or value[j] == "_"):
            j += 1
        out.append(env.get(value[i + 1:j]) or "")
        i = j
    return "".join(out)


backend_env = services.get("backend", {}).get("environment", {}) or {}
if isinstance(backend_env, list):  # forma „KEY=value"
    backend_env = dict(e.split("=", 1) for e in backend_env if "=" in e)
db_url_raw = backend_env.get("DATABASE_URL")

if check(isinstance(db_url_raw, str) and db_url_raw != "",
         "docker-compose.yml: serviciul `backend` nu are DATABASE_URL"):
    APP_URL = "postgresql://bizcheck_app:AppPw@db:5432/bizzcheck"
    DEFAULT_URL = "postgresql://postgres:pw@db:5432/bizzcheck"
    try:
        # a) fără DATABASE_URL în .env → EXACT comportamentul de azi (superuser).
        got_default = compose_interpolate(db_url_raw, {"DB_PASSWORD": "pw"})
        check(got_default == DEFAULT_URL,
              f"docker-compose.yml: fără DATABASE_URL în .env, backendul ar primi "
              f"{got_default!r} în loc de {DEFAULT_URL!r} — s-a schimbat comportamentul implicit")

        # b) cu DATABASE_URL în .env → trebuie să CÂȘTIGE. Dacă pică aici,
        #    procedura din backend/DATABASE_ROLE.md redevine un no-op.
        got_override = compose_interpolate(db_url_raw,
                                           {"DB_PASSWORD": "pw", "DATABASE_URL": APP_URL})
        check(got_override == APP_URL,
              f"REGRESIE: `DATABASE_URL` din .env NU ajunge la backend (ar primi "
              f"{got_override!r}). Scrie valoarea ca ${{DATABASE_URL:-<valoarea calculată>}}, "
              f"altfel pasul final din backend/DATABASE_ROLE.md e un no-op silențios "
              f"și baza rămâne pe superuser fără ca nimeni să observe.")

        # c) DATABASE_URL= (setat, dar gol) → revenire la valoarea calculată,
        #    adică rollbackul documentat funcționează și fără ștergerea liniei.
        got_empty = compose_interpolate(db_url_raw, {"DB_PASSWORD": "pw", "DATABASE_URL": ""})
        check(got_empty == DEFAULT_URL,
              f"docker-compose.yml: `DATABASE_URL=` gol ar da {got_empty!r} — "
              f"folosește `:-` (default la gol SAU nesetat), nu `-`")
    except ValueError as exc:  # noqa: BLE001
        check(False, f"docker-compose.yml: DATABASE_URL nu se poate interpola: {exc}")

# Odată ce DATABASE_URL e suprascris pe rolul non-superuser, parola superuserului
# nu mai are ce căuta în containerul backend (`docker inspect backend` o afișează
# în clar). DB_USER/DB_PASSWORD rămân exclusiv ale serviciului `db`.
for var in ("DB_USER", "DB_PASSWORD"):
    check(var not in backend_env,
          f"docker-compose.yml: `backend` primește `{var}` ca variabilă separată — "
          f"credențialele superuserului nu trebuie să ajungă în containerul aplicației; "
          f"backendul trebuie să aibă DOAR DATABASE_URL")

# Healthcheck-ul bazei se autentifică cu utilizatorul serviciului `db`, nu cu al
# aplicației: dacă cineva „mută" rolul aplicației în DB_USER, initdb îl ignoră pe
# un volum existent și DSN-ul implicit devine greșit.
db_health = services.get("db", {}).get("healthcheck", {}).get("test", [])
check(any("DB_USER" in str(t) for t in db_health),
      "docker-compose.yml: healthcheck-ul lui `db` nu mai folosește ${DB_USER} — "
      "trebuie să rămână utilizatorul serviciului db, nu rolul aplicației")

# ---------------------------------------------------------------------------
# Raport
# ---------------------------------------------------------------------------
for w in warnings:
    print(f"WARN  {w}")
for e in errors:
    print(f"FAIL  {e}")

if errors:
    print(f"\n{len(errors)} problemă(e) din {checks} verificări.")
    sys.exit(1)

print(f"OK    {checks} verificări trecute"
      + (f", {len(warnings)} avertisment(e)" if warnings else "")
      + ".")
