---
name: bizcheck-backend-unit-tests
description: Write or run BACKEND (Python/Flask/pytest) unit tests for webdev/backend. Use when adding/changing a validator, middleware decorator, auth path, service, or route and you need fast tests that run with NO database and NO running server (Flask test client + monkeypatch). Covers webdev/backend/tests/test_unit_security.py and new test_unit_*.py files. For frontend tests use bizcheck-frontend-unit-tests; for live-server tests use bizcheck-integration-tests.
---

# BizCheck — Backend Unit Tests (pytest)

The canonical example is `webdev/backend/tests/test_unit_security.py` — read it before writing new
tests; copy its patterns. These tests need **no DB and no running backend**: they use Flask's test
client and `monkeypatch` the service/model layer. Reference: `documentation/backend/04-middleware-utils.md`.

## Run

`pytest.ini` already ignores the two live-server files, so a bare `pytest` **is** the no-DB/no-server sweep.

```
cd webdev/backend
python -m pytest                                       # whole unit sweep
python -m pytest tests/test_unit_security.py -v        # one file
python -m pytest tests/test_unit_security.py -k csrf   # filter by name
python -m pytest tests/test_unit_security.py::TestCleanText -v   # one class
```
`pytest` is a **dev-only** dep in the backend `venv` (not in `requirements.txt`) — use
`venv/bin/python -m pytest` if the venv is not active.

The unit suite is broad: `test_unit_security.py`, `test_unit_admin_session_revocation.py`,
`test_unit_content_sanitization.py`, `test_unit_content_limits.py`, `test_unit_export_jobs.py`,
`test_unit_export_excels_zip.py`, `test_unit_migration.py`, `test_unit_report_language.py`,
`test_unit_sales_flow.py`, `test_unit_tg_group.py`, `test_unit_tg_feedback_auth.py`,
`test_unit_perf_robustness.py`, plus `test_validators.py`, `test_crypto.py`, `test_auth_service.py`,
`test_export_service.py`, `test_email_templates.py`, `test_sales_notify.py`, `test_services_misc.py`.

## Environment: `tests/conftest.py` does it for you

`tests/conftest.py` sets `JWT_SECRET`, `JWT_REFRESH_SECRET`, `PII_ENCRYPTION_KEY`,
`ADMIN_USERNAME`/`ADMIN_PASSWORD` and puts `backend/` on `sys.path` **before** anything under test is
imported, and provides the shared doubles (e.g. the in-memory admin-session revocation store). Don't
re-set those env vars per file. Still import the code under test **inside** the test function/fixture
(not at module top) when the module reads env or opens a pool at import time.

## The four patterns (pick by what you're testing)

1. **Pure function (validators, crypto, token gen)** — import inside the test, call, assert:
   ```python
   def test_strips_script_tag(self):
       from utils.validators import clean_text
       assert "<script>" not in clean_text("<script>x</script>hi")
   ```

2. **Middleware decorator** — build a tiny app fixture with a decorated route, drive the test client.
   Mint JWTs with the test secret; set cookies with `domain="localhost"`:
   ```python
   def _admin_jwt():
       return jwt.encode({"role": "admin"}, os.environ["JWT_SECRET"], algorithm="HS256")

   @pytest.fixture
   def app_with_admin_route():
       from middleware import admin_middleware
       app = Flask(__name__)
       @app.get("/protected")
       @admin_middleware.admin_required
       def _g(): return jsonify({"ok": True})
       return app

   def test_cookie_grants(self, app_with_admin_route):
       c = app_with_admin_route.test_client()
       c.set_cookie(key="admin_session", value=_admin_jwt(), domain="localhost")
       assert c.get("/protected").status_code == 200
   ```
   For **admin writes (POST/PUT/PATCH/DELETE)** set BOTH `admin_session` + `admin_csrf` cookies AND the
   matching `X-CSRF-Token` header — cookie alone → 403.

3. **Route + service/model stubbed** — register the real blueprint on a bare app, monkeypatch its deps:
   ```python
   from routes import submissions as subs_route
   monkeypatch.setattr(subs_route, "create_submission", fake_create)   # service imported INTO the route module
   monkeypatch.setattr("models.submission.Submission.find_id_by_token",
                       staticmethod(lambda sid, tok: sid if store.get(sid)==tok else None))  # model by dotted path
   app = Flask(__name__); app.register_blueprint(subs_route.submissions_bp)
   ```
   Use an in-memory `dict`/`list` as the fake store. Assert both status code and JSON body.

4. **Background side effects (email/Telegram)** — stub `_configured`, the model lookups, and capture
   `threading.Thread` instead of spawning it (see `TestSalesNotify`), so nothing hits SMTP/Telegram/DB.

## Monkeypatch the symbol the code actually resolves
- A service function imported **into** a route module → patch it on the route module
  (`monkeypatch.setattr(subs_route, "create_submission", ...)`).
- A model imported **lazily** inside a decorator/function → patch by dotted path
  (`monkeypatch.setattr("models.submission.Submission.find_id_by_token", staticmethod(...))`).

## What to cover (this suite's bar)
Auth: 401 vs 403 distinctions, expired/wrong-secret/`alg:none` JWT rejection, CSRF double-submit,
no-Bearer-for-admin, submission-token BOLA (token for sub 2 must 403 on sub 1), unknown-id → 403-not-404.
Validators: HTML/control-char stripping, length cap, slug allow-list (reject `../`, `; DROP`, `<script>`),
numeric clamp/snap, lang whitelist (`clean_lang`: `uk`/`en` only, default `uk` — anything else, including
`ro`/`ru`, must fall back). Routes: mass-assignment guard (only allow-listed keys persist),
malformed input → 400-not-500, regression guards (e.g. `POST /submissions` must return `submission_token`).

## Conventions & don'ts
- Files `test_*.py`, classes `Test*`, methods `test_*`. Group with a lettered comment banner like the example.
- Don't require a DB or live server here — if a test needs that, it belongs in `bizcheck-integration-tests`.
- Don't hardcode real secrets/PII; mint tokens with the test secret.
