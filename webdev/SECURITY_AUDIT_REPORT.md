# Security Audit Report

## 2026-11-12 — Telegram report bot review and fixes

**Initial review scope:** local analysis of the UA client bot, report bridge,
profile management, logging and deployment configuration. That initial phase
used local doubles without production access. The subsequently authorized
production deployment and limited checks are recorded separately below. This
is a scoped review, not a full application penetration test. The older audit
below remains a historical record.

| ID | Severity | Confirmed previous behavior and impact | Applied fix / current code reference |
| --- | --- | --- | --- |
| TG-01 | High | `/tg/report/<token>` disclosed the report with the bearer link alone; `/contact`, `/email` and `/lead` allowed requests without the bot secret while the rollout flag was off. A leaked link could disclose a PDF or alter lead contacts. | Every client-bot route now requires a configured, matching `X-Bot-Secret`, with constant-time comparison and no optional enforcement bypass. Link issuance retains owner/admin authorization. `backend/routes/telegram.py:57`, `:100`, `:146`, `:226`, `:282`. |
| TG-02 | High | The same report link could be opened in multiple Telegram chats; contact/email actions were not tied to the recipient that opened it. | `POST /tg/report/<token>` atomically binds the token to the first private chat; repeat reads and follow-up actions require that same recipient. Contact payload identity must match the trusted `X-Telegram-Chat-ID` header. `backend/routes/telegram.py:67`, `:84`, `:163`, `:296`; idempotent `tg_token_chat_id` migration in `backend/database/db.py`. |
| TG-03 | Medium | NULL token expiry was accepted. Separate SELECT and UPDATE calls during issuance could invalidate a just-returned link under concurrent requests. | SQL requires a non-expired timestamp; issuance uses 32 random bytes and one atomic UPDATE that preserves an existing valid token and its recipient binding. `backend/routes/telegram.py:109`, `:120`, `:166`, `:307`. |
| TG-04 | Medium | The bridge lacked explicit `no-store` responses. nginx redacted query credentials but retained report-token path segments; legacy UUID tokens also escaped generic backend token redaction. | `Cache-Control: no-store` on bridge responses, including links and errors; explicit Telegram token-path redaction in backend logging and both nginx access-log configurations. `backend/routes/telegram.py:46`, `backend/utils/secret_hygiene.py:32`, `nginx.conf`, `nginx-proxy.conf.example`. |

The failure-alert endpoint also authenticates the bot and recipient: tokens
already claimed by another chat do not notify sales, and known/unknown/foreign
tokens retain the same success response. Malformed JSON objects and invalid
private-chat identifiers are rejected. The client bot restricts report handling
to private chats and sends Ukrainian system messages; profile synchronization
reads its name, descriptions, commands and image from tracked source/assets.

**Final validation:** the full backend suite passed **1018 tests** and the client
bot suite passed **173 tests**, including profile restoration, exact avatar,
identity mismatch rejection and authorized report/contact/email/lead flows.
The backend suite includes 51 secret-hygiene cases for both nginx configurations,
legacy/current tokens, `/failed`, and request/Referer redaction. The nginx validator
passed **82 checks** with both maintenance-mask states; deploy configuration passed
**168 checks**. `bash -n deploy.sh` and `git diff --check` passed. Tests use local
clients and database/Telegram doubles; none send emails or Telegram messages.

### Production deployment verified — 2026-11-12

Deployment completed with exit code **0** at **21:22:50 UTC / 23:22:50 EET**.
The target was the Ukrainian installation `/root/BIZCHECK_COM_UA`, Compose project
`bizcheckua`, frontend loopback port `5175`. The verified client bot is
`@Bizcheck_CROWE_bot` (public bot ID `8847966580`); the Moldovan reference bot was
not the deployment target.

The deployed input was the 40-file release described by
`/private/tmp/bizcheck-ua-release-20261112/manifest.json`, based on commit
`57ac44a658123fe73fcfcbdd01e02421fe99f003`. Each archived file matched its manifest
hash before upload. SHA256 of `release-files.tar.gz`:
`6301003d657187bb7e042a10952044759f2f8e727edca9be5c08b06b1e4d4bd0`.
That manifest is a pre-deployment artifact snapshot; this verification entry was
written after deployment and is not part of its original hashes.

Verified in production:

- The `submissions.tg_token_chat_id` column exists. **5/5 bridge checks** passed:
  internal health, missing/wrong secret rejection, valid secret without recipient
  rejection, and schema metadata. A further authenticated request with a random,
  nonexistent token exercised the SQL claim path and returned **404 + no-store**;
  no customer row matched or changed.
- **32 live profile checks** passed for the source-managed Ukrainian profile.
  The guard's full **185-language sweep** completed without profile failures,
  polling conflicts or unhandled errors. All four services were healthy, with
  zero restarts in the observed interval. The downloaded live avatar was visually
  checked against the MD gold-logo reference; Telegram re-encoded it as a 640px
  square image.
- The Ukrainian external proxy configuration passed its configuration test and
  reload. **9/9 public checks** passed: `/`, `/uk/`, `/healthz`,
  `/api_crowe_bizcheck/health` (database up), `/robots.txt`, `/sitemap.xml`, the
  public missing-secret rejection (**403 + no-store**), and token redaction in
  both external-proxy and frontend access logs.

Rollback material is preserved at
`/root/BIZCHECK_COM_UA/webdev/backups/telegram-ua-20261112T211738Z`.
The pre-deploy database dump is
`/root/BIZCHECK_COM_UA/webdev/backups/predeploy-bizzcheck-20261112-211847.sql.gz`.
Its gzip integrity check passed. The local deployment receipt is
`/private/tmp/bizcheck-ua-release-20261112/production-result.json`.
The added nullable column is compatible with the prior images; reverting images
does not itself restore Telegram profile/webhook metadata. No rollback or database
restore was required. No customer report, contact or email was created or modified
for these checks, and no customer message was sent.

### Confirmed inherited risks still open

- **Database privilege scope:** the backend is still connected as the PostgreSQL
  superuser `postgres`, confirmed during deployment. This release did not change
  database roles or privileges. A backend/DSN compromise therefore retains a
  broader database impact; the dedicated-role procedure remains separate work.
- **Frontend dependency audit:** the unchanged lockfile reports **27 findings**
  (**1 critical, 13 high, 12 moderate, 1 low**). Raw output is saved locally in
  `/private/tmp/bizcheck-ua-release-20261112/npm-audit.json`. The critical package
  is runtime `jspdf@4.2.0`: its vulnerable new-window output options are absent
  from the observed application path, which uses `output('arraybuffer')` at
  `frontend/src/utils/pdfGenerator.ts:200`. FreeText annotation calls are also
  absent. This is a reachability assessment, not a claim that the dependency is
  patched. The maintainer's [jsPDF 4.2.1 release](https://github.com/parallax/jsPDF/releases/tag/v4.2.1)
  fixes both issues; apply and validate that patch separately. No npm upgrade or
  `npm audit fix` was performed.
- Of the 13 high package findings, three are runtime packages: DOMPurify 3.3.3
  (an optional jsPDF dependency; no direct sanitization/hooks observed) and React
  Router/DOM 7.14.1 (the high issues examined require Framework/RSC functionality;
  this app uses `BrowserRouter` and a static nginx runtime). Ten are dev/build
  packages, not production Node services. The [React Router RCE advisory](https://github.com/remix-run/react-router/security/advisories/GHSA-49rj-9fvp-4h2h)
  explicitly excludes Declarative Mode. These findings remain tracked rather
  than being presented as a clean dependency audit.

**Deployment and remaining limits:**

- The bot and backend were deployed together: report retrieval uses **POST** with
  `X-Bot-Secret` and `X-Telegram-Chat-ID`. Set the same nonempty
  `BOT_SHARED_SECRET` in both services. The migration adds a nullable binding
  column; an expired token gets a fresh binding when an authorized owner requests
  a new link.
- The production migration and an unmatched-token SQL path were verified; real
  competing claims still require a staging check. Local tests check HTTP
  authorization and the atomic SQL contract; they do not simulate the PostgreSQL
  lock manager. The claim's concurrency protection is
  inferred from the documented re-evaluation of an UPDATE's condition after a
  competing update commits under Read Committed.
  [PostgreSQL 16 transaction isolation](https://www.postgresql.org/docs/16/transaction-iso.html).
- Before its first opening, a report link remains a bearer credential: the first
  private chat to open it claims it. Binding prevents forwarding after that
  opening; it does not prove the original website visitor's Telegram identity.
- Application source and read-only packaged assets govern profile updates made
  by this bot. An owner with BotFather access or a valid bot API token can still
  change Telegram metadata outside the application. Those external privileges
  cannot be made code-only by application code. Periodic reconciliation restores
  source-managed metadata while the service is running; it is not an absolute
  Telegram account lock.
- The live profile and technical guards were verified as recorded above; actual
  customer PDF/email delivery, legitimate customer-token redemption and PDF/quiz
  database content were not tested. The separate admin feedback-question editor
  remains functional content rather than profile metadata.
- nginx redaction covers `access_log`; standard upstream `error_log` entries can
  still include request URIs. Restrict operational access to logs and apply the
  external proxy configuration together with the container configuration.

---

**Date:** 2026-03-12 · **Last update:** 2026-04-14 (multi-test + PII-at-rest)
**Application:** BizCheck — Business Assessment Web Application
**Stack:** React + TypeScript (Vite) / Flask (Python) / PostgreSQL / Docker

> **This is a point-in-time record, not a description of the current system.**
> It documents what was found and fixed in March–April 2026. File paths and line
> numbers are from that snapshot and have since moved; the app has changed a lot
> after it (language migration to UK/EN, `/register` for the sales group,
> fail-closed `X-Bot-Secret` on every `/tg/*` surface, async ZIP export jobs).
> For how the system works **today**, read
> [`../documentation/architecture/02-auth-and-security.md`](../documentation/architecture/02-auth-and-security.md).
>
> This file used to exist twice — identical copies at the repo root and here.
> The root copy was removed; **this is the only one**.
>
> **Secret hygiene:** the leaked Telegram token that CRITICAL-1 was about is no
> longer printed in this file (see the masked value below). It is still present
> in **git history**, so masking it here is not a substitute for revoking it.
> See [IMMEDIATE ACTIONS REQUIRED](#immediate-actions-required).

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
- **ACTION REQUIRED:** Revoke the leaked token — bot id `8724617416`, secret masked
  as `872461****:AAF***************************` — via @BotFather and generate a new
  one. The full value was printed in this file until 2026-07-28; it was masked then,
  but it remains readable in git history, so **only revocation actually retires it**.

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

> Status as of 2026-07-28: **not verified as done.** These were written in March 2026
> and nothing in the repo records that they were carried out. Treat every item below
> as still open until someone confirms otherwise, then annotate it here.

1. **Revoke the leaked Telegram token** (bot id `8724617416`) via @BotFather and issue a
   new one. The full token is no longer in this file, but it is still recoverable from
   git history — masking is not revocation.
2. **Audit git history** for committed secrets: `git log --all --full-history -- "backend/.env" "*.env"`
   and `git log -p --all -S ':AA' -- '*.md' '*.example'`.
3. **Rotate all credentials** before any deployment: admin password, DB password, JWT
   secrets, `PII_ENCRYPTION_KEY`, `BOT_SHARED_SECRET`, SMTP password.
4. **Generate strong JWT secrets**: `openssl rand -hex 32`
5. **Check if the Telegram bot was already abused** — review bot admin logs if available.
6. **If the token is confirmed revoked**, consider purging it from git history
   (`git filter-repo` + force-push + re-clone by everyone) so it stops showing up in
   secret scanners.

---

## Running the Security Test Suite

```bash
cd backend
pip install pytest requests
# Start the app first (docker compose up or local dev)
pytest tests/test_security.py -v
```
