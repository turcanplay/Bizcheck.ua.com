---
name: bizcheck-auth-security
description: Work on authentication, authorization, CSRF, PII encryption, sanitization, rate limits, CSP, or security headers in webdev. Use when touching middleware decorators, admin/submission auth, the crypto/validators utils, or anything security-sensitive.
---

# BizCheck — Auth & Security

**Read first:** `documentation/architecture/02-auth-and-security.md` and the repo-root `CLAUDE.md`
(the binding rules). `documentation/backend/04-middleware-utils.md` has the decorator/crypto/validator detail.

## The two auth paths (NOT interchangeable)
- **Admin** = httpOnly `admin_session` JWT cookie **+** double-submit CSRF (`X-CSRF-Token` header ==
  `admin_csrf` cookie) on unsafe methods. Enforced by `@admin_required`. **Bearer admin auth is dead —
  never re-add it.** No session token in `localStorage`.
- **Public submission writer** = opaque `submission_token` (issued once at `POST /submissions`),
  sent as `X-Submission-Token`. Missing → 401; wrong token / unknown id → 403 (same status, no enumeration).
- `@submission_owner_or_admin` accepts either. `@auth_required` (Bearer) is **legacy** user auth only.

## Hard rules
- Sanitize every write-path free-text field: `clean_text`/`clean_optional` (bleach strip + control-char
  removal + length cap); slugs via `clean_slug`. The client guard (`inputGuard.ts`) is UX only — the
  server must re-validate.
- PII (`first_name`,`last_name`,`email`,`phone`) is Fernet-encrypted at rest; read/write only via
  `models/submission.py`. `PII_ENCRYPTION_KEY` is required in production (hard boot fail).
- Rate limits live in `server.py` (`limiter.limit(...)`). Add one when adding a write blueprint.
- CSP for the **SPA** is in `webdev/nginx.conf`; Flask sets headers for `/api_crowe_bizcheck/*` only.
  New external script/font/API domain → update the **nginx** CSP (and Flask CSP only if the API path needs it).
- Trust exactly one proxy hop: `ProxyFix(x_for=1)` + nginx overwriting `X-Forwarded-For`. Don't change one without the other.

## Recipe — add a protected endpoint / new rule
1. Choose the decorator by audience (admin vs submission-owner vs public).
2. Sanitize inputs; for state-changing admin routes confirm CSRF is enforced (it is, inside `@admin_required`).
3. Add a rate limit in `server.py` if it's a new write surface.
4. Cover it in `webdev/backend/tests/test_unit_security.py`.

## Don'ts
- Don't add Bearer/`Authorization`-header auth for admin.
- Don't store user text unsanitized or PII unencrypted.
- Don't widen CSP/CORS or expose the backend port to "make something work."
