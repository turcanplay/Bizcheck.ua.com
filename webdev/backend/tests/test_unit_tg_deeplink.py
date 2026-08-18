"""
Unit tests — the Telegram deep-link handle (services/telegram_send.bot_username).

The bug these pin: TELEGRAM_BOT_USERNAME used to fall back to a hardcoded handle
belonging to a DIFFERENT deployment's bot. The token minted here was only ever
given to our own bot, so a link built on that fallback dropped the client into a
bot that could not recognize them — and nothing logged an error. Unset must mean
"deep links are off", loudly, never "use somebody else's bot".

No running backend and no database: the blueprint is mounted on a bare Flask app
and the two db helpers are monkeypatched.

Run with:
    cd webdev/backend
    venv/bin/python -m pytest tests/test_unit_tg_deeplink.py -v
"""
import os
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(_HERE))

import pytest
from flask import Flask

SUB_TOKEN = "TOK-0007-UNIT"
_AUTH = {"X-Submission-Token": SUB_TOKEN}


@pytest.fixture(autouse=True)
def clean_env(monkeypatch):
    monkeypatch.delenv("TELEGRAM_BOT_USERNAME", raising=False)


@pytest.fixture
def client(monkeypatch):
    import routes.telegram as mod

    # Submission 7 exists, has no PDF yet and carries no live token.
    monkeypatch.setattr(mod, "query", lambda *a, **k: {
        "id": 7, "tg_token": None, "tg_token_expires": None, "has_pdf": False,
    })
    monkeypatch.setattr(mod, "execute", lambda *a, **k: {"id": 7})
    # The endpoint is owner-gated. Auth itself is covered in test_unit_security;
    # here we just hand it a submission token it will accept.
    monkeypatch.setattr(
        "models.submission.Submission.find_id_by_token",
        staticmethod(lambda sid, tok: sid if tok == SUB_TOKEN else None),
    )

    app = Flask(__name__)
    app.register_blueprint(mod.tg_bp)
    return app.test_client()


class TestBotUsername:
    def test_unset_yields_empty_not_a_foreign_handle(self):
        from services.telegram_send import bot_username
        assert bot_username() == ""

    def test_leading_at_and_padding_are_stripped(self, monkeypatch):
        from services.telegram_send import bot_username
        monkeypatch.setenv("TELEGRAM_BOT_USERNAME", "  @UA_BizCheck_bot ")
        assert bot_username() == "UA_BizCheck_bot"


class TestDeepLink:
    def test_unset_returns_none(self):
        from services.telegram_send import deep_link
        assert deep_link("tok") is None

    def test_set_builds_the_start_url(self, monkeypatch):
        from services.telegram_send import deep_link
        monkeypatch.setenv("TELEGRAM_BOT_USERNAME", "UA_BizCheck_bot")
        assert deep_link("tok") == "https://t.me/UA_BizCheck_bot?start=tok"


class TestLinkEndpoint:
    def test_missing_handle_is_503_not_a_wrong_link(self, client):
        resp = client.post("/api_crowe_bizcheck/tg/link/7", headers=_AUTH)
        assert resp.status_code == 503
        assert "t.me" not in resp.get_data(as_text=True)

    def test_configured_handle_is_used(self, client, monkeypatch):
        monkeypatch.setenv("TELEGRAM_BOT_USERNAME", "UA_BizCheck_bot")
        body = client.post("/api_crowe_bizcheck/tg/link/7", headers=_AUTH).get_json()
        assert body["url"].startswith("https://t.me/UA_BizCheck_bot?start=")
        assert body["pdf_ready"] is False


class TestFeedbackLink:
    def test_missing_handle_yields_no_link_instead_of_a_dead_one(self):
        from routes.tg_feedback import _feedback_link
        assert _feedback_link("abc") == ""

    def test_configured_handle_prefixes_the_outreach_token(self, monkeypatch):
        from routes.tg_feedback import _feedback_link
        monkeypatch.setenv("TELEGRAM_BOT_USERNAME", "UA_BizCheck_bot")
        assert _feedback_link("abc") == "https://t.me/UA_BizCheck_bot?start=fb_abc"
