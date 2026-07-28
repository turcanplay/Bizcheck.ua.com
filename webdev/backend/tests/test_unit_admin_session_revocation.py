"""Admin-session revocation (audit INFO-3) — no database, no live backend.

Covers the four properties the feature has to have:
  1. a deny-listed token is refused everywhere an admin token is accepted;
  2. logout actually deny-lists (it used to only delete the browser cookie);
  3. the global kill switch invalidates every session at once;
  4. the purge that keeps the deny-list bounded never drops a still-valid row.

The store is the in-memory double installed for the whole suite by
tests/conftest.py (`admin_session_store` fixture). The SQL of the real
Postgres store is asserted separately at the bottom of this file — the
invariants that make it safe live in the statements themselves.
"""
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import jwt  # noqa: E402
import pytest  # noqa: E402
from flask import Flask, jsonify  # noqa: E402


SECRET = os.environ["JWT_SECRET"]
CSRF = "csrf-token-value"


def _token(jti="jti-1", iat=None, exp=None, role="admin"):
    """Mint an admin JWT shaped exactly like generate_admin_token()."""
    now = datetime.now(timezone.utc)
    payload = {
        "role": role,
        "iat": int((iat or now).timestamp()),
        "exp": int((exp or now + timedelta(hours=8)).timestamp()),
    }
    if jti is not None:
        payload["jti"] = jti
    return jwt.encode(payload, SECRET, algorithm="HS256")


def _decoded(token):
    return jwt.decode(token, SECRET, algorithms=["HS256"])


# ---------------------------------------------------------------------------
# A. Middleware refuses a revoked token
# ---------------------------------------------------------------------------

@pytest.fixture
def app():
    """Admin-gated GET/POST plus the real /admin blueprint (login/logout)."""
    from middleware import admin_middleware
    from routes.admin import admin_bp

    application = Flask(__name__)
    application.register_blueprint(admin_bp)

    @application.get("/protected")
    @admin_middleware.admin_required
    def protected_get():
        return jsonify({"ok": True})

    @application.post("/protected")
    @admin_middleware.admin_required
    def protected_post():
        return jsonify({"ok": True})

    return application


@pytest.fixture
def client(app):
    return app.test_client()


def _authenticate(client, token):
    client.set_cookie(key="admin_session", value=token, domain="localhost")
    client.set_cookie(key="admin_csrf", value=CSRF, domain="localhost")


class TestRevokedTokenIsRejected:

    def test_fresh_token_is_accepted(self, client):
        _authenticate(client, _token())
        assert client.get("/protected").status_code == 200

    def test_revoked_jti_is_rejected(self, client, admin_session_store):
        token = _token(jti="stolen")
        _authenticate(client, token)
        assert client.get("/protected").status_code == 200

        admin_session_store.revoke("stolen", datetime.now(timezone.utc) + timedelta(hours=8))

        r = client.get("/protected")
        assert r.status_code == 401
        assert "revoked" in r.get_json()["error"].lower()

    def test_revoked_token_also_rejected_on_unsafe_methods(self, client, admin_session_store):
        _authenticate(client, _token(jti="stolen"))
        admin_session_store.revoke("stolen", datetime.now(timezone.utc) + timedelta(hours=8))
        r = client.post("/protected", headers={"X-CSRF-Token": CSRF})
        assert r.status_code == 401

    def test_revoking_one_jti_does_not_affect_another(self, client, admin_session_store):
        admin_session_store.revoke("other", datetime.now(timezone.utc) + timedelta(hours=8))
        _authenticate(client, _token(jti="mine"))
        assert client.get("/protected").status_code == 200

    def test_revoked_token_rejected_on_submission_owner_path(self, client, app, admin_session_store, monkeypatch):
        """The admin bypass inside @submission_owner_or_admin must honour it too."""
        from middleware import admin_middleware

        monkeypatch.setattr(
            "models.submission.Submission.find_id_by_token",
            staticmethod(lambda sub_id, token: None),
        )

        @app.patch("/sub/<int:sub_id>")
        @admin_middleware.submission_owner_or_admin
        def patch_sub(sub_id):
            return jsonify({"ok": True})

        _authenticate(client, _token(jti="stolen"))
        assert client.patch("/sub/1").status_code == 200

        admin_session_store.revoke("stolen", datetime.now(timezone.utc) + timedelta(hours=8))
        # No admin bypass left → falls through to the submission-token gate → 401.
        assert client.patch("/sub/1").status_code == 401


# ---------------------------------------------------------------------------
# B. Logout invalidates
# ---------------------------------------------------------------------------

class TestLogoutInvalidates:

    def test_logout_denylists_the_jti(self, client, admin_session_store):
        _authenticate(client, _token(jti="session-a"))
        assert client.get("/protected").status_code == 200

        r = client.post("/api_crowe_bizcheck/admin/logout")
        assert r.status_code == 200
        assert "session-a" in admin_session_store.revoked

    def test_token_replayed_after_logout_is_rejected(self, client, admin_session_store):
        """The real attack: the cookie was copied before logout."""
        token = _token(jti="session-b")
        _authenticate(client, token)
        client.post("/api_crowe_bizcheck/admin/logout")

        # Attacker re-plants the very same cookie the browser just dropped.
        _authenticate(client, token)
        assert client.get("/protected").status_code == 401

    def test_logout_clears_both_cookies(self, client):
        _authenticate(client, _token(jti="session-c"))
        r = client.post("/api_crowe_bizcheck/admin/logout")
        cookies = "".join(r.headers.getlist("Set-Cookie"))
        assert "admin_session=;" in cookies
        assert "admin_csrf=;" in cookies

    def test_logout_without_a_cookie_is_a_noop_200(self, client, admin_session_store):
        assert client.post("/api_crowe_bizcheck/admin/logout").status_code == 200
        assert admin_session_store.revoked == {}

    def test_logout_is_idempotent(self, client, admin_session_store):
        _authenticate(client, _token(jti="session-d"))
        assert client.post("/api_crowe_bizcheck/admin/logout").status_code == 200
        _authenticate(client, _token(jti="session-d"))
        assert client.post("/api_crowe_bizcheck/admin/logout").status_code == 200
        assert list(admin_session_store.revoked) == ["session-d"]

    def test_logout_survives_a_store_outage(self, client, monkeypatch):
        """A dead database must not leave the operator unable to log out."""
        from services import admin_session_service

        class Broken:
            def state(self, jti):
                raise RuntimeError("db down")

            def revoke(self, jti, expires_at):
                raise RuntimeError("db down")

        monkeypatch.setattr(admin_session_service, "_store", Broken())
        _authenticate(client, _token(jti="session-e"))
        assert client.post("/api_crowe_bizcheck/admin/logout").status_code == 200

    def test_login_issues_a_unique_jti_and_iat(self):
        from services.auth_service import generate_admin_token

        a = _decoded(generate_admin_token())
        b = _decoded(generate_admin_token())
        assert a["jti"] and b["jti"] and a["jti"] != b["jti"]
        assert len(a["jti"]) <= 64          # fits admin_revoked_tokens.jti
        assert a["iat"] and a["exp"] > a["iat"]


# ---------------------------------------------------------------------------
# C. Global kill switch
# ---------------------------------------------------------------------------

class TestRevokeAll:

    def test_kills_every_existing_session(self, client, admin_session_store):
        _authenticate(client, _token(jti="one", iat=datetime.now(timezone.utc) - timedelta(minutes=5)))
        assert client.get("/protected").status_code == 200

        admin_session_store.revoke_all()

        assert client.get("/protected").status_code == 401
        # A completely different session dies too, without ever being seen.
        _authenticate(client, _token(jti="two", iat=datetime.now(timezone.utc) - timedelta(hours=1)))
        assert client.get("/protected").status_code == 401

    def test_a_token_issued_after_the_switch_still_works(self, client, admin_session_store):
        """The switch is a floor, not a permanent lockout: logging back in works.

        (The epoch is backdated rather than the token post-dated — PyJWT 2.10
        rejects a token whose `iat` lies in the future.)
        """
        admin_session_store.revoke_all()
        admin_session_store.not_before -= timedelta(hours=1)
        _authenticate(client, _token(jti="fresh"))
        assert client.get("/protected").status_code == 200

    def test_relogin_in_the_same_second_is_not_locked_out(self, client, admin_session_store):
        """Regression: sub-second `not_before` vs integer `iat` would 401 a
        login performed in the same second as the revocation."""
        epoch = admin_session_store.revoke_all()
        assert epoch.microsecond == 0
        _authenticate(client, _token(jti="same-second", iat=epoch))
        assert client.get("/protected").status_code == 200

    def test_legacy_token_without_iat_is_killed(self, client, admin_session_store):
        legacy = jwt.encode({"role": "admin", "jti": "legacy"}, SECRET, algorithm="HS256")
        _authenticate(client, legacy)
        assert client.get("/protected").status_code == 200

        admin_session_store.revoke_all()
        assert client.get("/protected").status_code == 401

    def test_kill_switch_never_moves_backwards(self, admin_session_store):
        first = admin_session_store.revoke_all()
        admin_session_store.not_before = first  # simulate a replayed older write
        second = admin_session_store.revoke_all()
        assert second >= first

    def test_endpoint_requires_admin_and_csrf(self, client):
        url = "/api_crowe_bizcheck/admin/sessions/revoke-all"
        assert client.post(url).status_code == 401

        _authenticate(client, _token(jti="admin-1"))
        assert client.post(url).status_code == 403          # no CSRF header
        assert client.post(url, headers={"X-CSRF-Token": CSRF}).status_code == 200

    def test_endpoint_logs_the_caller_out(self, client, admin_session_store):
        _authenticate(client, _token(jti="admin-1", iat=datetime.now(timezone.utc) - timedelta(minutes=1)))
        r = client.post(
            "/api_crowe_bizcheck/admin/sessions/revoke-all",
            headers={"X-CSRF-Token": CSRF},
        )
        assert r.status_code == 200
        assert admin_session_store.not_before is not None
        assert "admin_session=;" in "".join(r.headers.getlist("Set-Cookie"))


# ---------------------------------------------------------------------------
# D. The deny-list stays bounded — and the purge is not over-eager
# ---------------------------------------------------------------------------

class TestPurge:

    def test_purge_keeps_tokens_that_are_still_valid(self, client, admin_session_store):
        now = datetime.now(timezone.utc)
        admin_session_store.revoke("still-valid", now + timedelta(hours=8))
        admin_session_store.revoke("also-valid", now + timedelta(seconds=30))

        assert admin_session_store.purge_expired() == 0
        assert set(admin_session_store.revoked) == {"still-valid", "also-valid"}

        # …and they are still refused after the sweep.
        _authenticate(client, _token(jti="still-valid"))
        assert client.get("/protected").status_code == 401

    def test_purge_drops_rows_whose_token_already_expired(self, admin_session_store):
        now = datetime.now(timezone.utc)
        admin_session_store.revoked["expired"] = now - timedelta(seconds=1)
        admin_session_store.revoked["fresh"] = now + timedelta(hours=8)

        assert admin_session_store.purge_expired() == 1
        assert set(admin_session_store.revoked) == {"fresh"}

    def test_revoking_sweeps_automatically(self, admin_session_store):
        """Revocation is the only INSERT, so sweeping there bounds the table."""
        now = datetime.now(timezone.utc)
        admin_session_store.revoked["expired"] = now - timedelta(hours=1)
        admin_session_store.revoke("new", now + timedelta(hours=8))
        assert set(admin_session_store.revoked) == {"new"}

    def test_an_expired_token_is_rejected_even_once_purged(self, client, admin_session_store):
        """Why purging is safe: expiry alone already refuses the token."""
        expired = _token(
            jti="gone",
            iat=datetime.now(timezone.utc) - timedelta(hours=9),
            exp=datetime.now(timezone.utc) - timedelta(hours=1),
        )
        assert admin_session_store.revoked == {}
        _authenticate(client, expired)
        assert client.get("/protected").status_code == 401


# ---------------------------------------------------------------------------
# E. The real Postgres store — invariants asserted on the SQL itself
# ---------------------------------------------------------------------------

class TestPostgresStoreSql:

    def test_purge_is_bounded_to_already_expired_rows(self):
        from models.admin_session import PURGE_SQL

        sql = " ".join(PURGE_SQL.split())
        assert sql == "DELETE FROM admin_revoked_tokens WHERE expires_at <= NOW()"

    def test_revoke_is_idempotent(self):
        from models.admin_session import REVOKE_SQL

        assert "ON CONFLICT (jti) DO NOTHING" in " ".join(REVOKE_SQL.split())

    def test_kill_switch_is_monotonic_and_second_aligned(self):
        from models.admin_session import REVOKE_ALL_SQL

        sql = " ".join(REVOKE_ALL_SQL.split())
        assert "date_trunc('second', NOW())" in sql
        assert "GREATEST(admin_session_epoch.not_before, EXCLUDED.not_before)" in sql

    def test_state_reads_both_axes_in_one_round_trip(self):
        from models.admin_session import STATE_SQL

        sql = " ".join(STATE_SQL.split())
        assert sql.count("SELECT") == 3      # outer + EXISTS + epoch subquery
        assert "admin_revoked_tokens" in sql and "admin_session_epoch" in sql

    def test_migration_creates_both_tables_idempotently(self):
        import inspect
        from database import db

        src = inspect.getsource(db.migrate)
        assert "CREATE TABLE IF NOT EXISTS admin_revoked_tokens" in src
        assert "CREATE TABLE IF NOT EXISTS admin_session_epoch" in src
        assert "CREATE INDEX IF NOT EXISTS idx_admin_revoked_expires" in src


# ---------------------------------------------------------------------------
# F. Fail-closed policy
# ---------------------------------------------------------------------------

class TestFailsClosed:

    def test_store_error_denies_the_request(self, client, monkeypatch):
        from services import admin_session_service

        class Broken:
            def state(self, jti):
                raise RuntimeError("db down")

        monkeypatch.setattr(admin_session_service, "_store", Broken())
        _authenticate(client, _token(jti="ok"))
        assert client.get("/protected").status_code == 401

    def test_empty_payload_is_treated_as_revoked(self):
        from services.admin_session_service import is_revoked

        assert is_revoked(None) is True
        assert is_revoked({}) is True
