# CLAUDE.md

## One codebase in this repo

- `webdev/` — the public web app: Flask backend + React+Vite SPA + nginx + two Telegram bot services (`webdev/tgbot/` for clients, `webdev/groupbot/` for the internal sales group). This is what users hit at https://bizcheck.com.ua.

There is no longer a second application. The old standalone aiogram bot in `src/`, and the root `Dockerfile` / `docker-compose.yml` / `requirements.txt` / `pytest.ini` that served it, have been deleted; its schema is archived at `documentation/legacy/schema.sql`. Anything you find that still describes it is stale — fix it rather than following it.

Docs live in `documentation/` (single source of truth, indexed by `documentation/README.md`).

## Languages

The app is bilingual **Ukrainian (`uk`, default) + English (`en`)**. Romanian and Russian were removed in two migrations (`_ro`→`_uk`, `_ru`→`_en`) — see `documentation/ukrainian-language-migration.md`. Bilingual DB columns carry `_uk` / `_en` suffixes. Do not reintroduce `ro` / `ru` anywhere (columns, `hreflang`, validators' language whitelist, bot strings).

Public routes are language-prefixed: `/uk/…` and `/en/…`. The pre-migration paths (`/test/:slug`, `/sablon/:slug`, `/confidentialitate`, `/termeni`, `/plata/:kind/:slug`) are 301-redirected in `webdev/nginx.conf`, with a client-side fallback in the SPA router. Keep both sides in sync when you touch routing.

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

Postgres is not published to the host either. The only host binding in the whole stack is the frontend on `127.0.0.1:${FRONTEND_PORT:-5173}` — keep it on loopback; TLS is terminated by an external nginx (`webdev/nginx-proxy.conf.example`).

## CSP / security headers

Strict CSP for the SPA lives in `webdev/nginx.conf` (`location /`), not in Flask. Flask only sets headers for `/api_crowe_bizcheck/*`. If you add a new external domain (script, font, API), update the nginx CSP, not Flask.

## Tests

- `webdev/backend/pytest.ini` already excludes the two live-server files, so a plain `pytest` is the no-DB/no-server sweep. Put new auth/middleware/validator logic in a `test_unit_*.py` (Flask test client + monkeypatched model).
- `webdev/backend/tests/test_security.py` and `security_test.py` — integration; need a live backend on `:4001`. Opt-in only. Fixtures expect `ADMIN_USERNAME=admin / ADMIN_PASSWORD=admin` defaults.
- Frontend uses Vitest + Testing Library (jsdom), config in `webdev/frontend/vite.config.ts`.
- Both bots have their own suites: `webdev/tgbot/tests/`, `webdev/groupbot/tests/`.

```
cd webdev/backend  && python -m pytest          # unit sweep, no DB, no server
cd webdev/frontend && npm run test:run
```

## Obscured paths (do not "fix")

- Admin SPA: `/admin_bizcheck_md_crowe/`
- API: `/api_crowe_bizcheck/`

These are intentional. `robots.txt` does NOT list them anymore (security through not-advertising).

## Report layout types

`tests.report_type` ∈ {`bizcheck` (per-block detail), `standard` (per-question checklist), `premium` (like `bizcheck` minus the per-block detail pages), `gdpr` (one page per question)}. The canonical set is enforced in `services/test_service.py` (`CANONICAL_REPORT_TYPES`), not by a DB constraint. The frontend chooses the React component tree based on this column. There is a backfill in `migrate()` that re-marks legacy rows as `bizcheck` only when no `bizcheck` row exists yet — already idempotent, leave it.

## Three Telegram surfaces

- `webdev/tgbot/` — client bot for the web flow. Calls backend via `BACKEND_URL/api_crowe_bizcheck/tg/*`. `/tg/link/{sub_id}` is owner-gated; `/tg/report/<token>` and `/tg/contact/<token>` are token-gated (32-byte URL-safe, 24h TTL).
- `webdev/groupbot/` — internal bot living in the sales group: `/register`, `/unregister`, `/excel`, `/client`, `/pdf`. Authorization fails closed — `SALES_CHAT_ID` wins when set, otherwise the chat bound via `/register`; nothing set and nothing registered → deny.
- `services/sales_notify.py` — the backend posting lead notifications into that group (same token as `groupbot`, send-only, so no `getUpdates` conflict).

Every `/tg/exports/*`, `/tg/group/*` and `/tg/feedback/*` endpoint is gated **strictly** on `X-Bot-Secret`: an unset `BOT_SHARED_SECRET` disables the feature (403), it never opens it. Do not "relax for local dev".

## Don'ts

- Don't `docker compose up` after edits — user deploys to server and tests there.
- Don't add a Bearer-token fallback for admin auth.
- Don't write user text to DB without `clean_text`.
- Don't expose the backend or the DB port externally on any compose file.
- Don't add `ro` / `ru` back as application languages.
- Don't seed the database from `migrate()` — a fresh install starts empty on purpose and content is entered in the admin panel.
