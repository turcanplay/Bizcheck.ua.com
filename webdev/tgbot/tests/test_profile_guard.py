"""Source-owned public identity and drift repair; all Telegram calls are faked."""

import asyncio
import hashlib
import json
import logging
import runpy
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from telegram import BotCommand

import bot
import bot_profile as profile
import profile_guard


def fake_bot():
    return SimpleNamespace(
        id=123,
        username="UA_BizCheck_bot",
        token="123456:THIS_SECRET_MUST_NEVER_APPEAR_IN_LOGS",
        get_my_name=AsyncMock(return_value=SimpleNamespace(name="outside edit")),
        set_my_name=AsyncMock(),
        get_my_description=AsyncMock(return_value=SimpleNamespace(description="outside edit")),
        set_my_description=AsyncMock(),
        get_my_short_description=AsyncMock(
            return_value=SimpleNamespace(short_description="outside edit")),
        set_my_short_description=AsyncMock(),
        get_my_commands=AsyncMock(return_value=[BotCommand("spam", "Outside link")]),
        set_my_commands=AsyncMock(),
        delete_my_commands=AsyncMock(),
        get_chat_menu_button=AsyncMock(return_value=SimpleNamespace(type="web_app")),
        set_chat_menu_button=AsyncMock(),
        get_webhook_info=AsyncMock(return_value=SimpleNamespace(url="https://outside.example/")),
        delete_webhook=AsyncMock(),
        get_my_default_administrator_rights=AsyncMock(
            return_value=SimpleNamespace(to_dict=lambda: {"can_delete_messages": True})),
        set_my_default_administrator_rights=AsyncMock(),
        get_user_profile_photos=AsyncMock(),
    )


def test_environment_cannot_replace_source_owned_public_identity(monkeypatch):
    monkeypatch.setenv("SITE_NAME", "ATTACKER.example")
    monkeypatch.setenv("CONTACT_EMAIL", "attacker@example.invalid")
    monkeypatch.setenv("BOT_DISPLAY_NAME", "ATTACKER")
    monkeypatch.setenv("BOT_DESCRIPTION", "ATTACKER")
    source = runpy.run_path(str(Path(profile.__file__)))
    config = runpy.run_path(str(Path(profile.__file__).with_name("config.py")))
    assert source["SITE_NAME"] == config["SITE_NAME"] == profile.SITE_NAME
    assert source["CONTACT_EMAIL"] == config["CONTACT_EMAIL"] == profile.CONTACT_EMAIL
    assert source["BOT_NAME"] == profile.BOT_NAME
    assert source["DESCRIPTION"] == profile.DESCRIPTION
    assert "ATTACKER" not in source["DESCRIPTION"]


def test_identity_meets_telegram_limits_and_uses_ukrainian_commands():
    assert 0 < len(profile.BOT_NAME) <= 64
    assert 0 < len(profile.DESCRIPTION) <= 512
    assert 0 < len(profile.SHORT_DESCRIPTION) <= 120
    assert "Пройдіть" in profile.DESCRIPTION
    assert "Звіти" in profile.SHORT_DESCRIPTION
    assert profile_guard.command_list() == [
        BotCommand("start", "Отримати звіт Bizcheck"),
        BotCommand("help", "Довідка та контакти"),
    ]
    assert bot._command_list("en") == bot._command_list("uk")


def test_profile_asset_is_exact_public_md_avatar():
    """Avatar downloaded from t.me/CROWE_BIZCHECK_bot's og:image, unchanged."""
    image = profile.PHOTO_PATH.read_bytes()
    assert image[:3] == b"\xff\xd8\xff"
    assert image[-2:] == b"\xff\xd9"
    assert hashlib.sha256(image).hexdigest() == (
        "31bec85d3ddb5bcac799769024082306b5f43e09604dd92ae0b19755d405f86a"
    )


async def test_profile_restores_fallback_and_clears_localized_overrides(monkeypatch):
    telegram_bot = fake_bot()
    guard = profile_guard.ProfileGuard(telegram_bot)
    monkeypatch.setattr(profile_guard.asyncio, "sleep", AsyncMock())

    changes = await guard._languages(("", "uk", "en"))

    for field, expected in (("name", profile.BOT_NAME),
                            ("description", profile.DESCRIPTION),
                            ("short_description", profile.SHORT_DESCRIPTION)):
        setter = getattr(telegram_bot, f"set_my_{field}")
        assert setter.await_args_list[0].kwargs == {field: expected, "language_code": ""}
        assert setter.await_args_list[1].kwargs == {field: "", "language_code": "uk"}
        assert setter.await_args_list[2].kwargs == {field: "", "language_code": "en"}
    telegram_bot.set_my_commands.assert_awaited_once_with(
        profile_guard.command_list(), scope=None, language_code="")
    assert telegram_bot.delete_my_commands.await_count == 11
    assert telegram_bot.get_my_commands.await_count == 12
    assert "description[default]" in changes
    assert "description[en]" in changes


async def test_unchanged_profile_does_not_rewrite_fields_or_commands(monkeypatch):
    telegram_bot = fake_bot()
    telegram_bot.get_my_name.return_value = SimpleNamespace(name=profile.BOT_NAME)
    telegram_bot.get_my_description.return_value = SimpleNamespace(description=profile.DESCRIPTION)
    telegram_bot.get_my_short_description.return_value = SimpleNamespace(
        short_description=profile.SHORT_DESCRIPTION)

    async def commands(*, scope, language_code):
        return profile_guard.command_list() if scope is None else []

    telegram_bot.get_my_commands.side_effect = commands
    guard = profile_guard.ProfileGuard(telegram_bot)
    monkeypatch.setattr(profile_guard.asyncio, "sleep", AsyncMock())
    assert await guard._languages(("",)) == []
    telegram_bot.set_my_name.assert_not_awaited()
    telegram_bot.set_my_description.assert_not_awaited()
    telegram_bot.set_my_short_description.assert_not_awaited()
    telegram_bot.set_my_commands.assert_not_awaited()
    telegram_bot.delete_my_commands.assert_not_awaited()


async def test_external_menu_webhook_and_default_admin_rights_are_reset(caplog):
    telegram_bot = fake_bot()
    guard = profile_guard.ProfileGuard(telegram_bot)
    guard._languages = AsyncMock(return_value=[])
    guard._photo = AsyncMock(return_value=False)
    with caplog.at_level(logging.WARNING):
        changes = await guard.enforce()
    assert set(changes) == {"menu", "webhook", "default_admin_rights"}
    assert telegram_bot.set_chat_menu_button.await_args.kwargs["menu_button"].type == "commands"
    telegram_bot.delete_webhook.assert_awaited_once_with(drop_pending_updates=False)
    assert [call.kwargs for call in
            telegram_bot.set_my_default_administrator_rights.await_args_list] == [
        {"for_channels": False}, {"for_channels": True}]
    assert "outside.example" not in caplog.text
    assert telegram_bot.token not in caplog.text


async def test_clean_menu_webhook_and_admin_rights_are_not_rewritten():
    telegram_bot = fake_bot()
    telegram_bot.get_chat_menu_button.return_value = SimpleNamespace(type="commands")
    telegram_bot.get_webhook_info.return_value = SimpleNamespace(url="")
    telegram_bot.get_my_default_administrator_rights.return_value = SimpleNamespace(
        to_dict=lambda: {"can_delete_messages": False})
    guard = profile_guard.ProfileGuard(telegram_bot)
    guard._languages = AsyncMock(return_value=[])
    guard._photo = AsyncMock(return_value=False)
    assert await guard.enforce() == []
    telegram_bot.set_chat_menu_button.assert_not_awaited()
    telegram_bot.delete_webhook.assert_not_awaited()
    telegram_bot.set_my_default_administrator_rights.assert_not_awaited()


async def test_one_failed_locale_does_not_block_other_locales_or_security_checks(monkeypatch, caplog):
    telegram_bot = fake_bot()

    async def get_name(*, language_code):
        if language_code == "en":
            raise RuntimeError(telegram_bot.token)
        return SimpleNamespace(name="outside edit")

    telegram_bot.get_my_name.side_effect = get_name
    guard = profile_guard.ProfileGuard(telegram_bot)
    guard._photo = AsyncMock(return_value=True)
    monkeypatch.setattr(profile_guard.asyncio, "sleep", AsyncMock())
    with caplog.at_level(logging.WARNING):
        changes = await guard.enforce(languages=("", "en", "uk"))
    assert "name[uk]" in changes
    assert "description[en]" in changes
    assert "webhook" in changes
    assert "photo" in changes
    telegram_bot.delete_webhook.assert_awaited_once_with(drop_pending_updates=False)
    assert guard._retry_languages == {"en"}
    assert telegram_bot.token not in caplog.text

    telegram_bot.get_my_name.side_effect = None
    telegram_bot.get_my_name.return_value = SimpleNamespace(name="")
    await guard._languages(("en",))
    assert guard._retry_languages == set()


async def test_failed_menu_read_still_repairs_webhook_and_avatar(caplog):
    telegram_bot = fake_bot()
    telegram_bot.get_chat_menu_button.side_effect = RuntimeError(telegram_bot.token)
    guard = profile_guard.ProfileGuard(telegram_bot)
    guard._languages = AsyncMock(return_value=[])
    guard._photo = AsyncMock(return_value=True)
    with caplog.at_level(logging.WARNING):
        changes = await guard.enforce()
    assert "webhook" in changes
    assert "photo" in changes
    telegram_bot.delete_webhook.assert_awaited_once_with(drop_pending_updates=False)
    guard._photo.assert_awaited_once()
    assert telegram_bot.token not in caplog.text


class PhotoHttp:
    def __init__(self, status=200, ok=True):
        self.status = status
        self.ok = ok
        self.options = None
        self.calls = []

    def __call__(self, **kwargs):
        self.options = kwargs
        return self

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        return False

    async def post(self, url, **kwargs):
        self.calls.append((url, kwargs))
        return SimpleNamespace(status_code=self.status, json=lambda: {"ok": self.ok})


async def test_photo_upload_uses_exact_source_jpeg_and_detects_external_change(monkeypatch):
    telegram_bot = fake_bot()
    guard = profile_guard.ProfileGuard(telegram_bot)
    guard._fingerprint = AsyncMock(side_effect=[("outside",), ("ours",),
                                                ("ours",), ("outside-again",), ("ours-new",)])
    client = PhotoHttp()
    monkeypatch.setattr(profile_guard.httpx, "AsyncClient", client)
    assert await guard._photo() is True
    assert await guard._photo() is False
    assert await guard._photo() is True
    assert len(client.calls) == 2
    assert client.options == {"timeout": 30, "follow_redirects": False}
    url, request = client.calls[0]
    assert url == f"https://api.telegram.org/bot{telegram_bot.token}/setMyProfilePhoto"
    assert json.loads(request["data"]["photo"]) == {
        "type": "static", "photo": "attach://avatar"}
    assert request["files"]["avatar"] == (
        "profile.jpg", profile.PHOTO_PATH.read_bytes(), "image/jpeg")


@pytest.mark.parametrize("status,ok", [(400, False), (200, False)])
async def test_failed_photo_upload_does_not_mark_drift_as_repaired(monkeypatch, status, ok):
    guard = profile_guard.ProfileGuard(fake_bot())
    guard._fingerprint = AsyncMock(return_value=("outside",))
    monkeypatch.setattr(profile_guard.httpx, "AsyncClient", PhotoHttp(status, ok))
    with pytest.raises(RuntimeError, match="Telegram rejected profile photo"):
        await guard._photo()
    assert guard._photo_fingerprint is None


async def test_photo_must_be_visible_after_upload(monkeypatch):
    guard = profile_guard.ProfileGuard(fake_bot())
    guard._fingerprint = AsyncMock(return_value=())
    monkeypatch.setattr(profile_guard.httpx, "AsyncClient", PhotoHttp())
    with pytest.raises(RuntimeError, match="verification failed"):
        await guard._photo()


async def test_missing_photo_asset_makes_no_telegram_upload(monkeypatch, tmp_path):
    guard = profile_guard.ProfileGuard(fake_bot())
    guard._fingerprint = AsyncMock()
    monkeypatch.setattr(profile, "PHOTO_PATH", tmp_path / "missing.jpg")
    assert await guard._photo() is False
    guard._fingerprint.assert_not_awaited()


async def test_startup_publishes_ukrainian_menu_and_guard_stops_cleanly(monkeypatch):
    monkeypatch.setattr(bot, "BOT_USERNAME", "UA_BizCheck_bot")
    app = SimpleNamespace(bot=fake_bot(), bot_data={})
    started = asyncio.Event()

    async def run():
        started.set()
        await asyncio.Event().wait()

    monkeypatch.setattr(bot, "ProfileGuard", lambda telegram_bot: SimpleNamespace(run=run))
    await bot._post_init(app)
    await asyncio.wait_for(started.wait(), timeout=1)
    task = app.bot_data["profile_guard_task"]
    app.bot.set_my_commands.assert_awaited_once_with(profile_guard.command_list())
    await profile_guard.stop_guard(app)
    assert task.cancelled()
    assert "profile_guard_task" not in app.bot_data


async def test_startup_menu_error_keeps_guard_running_without_logging_token(monkeypatch, caplog):
    monkeypatch.setattr(bot, "BOT_USERNAME", "UA_BizCheck_bot")
    app = SimpleNamespace(bot=fake_bot(), bot_data={})
    app.bot.set_my_commands.side_effect = RuntimeError(app.bot.token)
    monkeypatch.setattr(bot, "ProfileGuard", lambda telegram_bot: SimpleNamespace(run=AsyncMock()))
    with caplog.at_level(logging.WARNING):
        await bot._post_init(app)
        await app.bot_data["profile_guard_task"]
    assert app.bot.token not in caplog.text
    assert "RuntimeError" in caplog.text
    await profile_guard.stop_guard(app)


@pytest.mark.parametrize("configured,actual", [
    ("UA_BizCheck_bot", "other_bot"),
    ("CROWE_BIZCHECK_bot", "CROWE_BIZCHECK_bot"),
    ("", "UA_BizCheck_bot"),
])
async def test_identity_mismatch_cannot_change_the_reference_or_another_bot(monkeypatch, configured, actual):
    monkeypatch.setattr(bot, "BOT_USERNAME", configured)
    app = SimpleNamespace(bot=fake_bot(), bot_data={})
    app.bot.username = actual
    with pytest.raises(RuntimeError, match="identity mismatch"):
        await bot._post_init(app)
    app.bot.set_my_commands.assert_not_awaited()
    assert app.bot_data == {}


@pytest.mark.parametrize("token,secret,missing", [("", "shared", "TELEGRAM_BOT_TOKEN"),
                                                  ("fake-token", "", "BOT_SHARED_SECRET")])
def test_bot_refuses_start_without_required_credentials(monkeypatch, token, secret, missing):
    monkeypatch.setattr(bot, "BOT_TOKEN", token)
    monkeypatch.setattr(bot, "BOT_SHARED_SECRET", secret)
    with pytest.raises(RuntimeError, match=missing):
        bot.main()
