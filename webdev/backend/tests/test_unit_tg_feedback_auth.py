"""
Unit tests — the bot-secret gate on the feedback endpoints (routes/tg_feedback.py).

/tg/feedback/reply matches an outreach on chat_id alone, so anyone who can call
it with a guessed chat_id can forge or steal a person's feedback reply; /open
binds a chat to an outreach. The shared-secret gate is the only thing standing
in front of both, and it is fail-closed: an unset BOT_SHARED_SECRET DISABLES the
endpoints instead of opening them. These tests pin that boundary only — the
feedback business logic is covered elsewhere.

No running backend and no database: the blueprint is mounted on a bare Flask app
and the TgOutreach model is replaced by an in-memory stub.

Run with:
    cd webdev/backend
    venv/bin/python -m pytest tests/test_unit_tg_feedback_auth.py -v
"""
import os
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(_HERE))

import pytest
from flask import Flask

SECRET = "unit-test-bot-secret"


class _FakeOutreach:
    """Stand-in for models.tg_outreach.TgOutreach.

    Every method records the call and returns 'nothing found', so a request that
    gets past the gate lands on a harmless 404/{"matched": false} instead of the
    DB. `calls` lets a test assert the model was never reached at all.
    """

    def __init__(self):
        self.calls = []

    def _record(self, name):
        self.calls.append(name)

    def find_by_token(self, token):
        self._record("find_by_token")
        return None

    def find_awaiting_reply_by_chat(self, chat_id):
        self._record("find_awaiting_reply_by_chat")
        return None

    def list_answered(self):
        self._record("list_answered")
        return []

    def contacts(self):
        self._record("contacts")
        return []


def _make_client(monkeypatch, secret):
    """Bare app + the feedback blueprints, with the model stubbed out.

    `secret` is the server-side BOT_SHARED_SECRET; None means unconfigured.
    """
    import routes.tg_feedback as mod

    fake = _FakeOutreach()
    monkeypatch.setattr(mod, "TgOutreach", fake)
    if secret is None:
        monkeypatch.delenv("BOT_SHARED_SECRET", raising=False)
    else:
        monkeypatch.setenv("BOT_SHARED_SECRET", secret)

    app = Flask(__name__)
    app.register_blueprint(mod.tg_feedback_bp)
    app.register_blueprint(mod.admin_feedback_bp)
    return app.test_client(), fake


@pytest.fixture
def client(monkeypatch):
    """Server has a secret configured — the normal deployed state."""
    c, _ = _make_client(monkeypatch, SECRET)
    return c


BASE = "/api_crowe_bizcheck/tg/feedback"
ADMIN = "/api_crowe_bizcheck/admin"
AUTH = {"X-Bot-Secret": SECRET}

# Payloads valid enough to reach the handler body, so a 403 can only come from
# the gate and never from validation.
OPEN_BODY = {"token": "deadbeef", "chat_id": 123456}
REPLY_BODY = {"chat_id": 123456, "text": "it was useful"}

BOT_ROUTES = (("/open", OPEN_BODY), ("/reply", REPLY_BODY))


# ---------------------------------------------------------------------------
# A. Fail-closed: no server secret → endpoints disabled
# ---------------------------------------------------------------------------

class TestUnconfiguredServerFailsClosed:

    def test_unset_server_secret_disables_both_endpoints(self, monkeypatch):
        """Regression test for the fail-open hole: _bot_authorized() used to
        return True when BOT_SHARED_SECRET was unset, so an unauthenticated
        caller could drive /open and /reply with a guessed chat_id."""
        c, fake = _make_client(monkeypatch, None)
        for path, body in BOT_ROUTES:
            resp = c.post(f"{BASE}{path}", json=body)
            assert resp.status_code == 403, f"{path} is open with no server secret"
        assert fake.calls == [], "gate let the request reach the model"

    def test_empty_header_does_not_match_unset_server_secret(self, monkeypatch):
        """Guards against a naive `== ""` match: an empty X-Bot-Secret must not
        satisfy an empty/unset server secret."""
        c, fake = _make_client(monkeypatch, None)
        for path, body in BOT_ROUTES:
            for headers in ({"X-Bot-Secret": ""}, {"X-Bot-Secret": "   "}):
                resp = c.post(f"{BASE}{path}", json=body, headers=headers)
                assert resp.status_code == 403, f"{path} accepted {headers!r}"
        assert fake.calls == []

    def test_whitespace_only_server_secret_also_disables(self, monkeypatch):
        """A secret of '   ' is not a secret — it strips to empty, so the
        feature must stay off rather than accept '   ' as the password."""
        c, _ = _make_client(monkeypatch, "   ")
        for path, body in BOT_ROUTES:
            for headers in ({}, {"X-Bot-Secret": "   "}, {"X-Bot-Secret": ""}):
                assert c.post(f"{BASE}{path}", json=body,
                              headers=headers).status_code == 403


# ---------------------------------------------------------------------------
# B. Configured server: only the exact secret gets through
# ---------------------------------------------------------------------------

class TestConfiguredServerGate:

    def test_missing_header_is_forbidden(self, client):
        for path, body in BOT_ROUTES:
            assert client.post(f"{BASE}{path}", json=body).status_code == 403

    def test_wrong_secret_is_forbidden(self, client):
        for path, body in BOT_ROUTES:
            resp = client.post(f"{BASE}{path}", json=body,
                               headers={"X-Bot-Secret": "nope"})
            assert resp.status_code == 403, f"{path} accepted a wrong secret"

    def test_near_miss_secrets_are_forbidden(self, client):
        """No prefix/case/whitespace slack in the comparison."""
        for bad in (SECRET[:-1], SECRET + "x", SECRET.upper(), f" {SECRET} "):
            resp = client.post(f"{BASE}/reply", json=REPLY_BODY,
                               headers={"X-Bot-Secret": bad})
            assert resp.status_code == 403, f"accepted {bad!r}"

    def test_correct_secret_is_not_forbidden(self, client):
        """The gate opens. Downstream status is the handler's business (404 for
        an unknown token, 200 {"matched": false} for an unmatched chat) — all we
        assert is that authorization no longer blocks."""
        for path, body in BOT_ROUTES:
            resp = client.post(f"{BASE}{path}", json=body, headers=AUTH)
            assert resp.status_code != 403, f"{path} rejected the correct secret"

    def test_correct_secret_reaches_the_model(self, monkeypatch):
        """Proves the 'not 403' above is a real pass-through, not an early exit."""
        c, fake = _make_client(monkeypatch, SECRET)
        c.post(f"{BASE}/open", json=OPEN_BODY, headers=AUTH)
        c.post(f"{BASE}/reply", json=REPLY_BODY, headers=AUTH)
        assert fake.calls == ["find_by_token", "find_awaiting_reply_by_chat"]


# ---------------------------------------------------------------------------
# C. The gate is on every bot route, ahead of payload validation
# ---------------------------------------------------------------------------

class TestGateOrdering:

    def test_gate_runs_before_payload_validation(self, client):
        """An unauthorized caller must not learn anything from the validator —
        a garbage body still gets 403, not 400."""
        for path in ("/open", "/reply"):
            resp = client.post(f"{BASE}{path}", json={"chat_id": "not-an-int"})
            assert resp.status_code == 403, f"{path} leaked a validation error"

    def test_gate_applies_with_no_body_at_all(self, client):
        for path in ("/open", "/reply"):
            assert client.post(f"{BASE}{path}").status_code == 403


# ---------------------------------------------------------------------------
# D. Admin feedback routes are on a different gate and stay unaffected
# ---------------------------------------------------------------------------

class TestAdminRoutesUnaffected:

    def test_admin_routes_still_require_admin_auth(self, client):
        """@admin_required rejects with 401 (no admin_session cookie), and a bot
        secret is irrelevant to them."""
        assert client.get(f"{ADMIN}/feedback").status_code == 401
        assert client.get(f"{ADMIN}/feedback/contacts").status_code == 401
        assert client.get(f"{ADMIN}/feedback/prompt").status_code == 401

    def test_bot_secret_does_not_unlock_admin_routes(self, client):
        """The two gates are separate: a valid X-Bot-Secret is not admin auth."""
        assert client.get(f"{ADMIN}/feedback", headers=AUTH).status_code == 401
        assert client.get(f"{ADMIN}/feedback/prompt", headers=AUTH).status_code == 401

    def test_admin_routes_unchanged_when_bot_secret_is_unset(self, monkeypatch):
        """The fail-closed change must not spill onto the admin blueprint."""
        c, _ = _make_client(monkeypatch, None)
        assert c.get(f"{ADMIN}/feedback").status_code == 401
