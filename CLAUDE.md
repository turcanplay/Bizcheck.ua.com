# CLAUDE.md

## Two parallel codebases in this repo

- `src/` + root `docker-compose.yml` + `schema.sql` — the standalone Telegram bot (aiogram, SQLAlchemy on Postgres). README.md and GHID_COMPLET_APLICATIE.md are about THIS one.
- `webdev/` — the public web app (Flask backend + React+Vite SPA + nginx + a separate Telegram bot service in `webdev/tgbot/`). This is what users hit at https://bizcheck.md.

These do not share code. When the user says "submission" / "admin panel" / "the report" they mean `webdev/`. When they say "bot logic" / "DA/NU questions" they mean `src/`.

## Auth model (webdev)

There are two auth paths and they are NOT interchangeable:

- **Admin** — httpOnly cookie `admin_session` (JWT) + non-httpOnly cookie `admin_csrf`. Server validates the JWT from the cookie, and for unsafe methods also requires `X-CSRF-Token` header == `admin_csrf` cookie (double-submit). Bearer-header auth is dead — do not add it back. Frontend uses `adminFetch()` / `adminApi.*` from `webdev/frontend/src/api/admin.ts`; both inject the CSRF header automatically. `localStorage` must NOT hold any session token.
- **Public submission writer** — opaque `submission_token` returned once at `POST /api_crowe_bizcheck/submissions`. Subsequent `PATCH`, `POST /pdf`, `POST /send-email`, `POST /tg/link/{id}` require it as `X-Submission-Token`. Without it: 401. Wrong token / unknown id: 403 (same status — no enumeration).

`@submission_owner_or_admin` accepts EITHER auth. `@admin_required` only the cookie+CSRF pair.

## Sanitization is mandatory

Every user-supplied free-text field on a write path must go through `utils/validators.clean_text` or `clean_optional` (bleach strip + control-char removal + length cap). Slugs use `clean_slug` (regex). Do not store raw user strings — even though React escapes on render, downstream consumers (PDF, Excel exports, Telegram messages) are not all safe.

PII columns on `submissions` (first_name, last_name, email, phone) are Fernet-encrypted at rest. Always read via the model layer; raw SQL bypasses `decrypt_row`.

## DB migrations

`migrate()` runs at every backend boot from `database/db.py`. Pattern is idempotent — `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE ADD COLUMN IF NOT EXISTS`. To add a column: append an ALTER inside the `migrate()` block; do not create a new migrations folder. Do not drop columns this way (drops are not idempotent across replicas). `pg_advisory_xact_lock(1)` serializes concurrent boots.

## Network shape

Backend (`backend:4001`) is NOT exposed publicly — only `expose:` in `webdev/docker-compose.yml`. nginx is the single proxy in front. The Flask app trusts exactly one hop: `ProxyFix(x_for=1)`. nginx OVERWRITES `X-Forwarded-For` with `$remote_addr` (does not append) so spoofed XFF cannot influence rate-limit keys. If you ever add another proxy in front of nginx (Cloudflare, etc.), you must reconfigure both.

The bot-standalone compose at the repo root binds Postgres on `127.0.0.1:5433/5434` — do not change this to `0.0.0.0`.

## CSP / security headers

Strict CSP for the SPA lives in `webdev/nginx.conf` (`location /`), not in Flask. Flask only sets headers for `/api_crowe_bizcheck/*`. If you add a new external domain (script, font, API), update the nginx CSP, not Flask.

## Tests

- `webdev/backend/tests/test_unit_security.py` — runs without a backend or DB (Flask test client + monkeypatched model). Use this for any new auth/middleware/validator logic.
- `webdev/backend/tests/test_security.py` — integration; needs a live backend on `:4001`. Fixtures expect `ADMIN_USERNAME=admin / ADMIN_PASSWORD=admin` defaults.

Run unit only:
```
cd webdev/backend
venv/Scripts/python -m pytest tests/test_unit_security.py -v
```

## Obscured paths (do not "fix")

- Admin SPA: `/admin_bizcheck_md_crowe/`
- API: `/api_crowe_bizcheck/`

These are intentional. `robots.txt` does NOT list them anymore (security through not-advertising).

## Report layout types

`tests.report_type` ∈ {`bizcheck` (per-block detail), `standard` (per-question checklist), `premium` (short)}. The frontend chooses the React component tree based on this column. There is a backfill in `migrate()` that re-marks legacy rows as `bizcheck` only when no `bizcheck` row exists yet — already idempotent, leave it.

## Two Telegram surfaces

- `webdev/tgbot/` — bot service for the web flow. Calls backend via `BACKEND_URL/api_crowe_bizcheck/tg/*`. `/tg/link/{sub_id}` is owner-gated; `/tg/report/<token>` and `/tg/contact/<token>` are token-gated (32-byte URL-safe, 24h TTL).
- `src/` — the original standalone bot, separate DB.

## Don'ts

- Don't `docker compose up` after edits — user deploys to server and tests there.
- Don't add a Bearer-token fallback for admin auth.
- Don't write user text to DB without `clean_text`.
- Don't expose the backend port externally on any compose file.
