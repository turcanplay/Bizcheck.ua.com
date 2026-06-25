# Architecture — System & Network

Covers the runtime topology of `webdev/`: which services exist, how traffic flows,
and the trust boundary. For build/deploy details see [`../deployment.md`](../deployment.md).

## Services (docker-compose)

| Service | Image / build | Exposure | Role |
|---|---|---|---|
| `db` | `postgres:16-alpine` | internal network only | PostgreSQL 16. Volume `pgdata`. Healthcheck `pg_isready`. |
| `backend` | `./backend` (Flask + Gunicorn) | **`expose: 4001` only** (no `ports:`) | The API. Reachable only by nginx and the bot, never from the host/internet. |
| `frontend` | `./Dockerfile.frontend` (build SPA → nginx) | the single public entry | Serves the built React SPA **and** reverse-proxies the API. |
| `tgbot` | `./tgbot` (`python-telegram-bot`) | internal network only | Long-poll Telegram bot for the web flow. Calls `backend:4001`. |

> The backend is **NOT** published to the host. Only `expose:` is used. nginx is the
> single proxy in front. Do not add `ports:` to backend on any compose file.

## Request flow

```
Browser ──HTTPS──> nginx (frontend container)
                     ├── /                       → static SPA (index.html fallback for React Router)
                     ├── /static/*, /pdf/*        → static assets
                     └── /api_crowe_bizcheck/*     → proxy → backend:4001 (Flask)
                                                          → PostgreSQL (db:5432)

Telegram user ──> Telegram ──long poll──> tgbot ──HTTP──> backend:4001 /api_crowe_bizcheck/tg/*
Backend ──SMTP──> Office 365 (report emails)
Backend ──HTTPS──> Telegram Bot API (sales-team notification, separate bot)
```

- nginx routes by path: SPA for everything except `/api_crowe_bizcheck/*` (proxied to Flask)
  and static asset paths. Unknown paths fall back to `index.html` so React Router (incl. the
  admin SPA at `/admin_bizcheck_md_crowe/`) handles them.
- The Flask app trusts **exactly one** proxy hop: `ProxyFix(x_for=1)`
  (`backend/server.py:55`). nginx **overwrites** `X-Forwarded-For` with `$remote_addr`
  (does not append), so a spoofed XFF header cannot influence rate-limit keys.

## Trust boundary

- Public internet reaches **only** nginx.
- nginx → backend is the one trusted hop. If another proxy is ever added in front of
  nginx (Cloudflare, etc.), both `ProxyFix(x_for=...)` and the nginx XFF rule must be
  reconfigured together.
- Strict CSP for the SPA lives in **nginx** (`location /`). Flask sets headers only for
  `/api_crowe_bizcheck/*`. New external script/font/API domains go in the nginx CSP, not Flask.

## Backend app composition

`backend/server.py` is the Flask entry point. It:
1. Configures `ProxyFix`, CORS (`CORS_ORIGIN`, credentials on), Flask-Limiter (rate limits),
   an optional `ALLOWED_HOSTS` allowlist, and security headers.
2. Registers all blueprints (see [`../backend/01-routes.md`](../backend/01-routes.md)).
3. Validates required env vars, then calls `migrate()` on import, registers `close()` at exit.

Full breakdown: [`../backend/00-backend-overview.md`](../backend/00-backend-overview.md).

## Frontend composition

React 19 SPA built by Vite. One bundle serves three surfaces by route:
- Marketing/landing site (`/`)
- Quiz + report flow (`/test/:slug`)
- Admin panel (`/admin_bizcheck_md_crowe/*`)

Heavy bundles (quiz, admin, checkout, PDF libs) are lazy-loaded.
Full breakdown: [`../frontend/00-frontend-overview.md`](../frontend/00-frontend-overview.md).
