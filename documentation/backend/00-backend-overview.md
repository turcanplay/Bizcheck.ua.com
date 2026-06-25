# Backend — Overview

Flask API for `webdev/`. Entry point: `backend/server.py`. Layered architecture:

```
routes/      HTTP endpoints (Flask blueprints) — parse request, enforce auth, call services
services/    business logic, external integrations (SMTP, Telegram, PDF/Excel)
models/      thin data-access classes over raw SQL (psycopg2), PII encrypt/decrypt
database/    connection pool + migrate()
middleware/  auth decorators (@admin_required, @submission_owner_or_admin, @auth_required)
utils/       crypto (Fernet PII) + validators (sanitization)
scripts/     seeding, smoke tests, email testing (not run in normal request path)
tests/       pytest (unit security + integration security)
```

No ORM — models issue parameterized SQL via `database/db.py` helpers.

## `server.py` — what it wires up (in order)

1. **Logging** to stdout at INFO (visible in `docker compose logs`).
2. **`load_dotenv()`**, then `Flask(__name__, static_folder=None)`. `MAX_CONTENT_LENGTH` = 25 MB.
3. **`ProxyFix(x_for=1, x_proto=1, x_host=1)`** — trusts exactly one nginx hop (`server.py:55`).
4. **CORS** — origins from `CORS_ORIGIN` (comma-separated), `supports_credentials=True`.
5. **Flask-Limiter** — `_real_client_ip()` key, default 200/min, per-blueprint overrides
   (see [`../architecture/02-auth-and-security.md`](../architecture/02-auth-and-security.md)).
6. **`ALLOWED_HOSTS`** allowlist via `@before_request` (opt-in; `/api/health` always allowed).
7. **Security headers** via `@after_request` (`set_security_headers`) — see security doc.
8. **Register blueprints** (`server.py:150-164`):
   `auth, blocks, questions, results, admin, submissions, tg, tests (+admin), templates (+admin),
   content (+admin), site_settings (+admin)`.
9. **Health check** `GET /api/health` → `{status: ok, version}`.
10. **Error handlers** for 404 / 413 / 429 / 500 (all JSON).
11. **Startup**: validate required env (`JWT_SECRET`, `JWT_REFRESH_SECRET`; in production also
    `PII_ENCRYPTION_KEY`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`) → `sys.exit(1)` if missing. Warn if
    `PII_ENCRYPTION_KEY` unset in dev.
12. **`migrate()`** on import; `atexit.register(close)` for graceful pool shutdown.
13. `__main__` dev server on `PORT` (def 4001); production runs under Gunicorn (see deployment).

## Endpoint surface (where to look)

- All endpoints, methods, auth, and request fields: [`01-routes.md`](01-routes.md)
- Business logic behind them: [`02-services.md`](02-services.md)
- Data access: [`03-models.md`](03-models.md)
- Auth decorators + crypto + validators + DB pool: [`04-middleware-utils.md`](04-middleware-utils.md)

## Conventions

- Bilingual `_ro`/`_ru` columns throughout.
- API base prefix `/api_crowe_bizcheck/` (obscured, intentional).
- Write-path free text → `clean_text`/`clean_optional`; slugs → `clean_slug`.
- PII read/written only through `models/submission.py` (auto encrypt/decrypt).
- Responses are JSON except binary endpoints (PDF/XLSX/ZIP).
