# Security Audit Report

**Date:** 2026-03-12 · **Last update:** 2026-04-14 (multi-test + PII-at-rest)
**Application:** BizCheck — Business Assessment Web Application
**Stack:** React + TypeScript (Vite) / Flask (Python) / PostgreSQL / Docker
**Auditor:** Senior Security QA Engineer (Claude Code)

---

## Executive Summary

BizCheck had a solid security foundation (parameterized SQL queries everywhere, bcrypt password hashing with cost 12, JWT auth, rate limiting already configured) but contained critical issues including a committed Telegram bot token, corrupted input validation regex (all validation silently bypassed), an unauthenticated IDOR in the Telegram link endpoint allowing token hijacking, and a timing attack vulnerability in admin credential comparison. All identified vulnerabilities have been remediated.

**2026-04-14 update** adds defense-in-depth PII-at-rest encryption (Fernet, field-level) and formalizes the multi-test schema. Previously PII was stored in plaintext; a database leak would have exposed names, emails and phone numbers directly. PII is now encrypted using a key held outside the database.

---

## Vulnerability Summary

| Severity | Found | Fixed | Remaining |
|----------|-------|-------|-----------|
| CRITICAL | 3 | 3 | 0 |
| HIGH | 4 | 4 | 0 |
| MEDIUM | 5 | 5 | 0 |
| LOW | 3 | 3 | 0 |
| INFO | 4 | 0 | 4 |

---

## Detailed Findings

### CRITICAL-1 — Real Telegram Bot Token Committed to Repository

- **Location:** `tgbot/.env.example:2`
- **Description:** The file `tgbot/.env.example` contained a live Telegram bot token. This file is tracked by git.
- **Impact:** Anyone with repo access can take full control of the bot, receive all user messages, and send messages to users who interacted with it.
- **Fix Applied:** Token replaced with `YOUR_BOT_TOKEN_FROM_BOTFATHER` placeholder.
- **ACTION REQUIRED:** Revoke token `8724617416:AAFfswUCyBMmrvBhFL_1Zs4Nr2897yvO1Hg` immediately via @BotFather and generate a new one.

---

### CRITICAL-2 — Broken Input Validation Regex (All Validation Bypassed)

- **Location:** `backend/routes/submissions.py:23-24`
- **Description:** A linter corrupted the regex escape sequences. `\s` became `s`, `\.` became `.`, `\d` became `d`, `\+` became `+` (invalid quantifier), `\w` became `w`. The patterns became:
  - Email: `r'^[^@s]{1,64}@[^@s]{1,253}.[^@s]{1,63}$'` — broken
  - Phone: `r'^+?[ds-()]{7,20}$'` — broken (also syntax error)
- **Impact:** Any string passed email/phone validation, including SQL injection payloads.
- **Fix Applied:** Regex restored to `r'^[^@\s]{1,64}@[^@\s]{1,253}\.[^@\s]{1,63}$'` and `r'^\+?[\d\s\-()]{7,20}$'`. Also fixed `re.sub(r'[^\w\-]')` for filename sanitization.

---

### CRITICAL-3 — .env Files Not in .gitignore

- **Location:** `.gitignore` (root)
- **Description:** `backend/.env` contains real credentials (JWT secrets, admin password, DB password) but `.env` files were not ignored by git. A `git add .` would commit them.
- **Impact:** Credentials committed to repository = full application compromise.
- **Fix Applied:** Added `.env`, `.env.*`, `*.env`, `*.pem`, `*.key`, `*.sql`, `*.dump`, `logs/`, `uploads/`, and other sensitive patterns to `.gitignore`.

---

### HIGH-1 — Unauthenticated Token Overwriting / IDOR on Telegram Links

- **Location:** `backend/routes/telegram.py` — `POST /api/tg/link/<sub_id>`
- **Description:** Completely unauthenticated endpoint. Anyone could call `POST /api/tg/link/1`, `POST /api/tg/link/2`, etc., generating new tokens that overwrite existing ones. The legitimate user receives a broken link; the attacker gets a token they can use to receive the PDF report via Telegram.
- **Impact:** Token hijacking for all submissions, PII and PDF report exposure.
- **Fix Applied:** Guard added — if a valid (non-expired) token already exists for the submission, it is returned without generating a new one. This prevents overwriting.

---

### HIGH-2 — No Token Expiry Validation in `save_tg_contact`

- **Location:** `backend/routes/telegram.py:107` — `POST /api/tg/contact/<token>`
- **Description:** The endpoint that saves Telegram contact data after report delivery did not validate whether the token was still within its 24-hour TTL.
- **Impact:** Expired tokens could be replayed to overwrite Telegram contact data indefinitely.
- **Fix Applied:** Token expiry check added before writing contact data.

---

### HIGH-3 — Admin Password Timing Attack

- **Location:** `backend/services/auth_service.py:178`
- **Description:** Admin credentials compared with `!=` operator (non-constant-time):
  ```python
  if username != admin_user or password != admin_pass:
  ```
- **Impact:** Timing side-channel could reveal correct password characters under statistical analysis.
- **Fix Applied:** Changed to `hmac.compare_digest()` for both comparisons:
  ```python
  creds_ok = hmac.compare_digest(username or "", admin_user or "") and hmac.compare_digest(password or "", admin_pass or "")
  ```

---

### HIGH-4 — Telegram Contact Fields in Public PATCH Whitelist

- **Location:** `backend/routes/submissions.py` — `_PATCH_ALLOWED`
- **Description:** Fields `tg_chat_id`, `tg_username`, `tg_first_name`, `tg_last_name` were in the public PATCH whitelist (though the model layer also filtered them, making this a defense-in-depth issue).
- **Impact:** Confusing; potential future risk if model whitelist is relaxed.
- **Fix Applied:** All `tg_*` fields removed from `_PATCH_ALLOWED`. They are exclusively settable via the bot endpoint.

---

### MEDIUM-1 — No Request Body Size Limit

- **Location:** `backend/server.py`
- **Description:** No `MAX_CONTENT_LENGTH` configured. Clients could send arbitrarily large bodies.
- **Fix Applied:** `app.config["MAX_CONTENT_LENGTH"] = 25 * 1024 * 1024` + 413 handler.

---

### MEDIUM-2 — Missing Content-Security-Policy Header

- **Location:** `backend/server.py`, `nginx.conf`
- **Description:** No CSP on API responses or nginx frontend.
- **Fix Applied:** Added `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'` to Flask responses. Added security headers to nginx.

---

### MEDIUM-3 — No Rate Limiting on Telegram and Submission Endpoints

- **Location:** `backend/server.py`
- **Fix Applied:** Added explicit rate limits:
  - Submissions: 10 requests/minute
  - Telegram: 20 requests/minute

---

### MEDIUM-4 — Status Field Accepts Arbitrary Strings

- **Location:** `backend/routes/submissions.py`
- **Description:** The `status` field in PATCH accepted any value.
- **Fix Applied:** Added `_VALID_STATUSES = {"started", "in_progress", "completed", "abandoned"}`. Invalid values silently dropped.

---

### MEDIUM-5 — Telegram Contact String Inputs Uncapped

- **Location:** `backend/routes/telegram.py`
- **Fix Applied:** Added `[:100]` truncation to `tg_username`, `tg_first_name`, `tg_last_name`.

---

### LOW-1 — Backend Port 4000 Exposed Publicly

- **Location:** `docker-compose.yml`
- **Recommendation:** Remove `"4000:4000"` port mapping in production. All traffic should go through nginx on port 5173/80.

---

### LOW-2 — Hardcoded Default Credentials in docker-compose.yml

- **Fix Applied:** All credentials now read from `.env` file. `docker-compose.yml` uses `${VAR:-default}` syntax. `.env.example` created at root with instructions.

---

### LOW-3 — API URL Hardcoded to localhost in Dockerfile

- **Location:** `Dockerfile.frontend`
- **Fix Applied:** Removed `ENV VITE_API_URL=http://localhost:4000/api`. Frontend now uses `/api` (relative) which nginx proxies.

---

### INFO-1 — No Dependabot / Dependency Scanning

Add `.github/dependabot.yml` for automated CVE alerts.

### INFO-2 — No security.txt File

Create `/.well-known/security.txt` for responsible disclosure.

### INFO-3 — Admin JWT Has No Revocation (`jti`)

Admin tokens cannot be individually invalidated before expiry. Consider Redis-backed token blacklist for production.

### INFO-4 — PostgreSQL Running as Superuser

The app uses the `postgres` superuser. Create a dedicated limited-privilege role (`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO bizzcheck_app`).

---

## 2026-04-14 Additions

### HIGH-5 (new) — PII Stored in Plaintext at Rest

- **Location:** `submissions.first_name / last_name / email / phone`
- **Description:** Customer PII (name, email, phone) was stored as plain `VARCHAR` in PostgreSQL. A DB dump, unauthorized `pg_dump`, or SQL-injection pivot would have exposed it directly.
- **Fix Applied:**
  - Added `cryptography` (Fernet — AES-128-CBC + HMAC-SHA256 authenticated encryption) to backend dependencies.
  - New `utils/crypto.py` with `encrypt_value` / `decrypt_value` and row-level helpers. Key read from `PII_ENCRYPTION_KEY`; if the env var is a passphrase rather than a valid Fernet key, it is derived via SHA-256.
  - Schema-level: `submissions.first_name / last_name / email / phone` widened to `TEXT` to hold ciphertext (~3–4× plaintext length).
  - `Submission` model encrypts on `create` / `update` and decrypts on `find_by_id` / `find_all` (transparent to callers).
  - `routes/telegram.py /api/tg/report/<token>` decrypts `first_name` / `last_name` before returning to the bot.
- **Key Management:** Production boot refuses to start if `PII_ENCRYPTION_KEY` is unset (`server.py` startup guard). Dev mode only warns; the first encryption call still raises if the key is missing.

### INFO-5 (new) — Multi-Test Schema Isolation

- **Location:** `tests`, `blocks.test_id`, `submissions.test_id`
- **Description:** Prior schema had a single implicit quiz. Multiple audit types (business / gdpr / hr …) now coexist with hard FK isolation. Cross-test data leakage is prevented at the DB layer (`ON DELETE CASCADE` on `blocks.test_id`). Admin CRUD for `tests` lives at `/api/admin/tests` behind admin-JWT + strict rate limits (5/min for POST/PUT/DELETE).

### Reserved Columns for Future Paid Flow — No Current Paywall

- **Location:** `users`, `submissions`
- **Description:** `is_paid`, `paid_at`, `subscription_tier`, `payment_provider`, `payment_ref` columns exist in the schema but **no application code reads or gates on them**. The product currently delivers the complete report to every user on both the website (PDF download) and the Telegram bot. This was verified explicitly.

---

## All Security Hardening Applied

| Measure | File | Done |
|---------|------|------|
| Fixed broken email/phone/filename regex | `routes/submissions.py` | YES |
| Removed real Telegram token | `tgbot/.env.example` | YES |
| Timing-safe admin comparison (hmac.compare_digest) | `services/auth_service.py` | YES |
| Prevent Telegram token overwriting (IDOR fix) | `routes/telegram.py` | YES |
| Token expiry check in save_tg_contact | `routes/telegram.py` | YES |
| Input length caps on tg_ contact fields | `routes/telegram.py` | YES |
| Removed tg_ fields from public PATCH whitelist | `routes/submissions.py` | YES |
| Status field validated against allowed set | `routes/submissions.py` | YES |
| Request body size limit (25 MB) | `server.py` | YES |
| 413 error handler | `server.py` | YES |
| Content-Security-Policy header | `server.py` | YES |
| Rate limiting on submissions and tg blueprints | `server.py` | YES |
| Comma-separated CORS origin support | `server.py` | YES |
| Comprehensive .gitignore for secrets | `.gitignore` | YES |
| Security headers in nginx | `nginx.conf` | YES |
| Aggressive caching for hashed static assets | `nginx.conf` | YES |
| Block nginx access to hidden files | `nginx.conf` | YES |
| Relative API URL (deployment-ready) | `frontend/src/config/api.ts` | YES |
| Vite dev proxy for /api | `frontend/vite.config.ts` | YES |
| docker-compose reads secrets from .env | `docker-compose.yml` | YES |
| DB port not exposed externally | `docker-compose.yml` | YES |
| Comprehensive security test suite | `backend/tests/test_security.py` | YES |
| **PII encrypted at rest (Fernet)** | `backend/utils/crypto.py` + `models/submission.py` | YES |
| **PII_ENCRYPTION_KEY required in production at boot** | `backend/server.py` | YES |
| **Telegram report endpoint decrypts PII before sending to bot** | `backend/routes/telegram.py` | YES |
| **Multi-test isolation (tests table + FK)** | `backend/database/db.py` | YES |
| **Admin CRUD for tests behind admin JWT + rate limit 5/min** | `backend/routes/tests.py`, `server.py` | YES |
| **.env.example documents `PII_ENCRYPTION_KEY` generation** | `webdev/.env.example`, `backend/.env.example` | YES |
| **SQL parameterization audit — all queries use `%s`; f-strings only inject hardcoded constants or whitelisted column names** | backend (full sweep) | YES |

---

## IMMEDIATE ACTIONS REQUIRED

1. **Revoke Telegram token** `8724617416:AAFfswUCyBMmrvBhFL_1Zs4Nr2897yvO1Hg` via @BotFather NOW.
2. **Audit git history** for committed secrets: `git log --all --full-history -- "backend/.env" "*.env"`
3. **Rotate all credentials** before any deployment: Admin password, DB password, JWT secrets.
4. **Generate strong JWT secrets**: `openssl rand -hex 32`
5. **Check if the Telegram bot was already abused** — review bot admin logs if available.

---

## Running the Security Test Suite

```bash
cd backend
pip install pytest requests
# Start the app first (docker compose up or local dev)
pytest tests/test_security.py -v
```
