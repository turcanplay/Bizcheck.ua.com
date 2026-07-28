# 00 — Project Overview

## What BizCheck is

BizCheck is a public web app (live at **https://bizcheck.ua.com**) that lets a business
owner take a **diagnostic quiz** about their company, get an **automatic scored
report** (per-block risk zones), and receive it as a **PDF** by email or via Telegram.
It is operated by Crowe Turcan Mikhailenko. An admin panel manages tests, questions,
templates, testimonials, FAQ, submissions and contacts.

User journey:
1. Visitor lands on the marketing site → picks a test.
2. Fills a short company profile (sector, size, age, revenue).
3. Answers the quiz (blocks → questions → options, with branching).
4. Gets a scored report; chooses delivery by **email** or **Telegram**.
5. A PDF is generated client-side, uploaded, and delivered. Sales is notified.

## Languages

The app is bilingual **Ukrainian (`uk`, default) + English (`en`)**. The language
switcher shows **UA / EN**. Romanian and Russian were removed in two migrations
(`_ro`→`_uk`, then `_ru`→`_en`) — see
[`ukrainian-language-migration.md`](ukrainian-language-migration.md).

Public routes are language-prefixed: `/:lang/`, `/:lang/test/:slug`,
`/:lang/templates/:slug`, `/:lang/checkout/:kind/:slug`, `/:lang/privacy`. The
pre-migration paths (`/test/:slug`, `/sablon/:slug`, `/confidentialitate`,
`/termeni`, `/plata/:kind/:slug`) are 301-redirected in `webdev/nginx.conf`, with a
client-side fallback in the SPA router. `/` is left to the SPA, which redirects to
`/uk/` (or the previously chosen language).

The admin panel is **not** language-prefixed.

## One codebase in this repo

Everything that runs is under **`webdev/`**: Flask API + React/Vite SPA + nginx +
two Telegram bot services. There is no second application.

The repo used to also carry a standalone aiogram Telegram bot in `src/`, with its
own root `Dockerfile`, `docker-compose.yml`, `requirements.txt` and `pytest.ini`.
All of that has been **deleted**. Only its historical schema survives, parked at
[`legacy/schema.sql`](legacy/schema.sql) for reference — nothing reads it. If you
find documentation that still describes that bot, it is stale.

The rest of this documentation is about `webdev/`.

## Tech stack (`webdev/`)

| Layer | Tech |
|---|---|
| Backend API | Python 3.12, Flask, Gunicorn (gthread), `psycopg2` raw SQL (no ORM) |
| Database | PostgreSQL 16 |
| Auth | JWT in httpOnly cookie + double-submit CSRF (admin); opaque per-row token (public submissions) |
| PII | Fernet field-level encryption at rest |
| Frontend | React 19, TypeScript, Vite, React Router 7, react-helmet-async |
| PDF (client) | html2canvas-pro + jspdf + pdf-lib |
| Email | SMTP (Office 365, STARTTLS) |
| Telegram | `python-telegram-bot` — client bot `webdev/tgbot/`, team bot `webdev/groupbot/` |
| Proxy | nginx (single hop in front of backend) |
| Infra | Docker Compose |

## Repo layout (top level)

```
webdev/
  backend/        Flask API (routes, services, models, middleware, utils, database, scripts, tests)
  frontend/       React + Vite SPA (src/, public/, build scripts)
  tgbot/          Telegram bot that delivers the report to the client
  groupbot/       Telegram bot for the internal sales group (/register, /excel, /client)
  nginx.conf      Serves the SPA; only reverse proxy in front of the backend
  docker-compose.yml
  Dockerfile.frontend
  deploy.sh       Build + healthchecks + smoke test + auto-rollback
  scripts/        backup-db.sh, check-telegram.sh, export-spool.sh
  .env.example
  SEO_GUIDE.md              Off-page SEO runbook (Ukraine market)
  SECURITY_AUDIT_REPORT.md  Security audit — point-in-time historical record
documentation/    ← you are here
  legacy/         Archive of the removed standalone bot (schema.sql only)
CLAUDE.md         Operational rules / invariants (read before editing webdev/)
```

## No seed data

`migrate()` creates tables and never inserts content. A fresh install starts with an
**empty** database; tests, blocks, questions, answers, templates, testimonials and
FAQ entries are entered by hand through the admin panel. The `.dump` / `.sql` files
at the repo root are untracked local snapshots — nothing in compose or `deploy.sh`
restores them.

## The most important invariants (full detail in the security doc)

- Admin auth is **cookie + CSRF only**. Bearer-header admin auth is dead — do not re-add it.
- Every user free-text field on a write path must go through `clean_text` / `clean_optional`.
- PII columns (`first_name`, `last_name`, `email`, `phone`) are **Fernet-encrypted**; always read via the model layer.
- The backend port is **never exposed publicly** — nginx is the only public entry.
- `migrate()` runs idempotently on every boot; add columns via `ADD COLUMN IF NOT EXISTS`, never drop.

See [`architecture/02-auth-and-security.md`](architecture/02-auth-and-security.md) and the
repo-root `CLAUDE.md` for the binding versions of these rules.
