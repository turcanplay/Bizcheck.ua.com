"""Source-owned public identity and drift repair; all Telegram calls are faked."""

import asyncio
import hashlib
import json
import logging
import runpy
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

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


def idle_guard(calls=None):
    """Fake guard whose tiers count their starts and then wait forever."""
    calls = calls if calls is not None else []

    def tier(name):
        async def run():
            calls.append(name)
            await asyncio.Event().wait()
        return run

    return SimpleNamespace(**{f"run_{name}": tier(name) for name in profile_guard.TIERS},
                           poke=lambda: None)


async def until(predicate, timeout=1.0):
    async def poll():
        while not predicate():
            await asyncio.sleep(0.005)
    await asyncio.wait_for(poll(), timeout)


async def test_startup_publishes_ukrainian_menu_and_guard_stops_cleanly(monkeypatch):
    monkeypatch.setattr(bot, "BOT_USERNAME", "UA_BizCheck_bot")
    app = SimpleNamespace(bot=fake_bot(), bot_data={})
    calls = []
    monkeypatch.setattr(bot, "ProfileGuard", lambda telegram_bot: idle_guard(calls))
    await bot._post_init(app)
    await until(lambda: len(calls) == 3)
    assert sorted(calls) == sorted(profile_guard.TIERS)
    tasks = dict(app.bot_data[profile_guard.TASKS_KEY])
    app.bot.set_my_commands.assert_awaited_once_with(profile_guard.command_list())
    await profile_guard.stop_guard(app)
    assert all(task.cancelled() for task in tasks.values())
    assert profile_guard.TASKS_KEY not in app.bot_data
    assert "profile_guard" not in app.bot_data


async def test_startup_menu_error_keeps_guard_running_without_logging_token(monkeypatch, caplog):
    monkeypatch.setattr(bot, "BOT_USERNAME", "UA_BizCheck_bot")
    app = SimpleNamespace(bot=fake_bot(), bot_data={})
    app.bot.set_my_commands.side_effect = RuntimeError(app.bot.token)
    calls = []
    monkeypatch.setattr(bot, "ProfileGuard", lambda telegram_bot: idle_guard(calls))
    with caplog.at_level(logging.WARNING):
        await bot._post_init(app)
        await until(lambda: len(calls) == 3)
    assert app.bot.token not in caplog.text
    assert "RuntimeError" in caplog.text
    await profile_guard.stop_guard(app)


def test_guard_intervals_are_source_constants():
    assert profile.FAST_CHECK_SECONDS == 15
    assert profile.PROFILE_CHECK_SECONDS == 60
    assert profile.FULL_SWEEP_SECONDS == 6 * 3600
    assert 0 < profile.FORCED_CHECK_MIN_GAP_SECONDS < profile.FAST_CHECK_SECONDS
    assert profile.GUARD_RESTART_SECONDS > 0


class _Stop(BaseException):
    """Escapes the tiers' `except Exception` to end one loop iteration."""


def record_sleeps(monkeypatch):
    slept = []

    async def sleep(seconds):
        slept.append(seconds)
        if seconds != 0.1:  # per-language pacing inside _languages
            raise _Stop

    monkeypatch.setattr(profile_guard.asyncio, "sleep", sleep)
    return slept


async def test_fast_tier_waits_min_gap_then_rest_of_interval(monkeypatch):
    guard = profile_guard.ProfileGuard(fake_bot())
    guard._fast = AsyncMock(return_value=[])
    paused = []

    async def pause(seconds):
        paused.append(seconds)
        raise _Stop

    guard._pause = pause
    slept = []

    async def sleep(seconds):
        slept.append(seconds)

    monkeypatch.setattr(profile_guard.asyncio, "sleep", sleep)
    with pytest.raises(_Stop):
        await guard.run_fast()
    guard._fast.assert_awaited_once()
    assert slept == [profile.FORCED_CHECK_MIN_GAP_SECONDS]
    assert paused == [profile.FAST_CHECK_SECONDS - profile.FORCED_CHECK_MIN_GAP_SECONDS]


async def test_profile_tier_checks_primary_and_failed_languages_every_minute(monkeypatch):
    guard = profile_guard.ProfileGuard(fake_bot())
    guard._retry_languages = {"de"}
    guard._languages = AsyncMock(return_value=[])
    slept = record_sleeps(monkeypatch)
    with pytest.raises(_Stop):
        await guard.run_profile()
    guard._languages.assert_awaited_once_with(("", "uk", "en", "de"))
    assert slept == [profile.PROFILE_CHECK_SECONDS]


async def test_full_sweep_covers_other_languages_every_six_hours(monkeypatch):
    guard = profile_guard.ProfileGuard(fake_bot())
    seen = []

    async def languages(langs):
        seen.extend(langs)
        return []

    guard._languages = languages
    slept = record_sleeps(monkeypatch)
    with pytest.raises(_Stop):
        await guard.run_full_sweep()
    assert slept == [profile.FULL_SWEEP_SECONDS]
    assert set(seen) == set(profile.PROFILE_LANGUAGES) - {"", "uk", "en"}


async def test_fast_tier_is_read_only_when_nothing_changed():
    telegram_bot = fake_bot()
    telegram_bot.get_chat_menu_button.return_value = SimpleNamespace(type="commands")
    telegram_bot.get_webhook_info.return_value = SimpleNamespace(url="")
    telegram_bot.get_my_default_administrator_rights.return_value = SimpleNamespace(
        to_dict=lambda: {"can_delete_messages": False})
    telegram_bot.get_user_profile_photos.return_value = SimpleNamespace(
        photos=[[SimpleNamespace(file_unique_id="ours")]])
    guard = profile_guard.ProfileGuard(telegram_bot)
    guard._photo_fingerprint = ("ours",)
    assert await guard._fast() == []
    for name in ("set_my_name", "set_my_description", "set_my_short_description",
                 "set_my_commands", "delete_my_commands", "set_chat_menu_button",
                 "delete_webhook", "set_my_default_administrator_rights"):
        getattr(telegram_bot, name).assert_not_awaited()
    telegram_bot.get_my_name.assert_not_awaited()


async def test_rejected_photo_upload_is_not_retried_every_fast_tick(caplog):
    telegram_bot = fake_bot()
    guard = profile_guard.ProfileGuard(telegram_bot)
    guard._photo = AsyncMock(side_effect=RuntimeError(telegram_bot.token))
    with caplog.at_level(logging.WARNING):
        assert "webhook" in await guard._fast()
        await guard._fast()
    guard._photo.assert_awaited_once()
    assert telegram_bot.get_webhook_info.await_count == 2
    assert telegram_bot.token not in caplog.text


async def test_full_sweep_never_blocks_the_fast_check(monkeypatch):
    monkeypatch.setattr(profile, "FAST_CHECK_SECONDS", 0.01)
    monkeypatch.setattr(profile, "FORCED_CHECK_MIN_GAP_SECONDS", 0)
    guard = profile_guard.ProfileGuard(fake_bot())
    guard._fast = AsyncMock(return_value=[])
    sweep_started = asyncio.Event()

    async def endless_sweep(langs):
        sweep_started.set()
        await asyncio.Event().wait()

    guard._languages = endless_sweep
    app = SimpleNamespace(bot=guard.bot, bot_data={})
    tasks = profile_guard.start_guard(app, guard)
    await asyncio.wait_for(sweep_started.wait(), 1)
    await until(lambda: guard._fast.await_count >= 3)
    assert not tasks["full_sweep"].done()
    await profile_guard.stop_guard(app)
    assert all(task.cancelled() for task in tasks.values())


async def test_poke_forces_an_immediate_fast_check(monkeypatch):
    monkeypatch.setattr(profile, "FAST_CHECK_SECONDS", 3600)
    monkeypatch.setattr(profile, "FORCED_CHECK_MIN_GAP_SECONDS", 0)
    guard = profile_guard.ProfileGuard(fake_bot())
    guard._fast = AsyncMock(return_value=["webhook"])
    task = asyncio.create_task(guard.run_fast())
    await until(lambda: guard._fast.await_count == 1)
    await asyncio.sleep(0.02)
    assert guard._fast.await_count == 1  # waiting on the hour-long interval
    guard.poke()
    await until(lambda: guard._fast.await_count == 2)
    task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await task


async def test_getupdates_conflict_forces_guard_check_without_logging_token(caplog):
    from telegram.error import Conflict
    guard = SimpleNamespace(poke=Mock())
    token = fake_bot().token
    context = SimpleNamespace(error=Conflict(f"terminated by other getUpdates {token}"),
                              bot_data={"profile_guard": guard})
    with caplog.at_level(logging.WARNING):
        await bot.error_handler(None, context)
    guard.poke.assert_called_once_with()
    assert "possible foreign webhook/poller; forcing guard check" in caplog.text
    assert token not in caplog.text
    # Before the guard starts (or after it stops) the handler must not fail.
    await bot.error_handler(None, SimpleNamespace(error=Conflict("x"), bot_data={}))


async def test_watchdog_restarts_a_crashed_tier(monkeypatch, caplog):
    monkeypatch.setattr(profile, "GUARD_RESTART_SECONDS", 0.01)
    guard = idle_guard()
    runs = []
    token = fake_bot().token

    async def crashing_fast():
        runs.append(1)
        if len(runs) == 1:
            raise RuntimeError(token)
        await asyncio.Event().wait()

    guard.run_fast = crashing_fast
    app = SimpleNamespace(bot=fake_bot(), bot_data={})
    with caplog.at_level(logging.ERROR):
        tasks = profile_guard.start_guard(app, guard)
        first = tasks["fast"]
        await until(lambda: len(runs) == 2)
    assert tasks["fast"] is not first and not tasks["fast"].done()
    assert "fast tier stopped (RuntimeError); restarting" in caplog.text
    assert token not in caplog.text
    await profile_guard.stop_guard(app)
    assert all(task.cancelled() for task in tasks.values())


async def test_watchdog_does_not_restart_during_shutdown(monkeypatch, caplog):
    monkeypatch.setattr(profile, "GUARD_RESTART_SECONDS", 0)
    guard = idle_guard()
    runs = []

    async def crashes_when_cancelled():
        runs.append(1)
        try:
            await asyncio.Event().wait()
        except asyncio.CancelledError:
            raise RuntimeError("crash during shutdown")

    guard.run_fast = crashes_when_cancelled
    app = SimpleNamespace(bot=fake_bot(), bot_data={})
    tasks = profile_guard.start_guard(app, guard)
    await until(lambda: len(runs) == 1)
    with caplog.at_level(logging.ERROR):
        await profile_guard.stop_guard(app)
        await asyncio.sleep(0.02)
    assert len(runs) == 1
    assert "restarting" not in caplog.text
    assert profile_guard.TASKS_KEY not in app.bot_data
    assert all(task.done() for task in tasks.values())


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
