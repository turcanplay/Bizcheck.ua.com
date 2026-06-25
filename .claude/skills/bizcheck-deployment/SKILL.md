---
name: bizcheck-deployment
description: Work on webdev infrastructure — docker-compose, nginx, Dockerfiles, environment variables, CSP, gunicorn, or build/seed scripts. Use when changing how the app is built, proxied, configured, or deployed.
---

# BizCheck — Deployment & Infrastructure

**Read first:** `documentation/deployment.md` and `documentation/architecture/01-system-architecture.md`.

## Topology
nginx (frontend container) is the single public entry. `backend` is `expose: 4001` only (no `ports:`),
reachable only by nginx + tgbot. `db` (postgres:16) and `tgbot` are internal. Compose: `webdev/docker-compose.yml`.

## Invariants that bite
- **Never publish the backend port.** Don't add `ports:` to `backend` on any compose file.
- nginx **overwrites** `X-Forwarded-For` with `$remote_addr`; backend trusts one hop (`ProxyFix(x_for=1)`).
  Changing one requires changing the other. Adding a proxy in front of nginx (Cloudflare) means reconfiguring both.
- The SPA **CSP lives in `webdev/nginx.conf`** (`location /`). New external script/font/API domain → edit it here.
  Flask only sets headers for `/api_crowe_bizcheck/*`.
- SPA fallback `try_files … /index.html` powers React Router incl. the admin path — keep it.
- Gunicorn: 4 workers × 2 gthread threads, `--timeout 120`, `--max-requests 1000` recycling (`backend/Dockerfile`).
- Required env at boot: `JWT_SECRET`, `JWT_REFRESH_SECRET`; production also `PII_ENCRYPTION_KEY`,
  `ADMIN_USERNAME`, `ADMIN_PASSWORD`. Full env table in `documentation/deployment.md`.
- **Don't `docker compose up` after edits** — the user deploys on the server and tests there.
- Repo-root compose Postgres stays bound to `127.0.0.1` (5433/5434), never `0.0.0.0`.

## Recipe — add a service / external domain / env var
1. New service: add to `webdev/docker-compose.yml` (internal `expose`, not `ports`, unless it's the public proxy).
2. New external domain (script/font/API/iframe): update the CSP in `webdev/nginx.conf`.
3. New env var: add to `webdev/.env.example` (+ `backend/.env.example` if dev needs it), read it in code,
   and document it in `documentation/deployment.md`.

## Scripts
- Smoke test: `backend/scripts/e2e_check.py`. Email: `scripts/send_test_email.py`, `scripts/smtp_simple_test.py`.
- Seed: `scripts/seed.py` (safe), `scripts/seed_tests.py` (**destructive truncate**).
- Frontend build: `generate-sitemap.mjs` (prebuild), `generate-static-html.mjs` (postbuild).

## Don'ts
- Don't expose backend/db ports publicly, weaken CSP/HSTS, or run `docker compose up` as a "test".
