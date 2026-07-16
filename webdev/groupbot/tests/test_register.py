"""Unit tests for the /register owner gate and the fail-closed _allowed().

No network, no Telegram API, no DB, no sleeping. See conftest.py for the fakes.

Run:
    cd webdev/groupbot && venv/bin/python -m pytest -v
"""
import pytest

import bot
from conftest import (
    FakeBot, FakeChat, FakeContext, FakeResponse, FakeUpdate, FakeUser,
)


REGISTER_URL = "/tg/group/register"
REGISTERED_URL = "/tg/group/registered"


def _group_update(**kw):
    return FakeUpdate(chat=FakeChat(id=-100777, type="supergroup", title="Sales Team"),
                      user=FakeUser(id=42, username="olga"), **kw)


# ===========================================================================
# 1-7 — owner gate on /register
# ===========================================================================

class TestOwnerGate:

    async def test_owner_registers_group(self, http):
        """1. Chat creator in a supergroup → registration POSTed to the backend."""
        update = _group_update()
        context = FakeContext(FakeBot(status="creator"))

        await bot.cmd_register(update, context)

        posts = http.calls_to(REGISTER_URL, method="POST")
        assert len(posts) == 1, "the owner's /register must reach the backend"
        assert context.bot.calls == [(-100777, 42)]
        assert "зареєстровано" in update.message.last_reply

    async def test_plain_administrator_is_denied(self, http):
        """2. An administrator is NOT enough — owner-only, no backend POST."""
        update = _group_update()
        context = FakeContext(FakeBot(status="administrator"))

        await bot.cmd_register(update, context)

        assert http.calls_to(REGISTER_URL) == [], \
            "an administrator must not be able to register the group"
        assert "власник" in update.message.last_reply

    async def test_ordinary_member_is_denied(self, http):
        """3. Ordinary member → denied."""
        update = _group_update()
        context = FakeContext(FakeBot(status="member"))

        await bot.cmd_register(update, context)

        assert http.calls_to(REGISTER_URL) == []
        assert "власник" in update.message.last_reply

    @pytest.mark.parametrize("status", ["administrator", "member", "restricted",
                                        "left", "kicked"])
    async def test_only_creator_passes_the_gate(self, http, status):
        """2/3 generalised — every non-creator status is refused."""
        update = _group_update()
        context = FakeContext(FakeBot(status=status))

        assert await bot._owner_gate(update, context) is False
        assert http.calls == []

    async def test_private_chat_is_refused(self, http):
        """4. Private chat → "only in a group", no POST, no membership lookup."""
        update = FakeUpdate(chat=FakeChat(id=42, type="private", title=None),
                            user=FakeUser(id=42))
        context = FakeContext(FakeBot(status="creator"))

        await bot.cmd_register(update, context)

        assert http.calls_to(REGISTER_URL) == []
        assert context.bot.calls == [], "must not even ask Telegram in a private chat"
        assert "лише в групі" in update.message.last_reply

    async def test_get_chat_member_error_fails_closed(self, http):
        """5. get_chat_member raises → denied, and the reply must not claim
        the user isn't the owner (we simply do not know)."""
        update = _group_update()
        context = FakeContext(FakeBot(raises=RuntimeError("telegram is down")))

        await bot.cmd_register(update, context)

        assert http.calls_to(REGISTER_URL) == [], "must fail closed, not open"
        reply = update.message.last_reply
        assert "перевірити ваші права" in reply
        assert "власник" not in reply, \
            "an inconclusive check must not be reported as 'you are not the owner'"

    async def test_payload_shape_has_no_thread_id(self, http):
        """6. Payload carries chat_id + title + registered_by and explicitly
        NOT message_thread_id (that would pin notifications to one topic)."""
        update = _group_update(message_thread_id=987)
        context = FakeContext(FakeBot(status="creator"))

        await bot.cmd_register(update, context)

        payload = http.calls_to(REGISTER_URL, method="POST")[0]["json"]
        assert payload["chat_id"] == -100777
        assert payload["title"] == "Sales Team"
        assert payload["registered_by"] == "@olga"
        assert "message_thread_id" not in payload, \
            "pinning the thread would break the backend's per-test topics"

    async def test_registered_by_falls_back_to_user_id(self, http):
        """6b. No @username → the numeric id is recorded instead."""
        update = FakeUpdate(chat=FakeChat(id=-100777, type="supergroup"),
                            user=FakeUser(id=42, username=None))
        context = FakeContext(FakeBot(status="creator"))

        await bot.cmd_register(update, context)

        payload = http.calls_to(REGISTER_URL, method="POST")[0]["json"]
        assert payload["registered_by"] == "42"

    async def test_backend_403_mentions_the_shared_secret(self, http):
        """7a. 403 → the reply names the missing BOT_SHARED_SECRET."""
        http.post_result = FakeResponse(403, {"error": "forbidden"})
        update = _group_update()
        context = FakeContext(FakeBot(status="creator"))

        await bot.cmd_register(update, context)

        assert "BOT_SHARED_SECRET" in update.message.last_reply

    async def test_backend_unreachable_does_not_crash(self, http, request_error):
        """7b. httpx.RequestError → "backend unavailable", no exception."""
        http.post_result = request_error
        update = _group_update()
        context = FakeContext(FakeBot(status="creator"))

        await bot.cmd_register(update, context)

        assert "Бекенд недоступний" in update.message.last_reply

    async def test_backend_500_is_reported_with_the_code(self, http):
        """7c. Any other non-200 surfaces the status code."""
        http.post_result = FakeResponse(500, {})
        update = _group_update()
        context = FakeContext(FakeBot(status="creator"))

        await bot.cmd_register(update, context)

        assert "500" in update.message.last_reply

    async def test_successful_register_sends_the_shared_secret(self, http):
        """The register call is authenticated to the backend."""
        update = _group_update()
        await bot.cmd_register(update, FakeContext(FakeBot(status="creator")))

        headers = http.calls_to(REGISTER_URL, method="POST")[0]["headers"]
        assert headers.get("X-Bot-Secret") == "test-secret"

    async def test_unregister_is_owner_gated_too(self, http):
        """/unregister shares the gate — an administrator cannot clear it."""
        update = _group_update()
        await bot.cmd_unregister(update, FakeContext(FakeBot(status="administrator")))

        assert http.calls_to("/tg/group/unregister") == []
        assert "власник" in update.message.last_reply


# ===========================================================================
# 8-12 — _allowed() fails closed
# ===========================================================================

def _registered_ok(chat_id):
    return FakeResponse(200, {"chat_id": chat_id})


class TestAllowed:

    async def test_env_wins_and_scopes_to_one_chat(self, http, monkeypatch):
        """8. SALES_CHAT_ID set → only that chat, and the backend is not asked."""
        monkeypatch.setattr(bot, "ALLOWED_CHAT_ID", "-100777")

        assert await bot._allowed(FakeUpdate(chat=FakeChat(id=-100777))) is True
        assert await bot._allowed(FakeUpdate(chat=FakeChat(id=-100999))) is False
        assert http.calls == [], "env must short-circuit the backend lookup"

    async def test_env_overrides_a_different_registration(self, http, monkeypatch):
        """8b. Env wins even when the backend has another chat registered."""
        monkeypatch.setattr(bot, "ALLOWED_CHAT_ID", "-100777")
        http.get_result = _registered_ok(-100999)

        assert await bot._allowed(FakeUpdate(chat=FakeChat(id=-100999))) is False
        assert await bot._allowed(FakeUpdate(chat=FakeChat(id=-100777))) is True

    async def test_registered_chat_allowed_others_denied(self, http):
        """9. No env + a registered chat → that chat only."""
        http.get_result = _registered_ok(-100777)

        assert await bot._allowed(FakeUpdate(chat=FakeChat(id=-100777))) is True
        assert await bot._allowed(FakeUpdate(chat=FakeChat(id=-100999))) is False
        assert len(http.calls_to(REGISTERED_URL)) == 1, "second call served from cache"

    async def test_nothing_registered_denies(self, http):
        """10. REGRESSION: no env + nothing registered → deny.

        The old code returned True here, which let ANY group run /excel and
        /client — both of which serve PII.
        """
        http.get_result = FakeResponse(200, {"chat_id": None})

        assert await bot._allowed(FakeUpdate(chat=FakeChat(id=-100777))) is False
        assert await bot._allowed(FakeUpdate(chat=FakeChat(id=-1))) is False

    async def test_no_chat_denies(self, http):
        """10b. An update with no chat at all → deny."""
        update = FakeUpdate()
        update.effective_chat = None

        assert await bot._allowed(update) is False

    @pytest.mark.parametrize("result", [
        FakeResponse(500, {}),
        FakeResponse(403, {}),
        FakeResponse(200, content=b"<html>not json</html>"),  # .json() raises
    ])
    async def test_bad_backend_answer_denies(self, http, result):
        """10c. 5xx / 403 / non-JSON → deny, never fail open."""
        http.get_result = result

        assert await bot._allowed(FakeUpdate(chat=FakeChat(id=-100777))) is False

    async def test_lookup_failure_is_not_cached(self, http, request_error):
        """11. Backend unreachable → deny, and the failure is NOT cached:
        the very next call re-fetches and succeeds."""
        http.get_result = request_error
        update = FakeUpdate(chat=FakeChat(id=-100777))

        assert await bot._allowed(update) is False
        assert bot._reg_cache["at"] == 0.0, "a failed lookup must not poison the cache"

        http.get_result = _registered_ok(-100777)
        assert await bot._allowed(update) is True, \
            "recovery must be immediate, not after the 60s TTL"
        assert len(http.calls_to(REGISTERED_URL)) == 2


class TestRegCache:

    async def test_second_call_is_served_from_cache(self, http, clock):
        """12a. Two calls in a row → the backend is hit exactly once."""
        http.get_result = _registered_ok(-100777)
        update = FakeUpdate(chat=FakeChat(id=-100777))

        assert await bot._allowed(update) is True
        assert await bot._allowed(update) is True

        assert len(http.calls_to(REGISTERED_URL)) == 1

    async def test_cache_expires_after_the_ttl(self, http, clock):
        """12b. Just under 60s → cached; past 60s → re-fetched. No sleeping."""
        http.get_result = _registered_ok(-100777)
        update = FakeUpdate(chat=FakeChat(id=-100777))

        await bot._allowed(update)
        clock.advance(bot._REG_TTL - 1)
        await bot._allowed(update)
        assert len(http.calls_to(REGISTERED_URL)) == 1, "still inside the TTL"

        clock.advance(2)
        await bot._allowed(update)
        assert len(http.calls_to(REGISTERED_URL)) == 2, "TTL expired → re-fetch"

    async def test_expired_cache_picks_up_a_new_registration(self, http, clock):
        """12c. After the TTL the bot follows the group that is registered now."""
        http.get_result = _registered_ok(-100777)
        old = FakeUpdate(chat=FakeChat(id=-100777))
        new = FakeUpdate(chat=FakeChat(id=-100999))

        assert await bot._allowed(old) is True

        http.get_result = _registered_ok(-100999)
        clock.advance(bot._REG_TTL + 1)

        assert await bot._allowed(new) is True
        assert await bot._allowed(old) is False

    async def test_invalidate_forces_a_refetch(self, http, clock):
        """12d. _invalidate_reg_cache() → the next call re-reads immediately,
        without waiting out the TTL."""
        http.get_result = _registered_ok(-100777)
        update = FakeUpdate(chat=FakeChat(id=-100777))

        await bot._allowed(update)
        assert len(http.calls_to(REGISTERED_URL)) == 1

        bot._invalidate_reg_cache()

        await bot._allowed(update)  # clock has NOT moved
        assert len(http.calls_to(REGISTERED_URL)) == 2

    async def test_register_invalidates_the_cache(self, http, clock):
        """12e. End-to-end: a group denied before /register is allowed right
        after it, with no TTL wait — /register drops the cache."""
        http.get_result = FakeResponse(200, {"chat_id": None})  # nothing registered
        update = _group_update()

        assert await bot._allowed(update) is False

        http.get_result = _registered_ok(-100777)
        await bot.cmd_register(update, FakeContext(FakeBot(status="creator")))

        assert await bot._allowed(update) is True
        assert len(http.calls_to(REGISTERED_URL)) == 2

    async def test_negative_result_is_cached_too(self, http, clock):
        """12f. "nothing registered" is cached for the TTL as well — a busy
        group must not hammer the backend on every message."""
        http.get_result = FakeResponse(200, {"chat_id": None})
        update = FakeUpdate(chat=FakeChat(id=-100777))

        assert await bot._allowed(update) is False
        assert await bot._allowed(update) is False

        assert len(http.calls_to(REGISTERED_URL)) == 1
