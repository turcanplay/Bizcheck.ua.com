"""Unit tests for the client bot: /start delivery, retry policy, i18n, callbacks.

No network, no Telegram API, no DB, no sleeping. See conftest.py for the fakes.

Run:
    cd webdev/tgbot && venv/bin/python -m pytest -q
"""
import base64

import httpx
import pytest

import backend
import handlers
from config import CONTACT_EMAIL, SITE_NAME
from strings import _STRINGS, _t, pick_lang

from conftest import (
    FakeChat, FakeContact, FakeContext, FakeResponse, FakeUpdate, FakeUser,
    Scripted,
)


TOKEN = "Aa1Bb2Cc3Dd4"
PDF_BYTES = b"%PDF-1.4 fake report"


def _report_payload(**over):
    payload = {
        "language": "uk",
        "first_name": "Olga",
        "last_name": "Kovalenko",
        "total_score": 82.4,
        "pdf_b64": base64.b64encode(PDF_BYTES).decode(),
        "block_scores_json": [
            {"order": 1, "title": "Фінанси", "score": 90},
            {"order": 2, "score": 70},           # no title → localized fallback
        ],
    }
    payload.update(over)
    return payload


# ===========================================================================
# 1 — /start <token>: happy path
# ===========================================================================

class TestStartHappyPath:

    async def test_report_and_pdf_are_delivered(self, http):
        """The summary message and the PDF both reach the chat."""
        http.get_result = FakeResponse(200, _report_payload())
        update, context = FakeUpdate(), FakeContext(args=[TOKEN])

        await handlers.cmd_start(update, context)

        chat = update.effective_chat
        assert len(http.calls_to(f"/tg/report/{TOKEN}", method="GET")) == 1
        assert len(chat.documents) == 1, "the PDF must be sent as a document"
        assert chat.documents[0]["bytes"] == PDF_BYTES
        assert chat.documents[0]["filename"] == "BizCheck_Olga_Kovalenko.pdf"

    async def test_loading_message_has_real_text_then_becomes_preparing(self, http):
        """REGRESSION: the first message used to be a bare "⏳ ..." placeholder."""
        http.get_result = FakeResponse(200, _report_payload())
        update, context = FakeUpdate(user=FakeUser(language_code="en")), FakeContext(args=[TOKEN])

        await handlers.cmd_start(update, context)

        loading = update.effective_chat.messages[0]
        assert loading["text"] == _t("en", "loading")
        assert loading["text"].strip("⏳ .") != "", "loading text must not be empty"
        # …and it is replaced once the backend answers.
        assert loading["msg"].edits[0]["text"] == _t("uk", "preparing")

    async def test_summary_contains_score_and_block_titles(self, http):
        http.get_result = FakeResponse(200, _report_payload())
        update, context = FakeUpdate(), FakeContext(args=[TOKEN])

        await handlers.cmd_start(update, context)

        summary = update.effective_chat.texts[1]
        assert "82%" in summary
        assert "Фінанси" in summary

    @pytest.mark.parametrize("lang,expected", [("uk", "Блок 2"), ("en", "Block 2")])
    async def test_untitled_block_uses_the_localized_fallback(self, http, lang, expected):
        """REGRESSION: the fallback used to be the Romanian word "Bloc"."""
        http.get_result = FakeResponse(200, _report_payload(language=lang))
        update, context = FakeUpdate(), FakeContext(args=[TOKEN])

        await handlers.cmd_start(update, context)

        summary = update.effective_chat.texts[1]
        assert expected in summary
        assert "Bloc " not in summary, "no Romanian copy may reach a uk/en bot"

    async def test_telegram_contact_is_saved(self, http):
        http.get_result = FakeResponse(200, _report_payload())
        update, context = FakeUpdate(), FakeContext(args=[TOKEN])

        await handlers.cmd_start(update, context)

        posts = http.calls_to(f"/tg/contact/{TOKEN}", method="POST")
        assert len(posts) == 1
        assert posts[0]["json"]["tg_chat_id"] == 42
        assert posts[0]["json"]["tg_username"] == "olga"

    async def test_missing_pdf_shows_the_pending_message(self, http):
        http.get_result = FakeResponse(200, _report_payload(pdf_b64=None))
        update, context = FakeUpdate(), FakeContext(args=[TOKEN])

        await handlers.cmd_start(update, context)

        assert update.effective_chat.documents == []
        assert _t("uk", "pdf_pending") in update.effective_chat.texts


# ===========================================================================
# 2 — /start <token>: invalid / expired token and backend failures
# ===========================================================================

class TestStartFailures:

    async def test_invalid_token_tells_the_user_and_alerts_the_team(self, http):
        """404 → "expired" copy, no PDF, and the sales team is notified."""
        http.get_result = FakeResponse(404, {})
        update, context = FakeUpdate(), FakeContext(args=["nope"])

        await handlers.cmd_start(update, context)

        status_msg = update.effective_chat.messages[0]["msg"]
        assert status_msg.last_edit == _t("uk", "expired")
        assert update.effective_chat.documents == []
        failed = http.calls_to("/report/nope/failed", method="POST")
        assert len(failed) == 1
        assert failed[0]["json"]["reason"] == "expired"

    async def test_invalid_token_is_not_retried(self, http):
        """A 404 is a real answer — retrying it only delays the message."""
        http.get_result = FakeResponse(404, {})

        await handlers.cmd_start(FakeUpdate(), FakeContext(args=["nope"]))

        assert len(http.calls_to("/tg/report/nope", method="GET")) == 1

    async def test_backend_unreachable_shows_the_server_error(self, http, connect_error):
        http.get_result = connect_error
        update, context = FakeUpdate(), FakeContext(args=[TOKEN])

        await handlers.cmd_start(update, context)

        status_msg = update.effective_chat.messages[0]["msg"]
        assert status_msg.last_edit == _t("uk", "server_error")

    async def test_persistent_5xx_reports_server_fail(self, http):
        http.get_result = FakeResponse(503, {})
        update, context = FakeUpdate(), FakeContext(args=[TOKEN])

        await handlers.cmd_start(update, context)

        status_msg = update.effective_chat.messages[0]["msg"]
        assert status_msg.last_edit == _t("uk", "server_fail")

    async def test_start_without_a_token_shows_the_welcome(self, http):
        update, context = FakeUpdate(user=FakeUser(language_code="en")), FakeContext()

        await handlers.cmd_start(update, context)

        assert update.message.last_reply == _t("en", "welcome")
        assert http.calls == [], "no backend call without a token"


# ===========================================================================
# 3 — retry / backoff policy in backend.py
# ===========================================================================

class TestRetryPolicy:

    async def test_5xx_is_retried_then_succeeds(self, http):
        http.get_result = Scripted(FakeResponse(500, {}), FakeResponse(200, {"ok": True}))

        resp = await backend.get_report(TOKEN)

        assert resp.status_code == 200
        assert len(http.calls) == 2, "one retry after the 5xx"

    async def test_5xx_gives_up_after_the_attempt_budget(self, http):
        http.get_result = FakeResponse(500, {})

        resp = await backend.get_report(TOKEN)

        assert resp.status_code == 500, "the last response is returned, not an exception"
        assert len(http.calls) == backend.RETRY_ATTEMPTS == 3

    async def test_connect_error_is_retried_then_succeeds(self, http, connect_error):
        http.post_result = Scripted(connect_error, FakeResponse(200, {}))

        resp = await backend.save_lead(TOKEN, {"phone": "+380671234567"})

        assert resp.status_code == 200
        assert len(http.calls) == 2

    async def test_connect_error_is_re_raised_after_the_last_attempt(self, http, connect_error):
        http.get_result = connect_error

        with pytest.raises(httpx.RequestError):
            await backend.get_report(TOKEN)

        assert len(http.calls) == 3

    @pytest.mark.parametrize("code", [400, 403, 404, 409, 413, 429])
    async def test_4xx_is_never_retried(self, http, code):
        """403/404 are legitimate answers (wrong token, expired link) — a retry
        would only make the user wait for the same error."""
        http.post_result = FakeResponse(code, {})

        resp = await backend.save_lead(TOKEN, {"phone": "+380671234567"})

        assert resp.status_code == code
        assert len(http.calls) == 1, f"HTTP {code} must not be retried"

    async def test_backoff_grows_and_stays_within_bounds(self, monkeypatch):
        monkeypatch.setattr(backend, "RETRY_BASE_DELAY", 0.5)
        monkeypatch.setattr(backend, "RETRY_MAX_DELAY", 2.0)

        d0, d1, d2 = (backend._backoff(i) for i in range(3))

        assert 0.375 <= d0 <= 0.625        # 0.5 ± 25% jitter
        assert 0.75 <= d1 <= 1.25          # 1.0 ± 25%
        assert d2 <= 2.5, "capped by RETRY_MAX_DELAY (+ jitter)"

    async def test_every_call_carries_the_bot_secret(self, http):
        """The backend gates the bot-only endpoints on X-Bot-Secret."""
        await backend.get_report(TOKEN)
        await backend.save_lead(TOKEN, {"phone": "+380671234567"})
        await backend.feedback_reply({"chat_id": 1, "text": "hi"})

        assert http.calls, "sanity: calls were recorded"
        for call in http.calls:
            assert call["headers"].get("X-Bot-Secret") == "test-secret", call["url"]


# ===========================================================================
# 4 — language selection
# ===========================================================================

class TestLanguage:

    @pytest.mark.parametrize("code,expected", [
        ("en", "en"), ("en-US", "en"), ("EN_gb", "en"),
        ("uk", "uk"), ("uk-UA", "uk"),
        ("ru", "uk"), ("ro", "uk"), ("", "uk"), (None, "uk"),
    ])
    def test_pick_lang(self, code, expected):
        assert pick_lang(code) == expected

    def test_unknown_language_falls_back_to_ukrainian(self):
        assert _t("de", "welcome") == _t("uk", "welcome")

    def test_unknown_key_returns_the_key(self):
        assert _t("uk", "no_such_key") == "no_such_key"

    def test_uk_and_en_have_the_same_keys(self):
        assert set(_STRINGS["uk"]) == set(_STRINGS["en"])

    def test_site_and_contact_are_injected(self):
        for lang in ("uk", "en"):
            assert SITE_NAME in _t(lang, "welcome")
            assert CONTACT_EMAIL in _t(lang, "welcome")
            assert CONTACT_EMAIL in _t(lang, "email_error")

    def test_no_stale_brand_or_contact_anywhere(self):
        """REGRESSION: the copy said "Bizcheck.md" and mixed two support
        addresses (office@crowe-tm.md vs office@bizcheck.md)."""
        for lang, table in _STRINGS.items():
            for key, value in table.items():
                assert "Bizcheck.md" not in value, f"{lang}.{key}"
                assert "crowe-tm.md" not in value, f"{lang}.{key}"

    def test_missing_placeholder_does_not_crash(self):
        """A copy edit must never blow up a handler mid-flow."""
        assert "{first_name}" in _t("uk", "report_header")

    def test_help_lists_only_implemented_commands(self):
        for lang in ("uk", "en"):
            text = _t(lang, "help")
            assert "/start" in text and "/help" in text
            for absent in ("/excel", "/client", "/register", "/pdf"):
                assert absent not in text


# ===========================================================================
# 5 — callback handlers: eml: and lead:
# ===========================================================================

class TestEmailCallback:

    async def test_arms_the_email_flow_and_prompts(self, http):
        update = FakeUpdate(callback_data=f"eml:en:{TOKEN}")
        context = FakeContext()

        await handlers.on_email_button(update, context)

        assert update.callback_query.answered
        assert context.user_data["flow"] == "email"
        assert context.user_data["lng"] == "en"
        assert context.user_data["tok"] == TOKEN
        assert update.callback_query.message.last_reply == _t("en", "email_prompt")

    async def test_malformed_callback_data_arms_nothing(self, http):
        update = FakeUpdate(callback_data="eml:en")
        context = FakeContext()

        await handlers.on_email_button(update, context)

        assert "flow" not in context.user_data
        assert update.callback_query.message.replies == []

    async def test_invalid_email_is_rejected_without_a_backend_call(self, http):
        context = FakeContext()
        await handlers.on_email_button(FakeUpdate(callback_data=f"eml:uk:{TOKEN}"), context)

        update = FakeUpdate(text="not-an-email")
        await handlers.on_text(update, context)

        assert update.message.last_reply == _t("uk", "email_invalid")
        assert http.calls_to("/tg/email/") == []

    async def test_valid_email_is_sent_and_flow_cleared(self, http):
        context = FakeContext()
        await handlers.on_email_button(FakeUpdate(callback_data=f"eml:uk:{TOKEN}"), context)

        update = FakeUpdate(text="olga@example.com")
        await handlers.on_text(update, context)

        posts = http.calls_to(f"/tg/email/{TOKEN}", method="POST")
        assert len(posts) == 1
        assert posts[0]["json"] == {"email": "olga@example.com"}
        assert "olga@example.com" in update.message.last_reply
        assert context.user_data == {}, "the flow must disarm after success"

    async def test_pending_report_keeps_the_flow_armed(self, http):
        http.post_result = FakeResponse(409, {})
        context = FakeContext()
        await handlers.on_email_button(FakeUpdate(callback_data=f"eml:uk:{TOKEN}"), context)

        update = FakeUpdate(text="olga@example.com")
        await handlers.on_text(update, context)

        assert update.message.last_reply == _t("uk", "email_pending")
        assert context.user_data.get("flow") == "email", "user may retry"


class TestLeadCallback:

    async def test_arms_the_lead_flow_and_asks_for_email(self, http):
        update = FakeUpdate(callback_data=f"lead:uk:{TOKEN}")
        context = FakeContext()

        await handlers.on_lead_button(update, context)

        assert context.user_data["flow"] == "lead"
        assert context.user_data["step"] == "email"
        assert update.callback_query.message.last_reply == _t("uk", "lead_ask_email")

    async def test_email_then_phone_saves_the_lead(self, http):
        context = FakeContext()
        await handlers.on_lead_button(FakeUpdate(callback_data=f"lead:uk:{TOKEN}"), context)

        await handlers.on_text(FakeUpdate(text="olga@example.com"), context)
        assert context.user_data["step"] == "phone"
        assert http.calls_to("/tg/lead/") == [], "nothing saved until the phone arrives"

        update = FakeUpdate(text="+380 67 123 4567")
        await handlers.on_text(update, context)

        posts = http.calls_to(f"/tg/lead/{TOKEN}", method="POST")
        assert len(posts) == 1
        assert posts[0]["json"] == {"email": "olga@example.com",
                                    "phone": "+380 67 123 4567"}
        assert update.message.last_reply == _t("uk", "lead_saved")

    async def test_invalid_phone_keeps_the_step(self, http):
        context = FakeContext()
        await handlers.on_lead_button(FakeUpdate(callback_data=f"lead:uk:{TOKEN}"), context)
        await handlers.on_text(FakeUpdate(text="olga@example.com"), context)

        update = FakeUpdate(text="abc")
        await handlers.on_text(update, context)

        assert update.message.last_reply == _t("uk", "lead_invalid_phone")
        assert context.user_data["step"] == "phone"
        assert http.calls_to("/tg/lead/") == []

    async def test_expired_token_reports_and_clears(self, http):
        http.post_result = FakeResponse(404, {})
        context = FakeContext()
        await handlers.on_lead_button(FakeUpdate(callback_data=f"lead:uk:{TOKEN}"), context)
        await handlers.on_text(FakeUpdate(text="olga@example.com"), context)

        update = FakeUpdate(text="+380671234567")
        await handlers.on_text(update, context)

        assert update.message.last_reply == _t("uk", "lead_expired")
        assert context.user_data == {}


# ===========================================================================
# 6 — one-tap phone share + stray text
# ===========================================================================

class TestPhoneShare:

    async def test_shared_contact_is_saved_phone_only(self, http):
        context = FakeContext()
        context.user_data.update({"ctok": TOKEN, "clng": "uk"})
        update = FakeUpdate(contact=FakeContact("+380671234567"))

        await handlers.on_contact(update, context)

        posts = http.calls_to(f"/tg/lead/{TOKEN}", method="POST")
        assert posts[0]["json"] == {"phone": "+380671234567"}
        assert update.message.last_reply == _t("uk", "phone_saved")

    async def test_later_button_dismisses_the_keyboard(self, http):
        context = FakeContext()
        context.user_data.update({"ctok": TOKEN, "clng": "uk"})
        update = FakeUpdate(text=_STRINGS["uk"]["phone_later_btn"])

        await handlers.on_text(update, context)

        assert update.message.last_reply == _t("uk", "phone_later_ack")
        assert "ctok" not in context.user_data
        assert http.calls == []


class TestFeedback:

    async def test_open_uses_the_users_real_language(self, http):
        """REGRESSION: the payload used to hardcode lang="en"."""
        update = FakeUpdate(user=FakeUser(language_code="uk"))

        await handlers.cmd_start(update, FakeContext(args=["fb_TOK"]))

        posts = http.calls_to("/tg/feedback/open", method="POST")
        assert posts[0]["json"]["lang"] == "uk"
        assert posts[0]["json"]["token"] == "TOK"

    async def test_open_respects_an_english_client(self, http):
        update = FakeUpdate(user=FakeUser(language_code="en-GB"))

        await handlers.cmd_start(update, FakeContext(args=["fb_TOK"]))

        assert http.calls_to("/tg/feedback/open")[0]["json"]["lang"] == "en"

    async def test_open_failure_is_reported_to_the_user(self, http):
        http.post_result = FakeResponse(404, {})
        update = FakeUpdate(user=FakeUser(language_code="en"))

        await handlers.cmd_start(update, FakeContext(args=["fb_TOK"]))

        assert update.message.last_reply == _t("en", "feedback_error")

    async def test_stray_text_without_a_match_stays_silent(self, http):
        http.post_result = FakeResponse(200, {"matched": False})
        update = FakeUpdate(text="hello?")

        await handlers.on_text(update, FakeContext())

        assert update.message.replies == []
        assert len(http.calls_to("/tg/feedback/reply", method="POST")) == 1

    async def test_matched_reply_relays_the_ack(self, http):
        http.post_result = FakeResponse(200, {"matched": True, "ack": "Дякуємо!"})
        update = FakeUpdate(text="все добре")

        await handlers.on_text(update, FakeContext())

        assert update.message.last_reply == "Дякуємо!"
