---
name: bizcheck-integration-tests
description: Run or extend the live-server backend tests and the black-box security probe for webdev. Use when you need tests against a RUNNING backend/DB (pytest integration) or the standalone security scanner — as opposed to the no-DB unit tests.
---

# BizCheck — Integration & Security-Probe Tests

For fast no-DB tests use `bizcheck-unit-tests` instead. This skill covers the suites that need a
**running** backend. Reference: `documentation/backend/04-middleware-utils.md`.

## Three artifacts

### 1. `tests/test_security.py` — pytest, needs backend on `:4001`
- Drives the real API over HTTP via a shared `requests.Session` (cookies persist across calls).
- Reflects the live auth model: admin = httpOnly cookie + CSRF; submission writes = `X-Submission-Token`.
- The `admin_session` fixture logs in with `admin/admin` and **skips** the suite if login fails
  (`pytest.skip`), so it expects `ADMIN_USERNAME=admin` / `ADMIN_PASSWORD=admin` in the backend env.
- Run:
  ```
  cd webdev/backend
  venv/Scripts/python -m pytest tests/test_security.py -v
  ```
  Requires the `requests` dev dep in the venv and a backend listening on `http://localhost:4001`.

### 2. `tests/security_test.py` — standalone black-box scanner (NOT pytest)
- Probes a running instance for SQLi, stored XSS, length overflow, auth bypass, rate limiting, path
  traversal, JSON injection, misconfig. Defaults to `http://localhost:5173` (through nginx, which proxies
  `/api_crowe_bizcheck/*` to the backend). **Non-zero exit if any HIGH-severity check fails.**
- Run:
  ```
  python webdev/backend/tests/security_test.py                 # default base :5173 (via nginx)
  python webdev/backend/tests/security_test.py --base http://localhost:4001
  ```

### 3. `scripts/e2e_check.py` — 9-test in-container smoke suite
- Health, tests list, quiz slug handling, submission create, PII encryption. Run inside the backend
  container: `python scripts/e2e_check.py` (see `bizcheck-deployment`).

## When to use which
- Logic/auth/validator change → `bizcheck-unit-tests` (no server, instant feedback).
- "Does the deployed stack actually behave?" → `test_security.py` (full HTTP) or `e2e_check.py` (smoke).
- Pre-release hardening / pentest pass → `security_test.py` scanner.

## Recipe — extend `test_security.py`
1. Reuse the `admin_session` fixture (logged-in session + csrf) for admin calls; send `X-CSRF-Token`
   on writes.
2. For submission flows, `POST /submissions` first and carry the returned `submission_token` in
   `X-Submission-Token`.
3. Hit the real `BASE_URL + API` paths; assert status + JSON. Keep tests order-independent (module-scoped
   fixtures are fine, but don't depend on data another test created).

## Invariants & don'ts
- These need a live backend + DB — don't add them to `test_unit_security.py`.
- Don't bake production secrets/PII into tests; the integration suite assumes the dev `admin/admin` creds.
- The probe (`security_test.py`) is intentionally destructive/noisy — run it against dev/staging, never
  blindly against production.
- Don't `docker compose up` here to "make it pass" — the user runs the stack on the server (see `CLAUDE.md`).
