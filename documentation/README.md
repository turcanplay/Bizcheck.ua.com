# BizCheck — Documentation Index

This folder is the single source of truth for how the BizCheck platform is built.
It is split into small, self-contained files. **Read only the file you need** —
each one is scoped to a single subsystem so you never load context you won't use.

## How to navigate

| If you need to know about… | Read |
|---|---|
| What the project is, the two codebases, the tech stack, repo layout | [`00-overview.md`](00-overview.md) |
| Services, containers, network topology, request flow | [`architecture/01-system-architecture.md`](architecture/01-system-architecture.md) |
| Auth (admin cookie+CSRF, submission token), sanitization, PII encryption, CSP, rate limits | [`architecture/02-auth-and-security.md`](architecture/02-auth-and-security.md) |
| Database tables, columns, relationships, migrations | [`architecture/03-data-model.md`](architecture/03-data-model.md) |
| Flask app entry point, app factory, blueprint registration, startup | [`backend/00-backend-overview.md`](backend/00-backend-overview.md) |
| Every API endpoint (URL, method, auth, fields) | [`backend/01-routes.md`](backend/01-routes.md) |
| Business-logic services (email, PDF/Excel, Telegram notify, CRUD) | [`backend/02-services.md`](backend/02-services.md) |
| Model classes and their DB methods | [`backend/03-models.md`](backend/03-models.md) |
| Auth decorators, crypto, validators, DB pool/migrations | [`backend/04-middleware-utils.md`](backend/04-middleware-utils.md) |
| React app structure, routing, providers, build/config | [`frontend/00-frontend-overview.md`](frontend/00-frontend-overview.md) |
| Public + admin page components | [`frontend/01-pages.md`](frontend/01-pages.md) |
| Quiz / report / layout / UI components | [`frontend/02-components.md`](frontend/02-components.md) |
| React contexts (state) and the API client layer | [`frontend/03-state-and-api.md`](frontend/03-state-and-api.md) |
| Scoring, PDF generation, cookies, i18n, TS types, block content | [`frontend/04-utils-and-data.md`](frontend/04-utils-and-data.md) |
| Crowe brand design system — palette tokens, amber buttons, typography | [`frontend/05-design-system.md`](frontend/05-design-system.md) |
| The web-flow Telegram bot service | [`telegram-bot.md`](telegram-bot.md) |
| Docker, nginx, Dockerfiles, env vars, scripts, build tooling | [`deployment.md`](deployment.md) |

## Conventions used in these docs

- **Bilingual fields** carry `_ro` (Romanian) / `_ru` (Russian) suffixes everywhere
  (tests, blocks, questions, answers, templates, testimonials, FAQ).
- **Obscured paths** are intentional, do not "normalize" them:
  - API base: `/api_crowe_bizcheck/`
  - Admin SPA: `/admin_bizcheck_md_crowe/`
- File references use `path:line` form so they are clickable in editors.
- `webdev/` is the live product. The repo-root bot files are legacy (see overview).
