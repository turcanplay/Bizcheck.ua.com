# Architecture — Auth & Security

The binding rules live in repo-root `CLAUDE.md`. This file explains the mechanisms.

## Two auth paths (NOT interchangeable)

### 1. Admin — cookie + CSRF
- On `POST /api_crowe_bizcheck/admin/login`, the server sets:
  - `admin_session` — **httpOnly** cookie containing a JWT (`role: "admin"`, ~8h expiry).
  - `admin_csrf` — **non-httpOnly** cookie with a CSRF token (also returned in the login JSON).
- The server validates the JWT from the `admin_session` cookie. For **unsafe methods**
  (POST/PATCH/PUT/DELETE) it additionally requires header `X-CSRF-Token` == `admin_csrf`
  cookie (double-submit pattern). GET/HEAD/OPTIONS skip the CSRF check.
- Enforced by `@admin_required` (`backend/middleware/admin_middleware.py`).
- **Bearer-header admin auth is dead — do not re-add it.** `localStorage` must hold no session token.
- Frontend: `adminFetch()` / `adminApi.*` (`frontend/src/api/admin.ts`) inject the CSRF header automatically.

### 2. Public submission writer — opaque token
- `POST /api_crowe_bizcheck/submissions` returns a `submission_token` **once** (issued at create).
- Subsequent `PATCH`, `POST /pdf`, `POST /send-email`, `POST /tg/link/{id}` require it as
  header `X-Submission-Token`.
  - Missing token → **401**.
  - Wrong token / unknown id → **403** (same status for both, to prevent id enumeration).
- This blocks IDOR: knowing a `sub_id` is not enough to mutate or read a submission.

### Combined decorator
- `@submission_owner_or_admin` accepts **either** a valid admin session **or** a matching
  submission token. `@admin_required` accepts only the cookie+CSRF pair.

### Legacy user auth (vestigial)
- `routes/auth.py` (register/login/refresh/me) + `middleware/auth_middleware.py` (`@auth_required`,
  Bearer JWT) + `routes/results.py` form an older registered-user system. It is separate from the
  public quiz flow and from admin. Treat it as legacy; the live flows use the two paths above.

## Sanitization (mandatory)

Every user-supplied free-text field on a write path must pass through
`utils/validators.clean_text` or `clean_optional` (HTML strip via bleach + control-char
removal + length cap). Slugs use `clean_slug` (regex `[a-z0-9_-]+`). Never store raw user
strings — React escapes on render, but downstream consumers (PDF, Excel export, Telegram
messages) are not all safe. See [`../backend/04-middleware-utils.md`](../backend/04-middleware-utils.md)
for every validator. The frontend also has a soft client-side guard (`utils/inputGuard.ts`),
but the server re-validates — never rely on the client.

## PII encryption at rest

- Columns `first_name`, `last_name`, `email`, `phone` on `submissions` are **Fernet** ciphertext
  (AES-128-CBC + HMAC-SHA256). Key from `PII_ENCRYPTION_KEY`.
- Encrypt on write / decrypt on read happens in the **model layer**
  (`utils/crypto.encrypt_fields` / `decrypt_row`). Always read via the model — raw SQL bypasses
  decryption.
- In production, a missing `PII_ENCRYPTION_KEY` is a hard boot failure; encryption raises on first use otherwise.

## Rate limiting (Flask-Limiter, keyed on real client IP)

Set in `backend/server.py`. Default **200/min**. Per-blueprint overrides:

| Blueprint | Limit |
|---|---|
| `auth_bp` | 10/min |
| `admin_bp` (POST) | 5/min **and** 40/hour |
| `submissions_bp` | 60/min; POST 15/min |
| `tg_bp` | 20/min |
| `admin_tests_bp` (POST/PUT/DELETE) | 5/min |
| `admin_templates_bp` (POST/PUT/DELETE) | 10/min |
| `admin_content_bp` (POST/PUT/DELETE) | 10/min |
| `admin_site_settings_bp` (PUT) | 10/min |
| `content_bp` (POST testimonials) | 3/min **and** 10/hour |

The key is the real client IP — safe because of `ProxyFix(x_for=1)` + nginx overwriting XFF.

## Security headers

- **Flask** (`/api_crowe_bizcheck/*` only): `X-Content-Type-Options`, `X-XSS-Protection`,
  `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options: DENY`, `Server: BizCheck`,
  a CSP (keeps Meta Pixel/Facebook directives), `Cache-Control: no-store…` on API responses
  (PII never cached), and HSTS in production.
- **nginx** (the SPA): the strict CSP for the app lives here, plus HSTS, `nosniff`,
  `server_tokens off`, etc. Add new external domains here.
- `MAX_CONTENT_LENGTH` = 25 MB (server). Host allowlist via `ALLOWED_HOSTS` (opt-in; the
  `/api/health` probe is always allowed).

## Other hardening

- Obscured, unadvertised paths (`/api_crowe_bizcheck/`, `/admin_bizcheck_md_crowe/`) — not in `robots.txt`.
- Admin login: constant-time credential compare (`hmac.compare_digest`), fails closed if creds unset.
- Telegram deep-link tokens: 32-byte URL-safe, 24h TTL, owner-gated issuance.
