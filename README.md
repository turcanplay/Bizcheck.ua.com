# BizCheck

Public web app that lets a business owner take a **diagnostic quiz** about their
company, get an **automatically scored report** (per-block risk zones) and receive
it as a **PDF** by email or through Telegram. An admin panel manages tests,
questions, templates, testimonials, FAQ, submissions and contacts.

Live at **https://bizcheck.com.ua**. Operated by Crowe Turcan Mikhailenko.
Interface languages: **Ukrainian (default) + English**.

---

## Where the code is

Everything that runs in production lives under **`webdev/`**:

```
webdev/
  backend/        Flask API — routes, services, models, middleware, utils, database, tests
  frontend/       React 19 + TypeScript + Vite SPA (public site + admin panel)
  tgbot/          Telegram bot that delivers the report to the client
  groupbot/       Telegram bot for the internal sales group (/register, /excel, /client)
  nginx.conf      Serves the SPA and is the only reverse proxy in front of the backend
  docker-compose.yml
  Dockerfile.frontend
  deploy.sh       Build + healthchecks + smoke test + auto-rollback
  .env.example
  SEO_GUIDE.md              Off-page SEO runbook (Ukraine market)
  SECURITY_AUDIT_REPORT.md  Security audit — point-in-time historical record

documentation/    Technical documentation — start at documentation/README.md
CLAUDE.md         Binding operational rules / invariants. Read before editing webdev/.
```

There is no second application in this repo. The old standalone Telegram bot that
used to live in `src/` has been removed together with its root `Dockerfile`,
`docker-compose.yml` and `requirements.txt`; only its historical schema is kept, at
[`documentation/legacy/schema.sql`](documentation/legacy/schema.sql).

## Stack

| Layer | Tech |
|---|---|
| Backend | Python 3.12, Flask, Gunicorn (4 workers × 2 gthread), `psycopg2` raw SQL (no ORM) |
| Database | PostgreSQL 16 |
| Frontend | React 19, TypeScript, Vite, React Router 7, react-helmet-async |
| PDF | Generated client-side (html2canvas-pro + jspdf + pdf-lib), stored on the submission |
| Email | SMTP (Office 365, STARTTLS) |
| Telegram | `python-telegram-bot` — two separate bots, two separate tokens |
| Proxy | nginx — single hop in front of the backend |
| Infra | Docker Compose |

## Documentation

Start at **[`documentation/README.md`](documentation/README.md)**. It is split into
small, single-subject files:

| Topic | File |
|---|---|
| What the project is, layout, invariants | [`documentation/00-overview.md`](documentation/00-overview.md) |
| Containers, network topology, request flow | [`documentation/architecture/01-system-architecture.md`](documentation/architecture/01-system-architecture.md) |
| Auth, CSRF, PII encryption, CSP, rate limits | [`documentation/architecture/02-auth-and-security.md`](documentation/architecture/02-auth-and-security.md) |
| Tables, columns, migrations | [`documentation/architecture/03-data-model.md`](documentation/architecture/03-data-model.md) |
| Backend (routes, services, models, utils) | [`documentation/backend/`](documentation/backend/) |
| Frontend (pages, components, state, design system) | [`documentation/frontend/`](documentation/frontend/) |
| All three Telegram surfaces | [`documentation/telegram/README.md`](documentation/telegram/README.md) |
| Docker, nginx, env vars, scripts | [`documentation/deployment.md`](documentation/deployment.md) |

## URL layout

Public routes are language-prefixed — `/uk/…` (default) and `/en/…`:
`/:lang/`, `/:lang/test/:slug`, `/:lang/templates/:slug`, `/:lang/checkout/:kind/:slug`,
`/:lang/privacy`. The pre-migration paths (`/test/:slug`, `/sablon/:slug`,
`/confidentialitate`, `/termeni`, `/plata/:kind/:slug`) are 301-redirected in
`webdev/nginx.conf`, with a client-side fallback in the SPA router.

Two paths are deliberately obscured and must not be "normalized":
API base `/api_crowe_bizcheck/`, admin SPA `/admin_bizcheck_md_crowe/`.

## Running it

The app is built and deployed with Docker Compose from `webdev/`:

```bash
cd webdev
cp .env.example .env      # then fill in the real secrets
./deploy.sh               # build + healthchecks + smoke test + auto-rollback
```

Only one host port is published, and only on loopback (`127.0.0.1:5173` by
default) — TLS and the public vhost are terminated by an external nginx (see
`webdev/nginx-proxy.conf.example`). The backend and the database are never
published to the host.

Database migrations run automatically at every backend boot (`migrate()` in
`webdev/backend/database/db.py`) — there is no separate migration command and no
migrations folder.

**The database starts empty.** There is no seed: tests, blocks, questions,
answers, templates, testimonials and FAQ entries are entered by hand through the
admin panel.

## Tests

```bash
# Backend — needs no DB and no running server
cd webdev/backend && python -m pytest

# Backend integration probes (need a live backend on :4001) — opt-in
python -m pytest tests/test_security.py

# Frontend (Vitest + Testing Library)
cd webdev/frontend && npm run test:run
```

The Telegram bots have their own suites: `webdev/tgbot/tests/` and
`webdev/groupbot/tests/`.
