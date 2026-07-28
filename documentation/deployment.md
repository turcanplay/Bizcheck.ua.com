# Deployment & Infrastructure

Everything to build, run, and configure `webdev/`. Runtime topology:
[`architecture/01-system-architecture.md`](architecture/01-system-architecture.md).

## Docker Compose (`webdev/docker-compose.yml`)

| Service | Build/Image | Exposure | Depends on | Notes |
|---|---|---|---|---|
| `db` | `postgres:16-alpine` | internal only | — | Volume `pgdata`; healthcheck `pg_isready`. |
| `backend` | `./backend` | **`expose: 4001`** (no `ports:`) | `db` (healthy) | Never published to host. nginx + both bots reach it. |
| `frontend` | `./Dockerfile.frontend` | **`127.0.0.1:${FRONTEND_PORT:-5173}:80`** | `backend` (started) | Built SPA + nginx. The only host binding in the stack, and it is loopback-only. |
| `tgbot` | `./tgbot` | internal only | `backend` (healthy) | Long-poll client bot. |
| `groupbot` | `./groupbot` | internal only | `backend` (healthy) | Long-poll bot for the internal sales group. |

TLS and the public vhost are terminated by an **external** nginx that is not part of this
compose file — see `webdev/nginx-proxy.conf.example`.

> Do not add `ports:` to `backend` or `db` on any compose file, and keep `frontend` bound to
> `127.0.0.1`.

`frontend` depends on `backend` only with `service_started` (not `service_healthy`) on purpose:
the static SPA must come up even when the API is down.

## `deploy.sh`

`webdev/deploy.sh` is the deploy path on the server. It takes a `pg_dump` backup, tags the
current images `:previous`, rebuilds **`backend frontend tgbot groupbot`**, waits on the
healthchecks, runs a smoke test and rolls back automatically if it fails. An older version of
the script rebuilt only `backend groupbot`, so frontend and nginx changes never reached the
server — any documentation that still says that is stale.

Deploy note (from `CLAUDE.md`): **don't `docker compose up` after edits** — the user deploys to the
server and tests there.

## nginx (`webdev/nginx.conf`) — single public proxy

| Path | Behavior |
|---|---|
| `/api_crowe_bizcheck/*` | proxy → `http://backend:4001/…` (120 s read timeout) |
| `/static/*` (hashed assets) | 1-year cache |
| `/pdf/*` | static, `no-cache` |
| `/` (and unknown) | `try_files $uri $uri/ /index.html` → SPA (incl. admin SPA) |
| dotfiles | denied |

- **XFF**: `proxy_set_header X-Forwarded-For $remote_addr;` — **overwrites** (not appends), so a spoofed
  client XFF can't poison the rate-limit key. Backend reads it via `ProxyFix(x_for=1)`.
- **CSP** for the SPA lives here (`location /`): allows Meta Pixel (`connect.facebook.net`,
  `www.facebook.com`), Yandex Metrica (`mc.yandex.ru`), Telegram, Google Fonts; `frame-ancestors`
  Facebook + self. **Add new external domains here, not in Flask.**
- Headers: HSTS (1y), `nosniff`, `X-XSS-Protection`, `X-Frame-Options: DENY` (assets),
  `Referrer-Policy`, `Permissions-Policy`, `server_tokens off`.

## Dockerfiles

- **`Dockerfile.frontend`** (multi-stage): Node 20-alpine `npm ci` + `npm run build` → `dist/`;
  then `nginx:alpine` serving `dist/` with `nginx.conf`.
- **`backend/Dockerfile`**: `python:3.12-slim`; `pip install -r requirements.txt`; runs Gunicorn
  `server:app` with **4 workers × 2 gthread threads** (8 slots), `--timeout 120`,
  `--graceful-timeout 30`, `--keep-alive 5`, `--max-requests 1000 --max-requests-jitter 100` (worker recycling).
  `backend/Procfile` holds the equivalent process line.
- **`tgbot/Dockerfile`** and **`groupbot/Dockerfile`**: `python:3.12-slim`; `CMD python bot.py`.
  Neither serves HTTP — both long-poll Telegram.

## Environment variables

Primary file: **`webdev/.env.example`** (copy to `.env`). `backend/.env.example` is a local-dev override.

| Group | Vars | Purpose |
|---|---|---|
| JWT | `JWT_SECRET`, `JWT_REFRESH_SECRET` | Token signing. **Required** at boot. |
| PII | `PII_ENCRYPTION_KEY` | Fernet key for submission PII. Required in production (hard boot fail). |
| Admin | `ADMIN_USERNAME`, `ADMIN_PASSWORD` | Admin login creds (required in production). |
| DB | `DATABASE_URL` **or** `DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD`; `DB_POOL_MIN/MAX` | Postgres connection + pool. |
| CORS/host | `CORS_ORIGIN` (comma list), `ALLOWED_HOSTS` (opt-in allowlist) | Origin + Host-header hardening. |
| Runtime | `NODE_ENV` (`production` → HSTS, strict env checks), `PORT` (def 4001) | Mode/port. |
| Email | `SMTP_HOST` (def smtp.office365.com), `SMTP_PORT` (587), `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM_NAME`, `SMTP_REPLY_TO`, `EMAIL_LOGO_URL`, `PUBLIC_BASE_URL` | Report email + download links. |
| Web-flow bot | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `BACKEND_URL` | `tgbot/` service (`TELEGRAM_BOT_USERNAME` is read by the **backend**, to build the deep link). |
| Sales alerts | `SALES_BOT_TOKEN`, `SALES_CHAT_ID`, `SALES_TOPIC_ID` | Sales-team Telegram notify. `SALES_CHAT_ID` is **optional** and *wins over* the group bound via `/register` — leave it empty if you want `/register` to work. `SALES_TOPIC_ID` pins every lead to one forum topic. |
| Bot ↔ backend | `BOT_SHARED_SECRET`, `ADMIN_PANEL_URL`, `FEEDBACK_SCHEDULER` | Shared secret for `/tg/exports/*`, `/tg/group/*`, `/tg/feedback/*`. **Unset = those endpoints are disabled (403)**, not open. |
| Async ZIP export | `EXPORT_SPOOL_DIR`, `EXPORT_SPOOL_HOST_DIR`, `EXPORT_JOB_READY_TTL`, `EXPORT_JOB_DOWNLOADED_TTL`, `EXPORT_JOB_FAILED_TTL`, `EXPORT_JOB_STALE_AFTER` | On-disk spool for the background PDF-ZIP jobs (bind-mounted so all 4 gunicorn workers share it). |
| Frontend | `VITE_API_URL` (build-time), `SITEMAP_BASE_URL`, `SITEMAP_API_URL` (build scripts) | SPA API base + sitemap. |

Key generation: Fernet — `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`.

## Backend scripts (`backend/scripts/`) — out of request path

- **`clear_quiz_content.py`** — **DESTRUCTIVE, manual only**: deletes tests/blocks/questions/answers
  from an existing DB so the quiz can be re-entered by hand in the admin panel. Interactive (type
  `DELETE` to confirm), supports `--dry-run` and `--with-submissions`. Submissions are kept and
  detached (`test_id = NULL`) unless that flag is given. Nothing in the app calls it, and there is
  deliberately NO equivalent inside `migrate()` — that runs on every boot and would wipe live data.
  A fresh install already starts empty: `migrate()` creates tables only and never seeds content.
- **`e2e_check.py`** — 9 in-container smoke tests (health, tests list, quiz slug handling, submission,
  PII encryption). `python scripts/e2e_check.py`.
- **`send_test_email.py`** — send a real test report email (same template as prod);
  `python -m scripts.send_test_email --to you@x.com [--lang uk|en] [--score 78]`.
- **`smtp_simple_test.py`** — raw SMTP connectivity check, independent of Flask.

## Server scripts (`webdev/scripts/`)

- **`backup-db.sh`** — `pg_dump` of the running database.
- **`check-telegram.sh`** — `getMe` / `getChat` probes for the bot tokens and the sales chat.
- **`export-spool.sh`** — inspect / clean the async export spool directory.

## Frontend build scripts

- `scripts/generate-sitemap.mjs` (prebuild) → `public/sitemap.xml` from live `/tests` + `/templates`.
- `scripts/generate-static-html.mjs` (postbuild) → per-route static `index.html` with meta for crawlers.
