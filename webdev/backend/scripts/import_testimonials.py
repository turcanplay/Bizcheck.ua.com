#!/usr/bin/env python3
"""Import testimonials from a JSON file through the ADMIN HTTP API — never SQL.

    docker compose exec -T backend python scripts/import_testimonials.py \
        --json /tmp/testimonials.json [--dry-run]

Same reasoning as scripts/import_test_content.py (whose AdminSession this
reuses): going over HTTP applies `clean_text` / `clean_float` exactly as the
admin panel does, and keeps the cookie + CSRF auth model. Must run inside the
backend container — the backend is `expose:`-only.

Idempotent by name: a testimonial whose name already exists is skipped, so a
second run creates nothing. Nothing is ever updated or deleted.

The JSON shape is {"testimonials": [{name, role, rating, order_index, lang,
quote_uk, quote_en}, ...]} — see content/testimonials_bizcheck_md.json.
"""

from __future__ import annotations

import argparse
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from scripts.import_test_content import (  # noqa: E402
    API, DEFAULT_BASE_URL, AdminSession, ImportAbort,
)

# server.py: admin_content_bp POST/PUT/DELETE is limited to 10/min. 6.5 s apart
# keeps a run comfortably under it.
DELAY = 6.5

FIELDS = ("name", "role", "rating", "order_index", "lang", "quote_uk", "quote_en")


def load(path):
    with open(path, encoding="utf-8") as fh:
        data = json.load(fh)
    items = data.get("testimonials")
    if not isinstance(items, list) or not items:
        raise ImportAbort(f"{path}: expected a non-empty \"testimonials\" list")
    for i, t in enumerate(items, 1):
        if not str(t.get("name", "")).strip():
            raise ImportAbort(f"testimonial #{i}: name is required")
        if not (t.get("quote_uk") and t.get("quote_en")):
            raise ImportAbort(f"testimonial #{i} ({t['name']}): quote_uk and quote_en are required")
    return [{k: t.get(k) for k in FIELDS} for t in items]


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--json", required=True)
    ap.add_argument("--base-url", default=os.environ.get("BASE_URL", DEFAULT_BASE_URL))
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    try:
        items = load(args.json)
        if args.dry_run:
            for t in items:
                print(f"  would create: {t['name']} ({t['rating']}★)")
            return 0

        s = AdminSession(args.base_url, delay=DELAY)
        s.login(os.environ.get("ADMIN_USERNAME", "admin"), os.environ.get("ADMIN_PASSWORD", ""))
        existing = s.expect("GET", f"{API}/admin/testimonials", None,
                            "listing testimonials").body.get("testimonials") or []
        names = {t["name"].strip().lower() for t in existing}

        created = 0
        for t in items:
            if t["name"].strip().lower() in names:
                print(f"  skip (exists): {t['name']}")
                continue
            s.expect("POST", f"{API}/admin/testimonials", {**t, "is_active": True},
                     f"creating {t['name']}")
            created += 1
            print(f"  created: {t['name']} ({t['rating']}★)")
        print(f"done — {created} created, {len(items) - created} skipped")
        return 0
    except ImportAbort as e:
        print(f"ABORT: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
