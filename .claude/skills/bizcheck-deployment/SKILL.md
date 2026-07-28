---
name: bizcheck-deployment
description: Work on webdev infrastructure — docker-compose, nginx, Dockerfiles, environment variables, CSP, gunicorn, or build/seed scripts. Use when changing how the app is built, proxied, configured, or deployed.
---

# BizCheck — Deployment & Infrastructure

**Read first:** `documentation/deployment.md` and `documentation/architecture/01-system-architecture.md`.

## Topology
Compose: `webdev/docker-compose.yml`, five services — `db` (postgres:16-alpine), `backend`, `frontend`
(nginx), `tgbot` (client bot), `groupbot` (internal sales-group bot).
`backend` is `expose: 4001` only (no `ports:`), reachable only inside the network; `db`, `tgbot` and
`groupbot` are internal too. The **only** host binding is `frontend` on
`127.0.0.1:${FRONTEND_PORT:-5173}:80` — TLS is terminated by an external nginx
(`webdev/nginx-proxy.conf.example`).

## Invariants that bite
- **Never publish the backend port.** Don't add `ports:` to `backend` on any compose file.
- nginx **overwrites** `X-Forwarded-For` with `$remote_addr`; backend trusts one hop (`ProxyFix(x_for=1)`).
  Changing one requires changing the other. Adding a proxy in front of nginx (Cloudflare) means reconfiguring both.
- The SPA **CSP lives in `webdev/nginx.conf`** (`location /`). New external script/font/API domain → edit it here.
  Flask only sets headers for `/api_crowe_bizcheck/*`.
- SPA fallback `try_files … /index.html` powers React Router incl. the admin path — keep it.
- nginx also holds the **301s from the pre-migration paths** to the language-prefixed ones
  (`/test/…`→`/uk/test/…`, `/sablon/…`→`/uk/templates/…`, `/confidentialitate`+`/termeni`→`/uk/privacy`,
  `/plata/…`→`/uk/checkout/…`). The SPA has a client-side fallback for the same set — change both together.
- Gunicorn: 4 workers × 2 gthread threads, `--timeout 120`, `--max-requests 1000` recycling (`backend/Dockerfile`).
- Required env at boot: `JWT_SECRET`, `JWT_REFRESH_SECRET`; production also `PII_ENCRYPTION_KEY`,
  `ADMIN_USERNAME`, `ADMIN_PASSWORD`. Full env table in `documentation/deployment.md`.
- **Don't `docker compose up` after edits** — the user deploys on the server and tests there.
- The PDF-ZIP export job spools to `EXPORT_SPOOL_DIR` (default `<tmp>/bizcheck_exports`) on the container
  filesystem. Fine for the current single-container backend; scaling to more than one container requires
  pointing it at a shared volume in every replica.

## Recipe — add a service / external domain / env var
1. New service: add to `webdev/docker-compose.yml` (internal `expose`, not `ports`, unless it's the public proxy).
2. New external domain (script/font/API/iframe): update the CSP in `webdev/nginx.conf`.
3. New env var: add to `webdev/.env.example` (+ `backend/.env.example` if dev needs it), read it in code,
   and document it in `documentation/deployment.md`.

## Scripts
- Backend (`webdev/backend/scripts/`): `e2e_check.py` (in-container smoke),
  `send_test_email.py`, `smtp_simple_test.py`.
- Host-side (`webdev/scripts/`): `backup-db.sh`, `check-telegram.sh`, `export-spool.sh`. Deploy: `webdev/deploy.sh`.
- No seed script: a fresh DB starts empty and content is entered in the admin panel.
- Wipe content by hand: `backend/scripts/clear_quiz_content.py` (**destructive**, interactive, `--dry-run`).
- Frontend build (`webdev/frontend/scripts/`): `generate-sitemap.mjs` (prebuild),
  `generate-static-html.mjs` (postbuild), plus `lib/routing.mjs` — the Node mirror of `src/i18n/routing.ts`
  that both scripts use to emit the `/uk/…` and `/en/…` URLs. Keep the two in sync.

## Don'ts
- Don't expose backend/db ports publicly, weaken CSP/HSTS, or run `docker compose up` as a "test".
