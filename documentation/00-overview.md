# 00 — Project Overview

## What BizCheck is

BizCheck is a public web app (live at **https://bizcheck.md**) that lets a business
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

## Two codebases in this repo (only one is live)

| Location | What it is | Status |
|---|---|---|
| `webdev/` | The live product: Flask API + React/Vite SPA + nginx + a Telegram bot service. | **Active — document this.** |
| Repo root (`Dockerfile`, `docker-compose.yml`, `schema.sql`, `requirements.txt`, `README.md`, `GHID_COMPLET_APLICATIE.md`) | Config/docs for an older **standalone aiogram Telegram bot** (aiogram + SQLAlchemy on Postgres). | **Legacy. Its `src/` code is NOT present in this repo.** The root `docker-compose.yml` points at a `src/` working dir that does not exist. |

> When anyone says "submission", "admin panel", "the report", "DA/NU questions",
> "bot logic" in the context of the live site, they mean **`webdev/`**.
> The two codebases do not share code.

The rest of this documentation is about `webdev/` unless explicitly stated.

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
| Telegram | `python-telegram-bot` 21.x (web-flow bot in `webdev/tgbot/`) |
| Proxy | nginx (single hop in front of backend) |
| Infra | Docker Compose |

## Repo layout (top level)

```
webdev/
  backend/        Flask API (routes, services, models, middleware, utils, database, scripts, tests)
  frontend/       React + Vite SPA (src/, public/, build scripts)
  tgbot/          Telegram bot service for the web flow
  nginx.conf      Single reverse proxy in front of everything
  docker-compose.yml
  Dockerfile.frontend
  .env.example
documentation/    ← you are here
CLAUDE.md         Operational rules / invariants (read before editing webdev/)
```

## The most important invariants (full detail in the security doc)

- Admin auth is **cookie + CSRF only**. Bearer-header admin auth is dead — do not re-add it.
- Every user free-text field on a write path must go through `clean_text` / `clean_optional`.
- PII columns (`first_name`, `last_name`, `email`, `phone`) are **Fernet-encrypted**; always read via the model layer.
- The backend port is **never exposed publicly** — nginx is the only public entry.
- `migrate()` runs idempotently on every boot; add columns via `ADD COLUMN IF NOT EXISTS`, never drop.

See [`architecture/02-auth-and-security.md`](architecture/02-auth-and-security.md) and the
repo-root `CLAUDE.md` for the binding versions of these rules.
