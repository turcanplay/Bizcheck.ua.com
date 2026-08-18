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
| Quiz content import script, branching model, API payload field naming, the sub-question trap | [`quiz-content.md`](quiz-content.md) |
| **Toate cele 3 suprafețe Telegram** (bot user, notificare vânzări, bot grup + `/register`, alertă eșec livrare) — set structurat cu cuprins | [`telegram/README.md`](telegram/README.md) |
| ↳ arhivă istoric (changelog probleme rezolvate + restanțe) | [`telegram-boti-status.md`](telegram-boti-status.md) |
| **Lansarea pe server, pas cu pas** (pregătirea serverului → DNS → TLS → `.env` → masca de pre-lansare → primul deploy → rol Postgres → boți → conținut → lansare + sitemap + Search Console → verificare finală) — runbook, în română, pentru un server gol | [`runbook-lansare.md`](runbook-lansare.md) |
| Docker, nginx, Dockerfiles, env vars, scripts, build tooling | [`deployment.md`](deployment.md) |
| ↳ historical: language migration (RO→UK, then RU→EN) — what changed, the DB rename migrations | [`ukrainian-language-migration.md`](ukrainian-language-migration.md) |
| Off-page SEO runbook (Ukraine market) — the only copy | [`../webdev/SEO_GUIDE.md`](../webdev/SEO_GUIDE.md) |
| ↳ historical: security audit (Mar–Apr 2026), with still-open follow-ups | [`../webdev/SECURITY_AUDIT_REPORT.md`](../webdev/SECURITY_AUDIT_REPORT.md) |
| **Ce e în curs** — jurnal de modificări, registru de bug-uri, restanțe și decizii așteptate de la client. Spațiu de lucru, nu referință | [`mapa-de-lucru/README.md`](mapa-de-lucru/README.md) |

## Conventions used in these docs

- **Bilingual fields** carry `_uk` (Ukrainian) / `_en` (English) suffixes everywhere
  (tests, blocks, questions, answers, templates, testimonials, FAQ). Romanian (`_ro`)
  became Ukrainian, then Russian (`_ru`) became English — see
  [`ukrainian-language-migration.md`](ukrainian-language-migration.md).
- **Obscured paths** are intentional, do not "normalize" them:
  - API base: `/api_crowe_bizcheck/`
  - Admin SPA: `/admin_bizcheck_md_crowe/`
- **Languages**: the app is Ukrainian (`uk`, default) + English (`en`). Public routes are
  language-prefixed (`/uk/…`, `/en/…`); the old unprefixed paths 301-redirect.
- File references use `path:line` form so they are clickable in editors. **Exception:**
  [`runbook-lansare.md`](runbook-lansare.md) deliberately cites `path` + named block
  (e.g. "the `location /` block in `nginx.conf`") and no line numbers — it is followed
  by hand on a server, where a stale line number is worse than no line number.
- `webdev/` is the whole product. The standalone bot that used to live in `src/` is gone;
  only [`legacy/schema.sql`](legacy/schema.sql) remains, as an archive (see overview).
- `webdev/docs/` was a second, older documentation set covering the same Telegram
  subsystem. It has been retired in favour of this folder — see
  [`../webdev/docs/README.md`](../webdev/docs/README.md).
