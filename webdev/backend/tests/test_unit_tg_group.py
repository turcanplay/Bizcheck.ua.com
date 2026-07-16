"""
Unit tests — the runtime sales-group registration endpoints (routes/tg_group.py).

Whoever can call /register redirects every future lead notification into a chat
of their choosing, so the fail-closed secret gate is the security boundary here;
most of these tests pin exactly that.

No running backend and no database: the blueprint is mounted on a bare Flask app
and the SiteSettings model is replaced by an in-memory dict.

Run with:
    cd webdev/backend
    venv/bin/python -m pytest tests/test_unit_tg_group.py -v
"""
import os
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(_HERE))

import pytest
from flask import Flask

SECRET = "unit-test-bot-secret"


class _FakeSettings:
    """Stand-in for models.site_settings.SiteSettings backed by a plain dict."""

    def __init__(self):
        self.store = {}

    def get(self, key, default=""):
        return self.store.get(key, default)

    def set(self, key, value):
        self.store[key] = value


@pytest.fixture
def settings(monkeypatch):
    import routes.tg_group as mod
    fake = _FakeSettings()
    monkeypatch.setattr(mod, "SiteSettings", fake)
    return fake


@pytest.fixture
def client(settings, monkeypatch):
    monkeypatch.setenv("BOT_SHARED_SECRET", SECRET)
    from routes.tg_group import tg_group_bp

    app = Flask(__name__)
    app.register_blueprint(tg_group_bp)
    return app.test_client()


BASE = "/api_crowe_bizcheck/tg/group"
AUTH = {"X-Bot-Secret": SECRET}


# ---------------------------------------------------------------------------
# A. The secret gate — strict / fail-closed
# ---------------------------------------------------------------------------

class TestSecretGate:

    def test_no_secret_header_is_forbidden(self, client):
        assert client.post(f"{BASE}/register", json={"chat_id": -100123}).status_code == 403

    def test_wrong_secret_is_forbidden(self, client):
        resp = client.post(f"{BASE}/register", json={"chat_id": -100123},
                           headers={"X-Bot-Secret": "nope"})
        assert resp.status_code == 403

    def test_unset_server_secret_disables_the_feature(self, settings, monkeypatch):
        """No BOT_SHARED_SECRET on the server → 403, NOT open. Fail closed."""
        monkeypatch.delenv("BOT_SHARED_SECRET", raising=False)
        from routes.tg_group import tg_group_bp

        app = Flask(__name__)
        app.register_blueprint(tg_group_bp)
        c = app.test_client()

        # Even sending an empty secret (which would "match" a naive == "") is refused.
        for headers in ({}, {"X-Bot-Secret": ""}):
            assert c.post(f"{BASE}/register", json={"chat_id": -100123},
                          headers=headers).status_code == 403

    def test_gate_covers_every_route(self, client):
        assert client.post(f"{BASE}/unregister").status_code == 403
        assert client.get(f"{BASE}/registered").status_code == 403


# ---------------------------------------------------------------------------
# B. register
# ---------------------------------------------------------------------------

class TestRegister:

    def test_stores_chat_id(self, client, settings):
        resp = client.post(f"{BASE}/register",
                           json={"chat_id": -1001234567890, "title": "Sales"},
                           headers=AUTH)
        assert resp.status_code == 200
        assert resp.get_json() == {"ok": True, "chat_id": -1001234567890}
        assert settings.store["sales_chat_id"] == "-1001234567890"
        assert settings.store["sales_chat_title"] == "Sales"

    def test_numeric_string_chat_id_is_coerced(self, client, settings):
        resp = client.post(f"{BASE}/register", json={"chat_id": "-1001234567890"},
                           headers=AUTH)
        assert resp.status_code == 200
        assert settings.store["sales_chat_id"] == "-1001234567890"

    def test_missing_chat_id_is_rejected(self, client, settings):
        resp = client.post(f"{BASE}/register", json={"title": "Sales"}, headers=AUTH)
        assert resp.status_code == 400
        assert "sales_chat_id" not in settings.store

    def test_non_integer_chat_id_is_rejected(self, client, settings):
        for bad in ("abc", "", None, "12.5", {"a": 1}):
            resp = client.post(f"{BASE}/register", json={"chat_id": bad}, headers=AUTH)
            assert resp.status_code == 400, f"accepted {bad!r}"
        assert "sales_chat_id" not in settings.store

    def test_title_is_sanitized(self, client, settings):
        """Group titles are attacker-controlled free text (anyone can name a
        group) and are re-emitted downstream, so HTML must not survive."""
        client.post(f"{BASE}/register",
                    json={"chat_id": -100123,
                          "title": "<script>alert(1)</script>Sales"},
                    headers=AUTH)
        stored = settings.store["sales_chat_title"]
        assert "<script>" not in stored
        assert "Sales" in stored

    def test_registered_by_is_sanitized(self, client, settings):
        client.post(f"{BASE}/register",
                    json={"chat_id": -100123,
                          "registered_by": "<img src=x onerror=alert(1)>@ivan"},
                    headers=AUTH)
        stored = settings.store["sales_chat_registered_by"]
        assert "<img" not in stored
        assert "onerror=" not in stored

    def test_omitted_optional_fields_store_empty_strings(self, client, settings):
        client.post(f"{BASE}/register", json={"chat_id": -100123}, headers=AUTH)
        assert settings.store["sales_chat_title"] == ""
        assert settings.store["sales_chat_registered_by"] == ""

    def test_re_register_overwrites(self, client, settings):
        client.post(f"{BASE}/register", json={"chat_id": -1}, headers=AUTH)
        client.post(f"{BASE}/register", json={"chat_id": -2}, headers=AUTH)
        assert settings.store["sales_chat_id"] == "-2"


# ---------------------------------------------------------------------------
# C. unregister / registered
# ---------------------------------------------------------------------------

class TestUnregisterAndLookup:

    def test_unregister_clears_chat_id(self, client, settings):
        client.post(f"{BASE}/register", json={"chat_id": -100123}, headers=AUTH)
        resp = client.post(f"{BASE}/unregister", headers=AUTH)
        assert resp.status_code == 200
        assert settings.store["sales_chat_id"] == ""

    def test_registered_reports_the_bound_chat(self, client):
        client.post(f"{BASE}/register",
                    json={"chat_id": -100123, "title": "Sales"}, headers=AUTH)
        body = client.get(f"{BASE}/registered", headers=AUTH).get_json()
        assert body == {"chat_id": "-100123", "title": "Sales"}

    def test_registered_is_null_when_nothing_bound(self, client):
        body = client.get(f"{BASE}/registered", headers=AUTH).get_json()
        assert body["chat_id"] is None

    def test_registered_is_null_after_unregister(self, client):
        """The group bot keys off chat_id; a stale title must not read as bound."""
        client.post(f"{BASE}/register",
                    json={"chat_id": -100123, "title": "Sales"}, headers=AUTH)
        client.post(f"{BASE}/unregister", headers=AUTH)
        body = client.get(f"{BASE}/registered", headers=AUTH).get_json()
        assert body["chat_id"] is None


# ---------------------------------------------------------------------------
# D. sales_notify prefers the SALES_CHAT_ID env var; /register is the fallback
# ---------------------------------------------------------------------------

class TestSalesChatIdResolution:

    def test_env_chat_id_wins_over_registration(self, monkeypatch):
        """SALES_CHAT_ID is the operator kill-switch: an operator who pins the
        group in .env outranks anyone who can type /register in Telegram, so a
        bad/hostile registration cannot redirect leads away from it."""
        import services.sales_notify as sn
        import models.site_settings as ss

        monkeypatch.setenv("SALES_CHAT_ID", "-999")
        monkeypatch.setattr(ss.SiteSettings, "get",
                            staticmethod(lambda k, d="": "-100123"))
        assert sn._sales_chat_id() == "-999"

    def test_env_chat_id_short_circuits_the_db_entirely(self, monkeypatch):
        """With the env var set there is nothing to look up — the settings table
        must not even be read (the kill-switch has to work while the DB is sick)."""
        import services.sales_notify as sn
        import models.site_settings as ss

        def boom(k, d=""):
            raise AssertionError("SiteSettings.get must not be consulted when "
                                 "SALES_CHAT_ID is set")

        monkeypatch.setenv("SALES_CHAT_ID", "-999")
        monkeypatch.setattr(ss.SiteSettings, "get", staticmethod(boom))
        assert sn._sales_chat_id() == "-999"

    def test_blank_env_chat_id_falls_through_to_registration(self, monkeypatch):
        """An empty/whitespace SALES_CHAT_ID (the documented default) means
        'unset' — it must fall through to /register, not pin leads to nowhere."""
        import services.sales_notify as sn
        import models.site_settings as ss

        monkeypatch.setenv("SALES_CHAT_ID", "   ")
        monkeypatch.setattr(ss.SiteSettings, "get",
                            staticmethod(lambda k, d="": "-100123"))
        assert sn._sales_chat_id() == "-100123"

    def test_registered_chat_used_when_env_is_unset(self, monkeypatch):
        import services.sales_notify as sn
        import models.site_settings as ss

        monkeypatch.delenv("SALES_CHAT_ID", raising=False)
        monkeypatch.setattr(ss.SiteSettings, "get",
                            staticmethod(lambda k, d="": "-100123"))
        assert sn._sales_chat_id() == "-100123"

    def test_db_raising_with_no_env_yields_no_chat(self, monkeypatch):
        """No env to fall back to in this branch — degrade to "" rather than
        crash the caller (_configured() then reports False and we skip)."""
        import services.sales_notify as sn
        import models.site_settings as ss

        def boom(k, d=""):
            raise RuntimeError("db down")

        monkeypatch.delenv("SALES_CHAT_ID", raising=False)
        monkeypatch.setenv("SALES_BOT_TOKEN", "token")
        monkeypatch.setattr(ss.SiteSettings, "get", staticmethod(boom))
        assert sn._sales_chat_id() == ""
        assert sn._configured() is False

    def test_unconfigured_when_neither_source_has_a_chat(self, monkeypatch):
        import services.sales_notify as sn
        import models.site_settings as ss

        monkeypatch.delenv("SALES_CHAT_ID", raising=False)
        monkeypatch.setenv("SALES_BOT_TOKEN", "token")
        monkeypatch.setattr(ss.SiteSettings, "get", staticmethod(lambda k, d="": ""))
        assert sn._configured() is False

    def test_configured_via_registration_alone(self, monkeypatch):
        """No SALES_CHAT_ID env at all — /register is enough to switch it on."""
        import services.sales_notify as sn
        import models.site_settings as ss

        monkeypatch.delenv("SALES_CHAT_ID", raising=False)
        monkeypatch.setenv("SALES_BOT_TOKEN", "token")
        monkeypatch.setattr(ss.SiteSettings, "get",
                            staticmethod(lambda k, d="": "-100123"))
        assert sn._configured() is True
