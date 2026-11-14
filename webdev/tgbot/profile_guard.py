"""Restore the code-owned Ukrainian Telegram profile without logging secrets.

This is drift repair, not an access-control boundary: BotFather owners and
anyone holding the bot token can still change Telegram's copy of the profile.
No user messages are sent by this module.
"""

import asyncio
import json
import time

import httpx
from telegram import (
    BotCommand, BotCommandScopeAllChatAdministrators,
    BotCommandScopeAllGroupChats, BotCommandScopeAllPrivateChats,
    MenuButtonCommands,
)

import bot_profile as profile
from config import logger


def command_list():
    return [BotCommand(command, description) for command, description in profile.COMMANDS]


PRIMARY_LANGUAGES = ("", "uk", "en")
TIERS = ("fast", "profile", "full_sweep")
TASKS_KEY = "profile_guard_tasks"


class ProfileGuard:
    def __init__(self, bot):
        self.bot = bot
        self._photo_fingerprint = None
        self._photo_retry_at = 0.0
        self._retry_languages = set()
        self._poked = asyncio.Event()

    def poke(self):
        """Request an immediate FAST check (webhook first)."""
        self._poked.set()

    async def _languages(self, languages):
        changes = []
        scopes = (None, BotCommandScopeAllPrivateChats(),
                  BotCommandScopeAllGroupChats(), BotCommandScopeAllChatAdministrators())
        for language in languages:
            failed = False
            # Only the fallback carries content. An empty dedicated value makes
            # Telegram display that fallback, including for uk/en clients.
            want = language == ""
            fields = (
                ("name", self.bot.get_my_name, self.bot.set_my_name,
                 profile.BOT_NAME if want else ""),
                ("description", self.bot.get_my_description, self.bot.set_my_description,
                 profile.DESCRIPTION if want else ""),
                ("short_description", self.bot.get_my_short_description,
                 self.bot.set_my_short_description, profile.SHORT_DESCRIPTION if want else ""),
            )
            for field, get, set_value, expected in fields:
                try:
                    current = await get(language_code=language)
                    if getattr(current, field) != expected:
                        await set_value(**{field: expected}, language_code=language)
                        changes.append(f"{field}[{language or 'default'}]")
                except Exception as exc:
                    failed = True
                    logger.warning("Profile field check failed: %s[%s] (%s)",
                                   field, language or "default", type(exc).__name__)
            for scope in scopes:
                try:
                    current = await self.bot.get_my_commands(scope=scope, language_code=language)
                    expected = command_list() if want and scope is None else []
                    if list(current) != expected:
                        if expected:
                            await self.bot.set_my_commands(expected, scope=scope, language_code=language)
                        else:
                            await self.bot.delete_my_commands(scope=scope, language_code=language)
                        changes.append(f"commands[{language or 'default'}]")
                except Exception as exc:
                    failed = True
                    logger.warning("Profile command check failed: [%s] (%s)",
                                   language or "default", type(exc).__name__)
            if failed:
                self._retry_languages.add(language)
            else:
                self._retry_languages.discard(language)
            # A full localization sweep must leave capacity for report delivery.
            await asyncio.sleep(0.1)
        return changes

    async def _fingerprint(self):
        photos = await self.bot.get_user_profile_photos(self.bot.id, limit=1)
        if not photos.photos:
            return ()
        return tuple(photo.file_unique_id for photo in photos.photos[0])

    async def _photo(self):
        if not profile.PHOTO_PATH.is_file():
            logger.warning("Profile photo asset missing; Telegram photo was not changed")
            return False
        current = await self._fingerprint()
        if self._photo_fingerprint is not None and current == self._photo_fingerprint:
            return False
        # PTB 21.7 predates Bot API 9.4's setMyProfilePhoto. Use the existing
        # httpx dependency and the official multipart API; never expose its URL
        # or response body in logs (the URL contains the bot token).
        async with httpx.AsyncClient(timeout=30, follow_redirects=False) as client:
            response = await client.post(
                f"https://api.telegram.org/bot{self.bot.token}/setMyProfilePhoto",
                data={"photo": json.dumps({"type": "static", "photo": "attach://avatar"})},
                files={"avatar": ("profile.jpg", profile.PHOTO_PATH.read_bytes(), "image/jpeg")},
            )
            if response.status_code != 200 or not response.json().get("ok"):
                raise RuntimeError("Telegram rejected profile photo")
        self._photo_fingerprint = await self._fingerprint()
        if not self._photo_fingerprint:
            raise RuntimeError("Telegram profile photo verification failed")
        return True

    @staticmethod
    def _report(changes):
        if changes:
            # Field names only, never the changed text, URLs or identities.
            logger.warning("Bot profile restored from source: %s", ", ".join(changes))

    async def _fast(self):
        changes = []
        # Webhook first: a foreign one steals /start deep-link tokens. One
        # failed setting must not prevent checking the others in this cycle.
        for section, operation in (("webhook", self._webhook), ("menu", self._menu),
                                   ("default_admin_rights", self._rights), ("photo", self._photo)):
            if section == "photo" and time.monotonic() < self._photo_retry_at:
                continue
            try:
                if await operation():
                    changes.append(section)
            except Exception as exc:
                if section == "photo":
                    # A rejected upload is a write; do not repeat it every FAST tick.
                    self._photo_retry_at = time.monotonic() + profile.PROFILE_CHECK_SECONDS
                logger.warning("Bot profile check failed: %s (%s)", section, type(exc).__name__)
        return changes

    async def enforce(self, *, languages=PRIMARY_LANGUAGES):
        """One complete pass over the given languages and every FAST setting."""
        changes = await self._languages(languages)
        changes += await self._fast()
        self._report(changes)
        return changes

    async def _menu(self):
        menu = await self.bot.get_chat_menu_button()
        if menu.type != "commands":
            await self.bot.set_chat_menu_button(menu_button=MenuButtonCommands())
            return True

    async def _webhook(self):
        webhook = await self.bot.get_webhook_info()
        if webhook.url:
            await self.bot.delete_webhook(drop_pending_updates=False)
            return True

    async def _rights(self):
        changed = False
        for channels in (False, True):
            rights = await self.bot.get_my_default_administrator_rights(for_channels=channels)
            if any(value is True for value in rights.to_dict().values()):
                await self.bot.set_my_default_administrator_rights(for_channels=channels)
                changed = True
        return changed

    async def _pause(self, seconds):
        """Sleep up to `seconds`; poke() wakes it early."""
        try:
            await asyncio.wait_for(self._poked.wait(), timeout=seconds)
        except asyncio.TimeoutError:
            pass

    async def run_fast(self):
        while True:
            # Clear before checking: a poke during the check forces another one.
            self._poked.clear()
            try:
                self._report(await self._fast())
            except Exception as exc:
                logger.warning("Bot profile fast check failed (%s); will retry", type(exc).__name__)
            await asyncio.sleep(profile.FORCED_CHECK_MIN_GAP_SECONDS)
            await self._pause(max(0, profile.FAST_CHECK_SECONDS
                                  - profile.FORCED_CHECK_MIN_GAP_SECONDS))

    async def run_profile(self):
        while True:
            try:
                self._report(await self._languages(tuple(dict.fromkeys(
                    (*PRIMARY_LANGUAGES, *sorted(self._retry_languages))))))
            except Exception as exc:
                logger.warning("Bot profile check failed (%s); will retry", type(exc).__name__)
            await asyncio.sleep(profile.PROFILE_CHECK_SECONDS)

    async def run_full_sweep(self):
        # Separate task: the ~190-language sweep takes minutes and must never
        # delay the FAST webhook check. Failed locales are retried by PROFILE.
        while True:
            try:
                self._report(await self._languages(
                    lang for lang in profile.PROFILE_LANGUAGES if lang not in PRIMARY_LANGUAGES))
                logger.info("Ukrainian bot profile localization sweep complete")
            except Exception as exc:
                logger.warning("Bot profile sweep failed (%s); will retry", type(exc).__name__)
            await asyncio.sleep(profile.FULL_SWEEP_SECONDS)


async def _delayed(seconds, factory):
    await asyncio.sleep(seconds)
    await factory()


def _spawn(app, guard, tasks, tier, delay=0):
    factory = getattr(guard, f"run_{tier}")
    coro = _delayed(delay, factory) if delay else factory()
    task = asyncio.create_task(coro, name=f"profile_guard_{tier}")
    tasks[tier] = task
    task.add_done_callback(lambda done: _watchdog(app, guard, tasks, tier, done))


def _watchdog(app, guard, tasks, tier, task):
    """Restart a guard tier that died; stay quiet on cancellation/shutdown."""
    if task.cancelled():
        return
    # Retrieve the exception first so asyncio never reports it as unretrieved.
    exc = task.exception()
    if app.bot_data.get(TASKS_KEY) is not tasks or tasks.get(tier) is not task:
        return  # stop_guard already ran, or this task was replaced
    logger.error("Bot profile guard %s tier stopped (%s); restarting",
                 tier, type(exc).__name__ if exc else "returned")
    _spawn(app, guard, tasks, tier, delay=profile.GUARD_RESTART_SECONDS)


def start_guard(app, guard):
    """Start every guard tier as its own watched task."""
    tasks = {}
    app.bot_data["profile_guard"] = guard
    app.bot_data[TASKS_KEY] = tasks
    for tier in TIERS:
        _spawn(app, guard, tasks, tier)
    return tasks


async def stop_guard(app):
    app.bot_data.pop("profile_guard", None)
    # Removing the dict first disables the watchdog before anything is cancelled.
    tasks = app.bot_data.pop(TASKS_KEY, None) or {}
    pending = list(tasks.values())
    for task in pending:
        task.cancel()
    # Shutdown must not fail because a tier crashed while being cancelled.
    await asyncio.gather(*pending, return_exceptions=True)
