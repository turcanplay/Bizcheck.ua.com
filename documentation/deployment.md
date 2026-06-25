# Deployment & Infrastructure

Everything to build, run, and configure `webdev/`. Runtime topology:
[`architecture/01-system-architecture.md`](architecture/01-system-architecture.md).

## Docker Compose (`webdev/docker-compose.yml`)

| Service | Build/Image | Exposure | Depends on | Notes |
|---|---|---|---|---|
| `db` | `postgres:16-alpine` | internal only | — | Volume `pgdata`; healthcheck `pg_isready`. |
| `backend` | `./backend` | **`expose: 4001`** (no `ports:`) | `db` (healthy) | Never published to host. nginx + tgbot reach it. |
| `frontend` | `./Dockerfile.frontend` | the public entry | `backend` | Built SPA + nginx reverse proxy. |
| `tgbot` | `./tgbot` | internal only | `backend` | Long-poll Telegram bot. |

> Do not add `ports:` to `backend` on any compose file. Do not change the repo-root bot compose's
> Postgres binding from `127.0.0.1` to `0.0.0.0`.

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
- **`tgbot/Dockerfile`**: `python:3.12-slim`; `CMD python bot.py`.

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
| Web-flow bot | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `BACKEND_URL` | `tgbot/` service. |
| Sales alerts | `SALES_BOT_TOKEN`, `SALES_CHAT_ID` | Sales-team Telegram notify (optional). |
| Frontend | `VITE_API_URL` (build-time), `SITEMAP_BASE_URL`, `SITEMAP_API_URL` (build scripts) | SPA API base + sitemap. |

Key generation: Fernet — `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`.

## Backend scripts (`backend/scripts/`) — out of request path

- **`seed.py`** — populate blocks/questions/answers from a JSON file (skips if DB already seeded).
- **`seed_tests.py`** — **DESTRUCTIVE**: truncates quiz tables, loads `scripts/seeds/*.sql`
  (business, gdpr, hr) for the multi-test schema.
- **`e2e_check.py`** — 9 in-container smoke tests (health, tests list, quiz slug handling, submission,
  PII encryption). `python scripts/e2e_check.py`.
- **`send_test_email.py`** — send a real test report email (same template as prod);
  `python -m scripts.send_test_email --to you@x.com [--lang ro|ru] [--score 78]`.
- **`smtp_simple_test.py`** — raw SMTP connectivity check, independent of Flask.

## Frontend build scripts

- `scripts/generate-sitemap.mjs` (prebuild) → `public/sitemap.xml` from live `/tests` + `/templates`.
- `scripts/generate-static-html.mjs` (postbuild) → per-route static `index.html` with meta for crawlers.
