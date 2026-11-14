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


class ProfileGuard:
    def __init__(self, bot):
        self.bot = bot
        self._photo_fingerprint = None
        self._retry_languages = set()

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

    async def enforce(self, *, languages=("", "uk", "en")):
        changes = await self._languages(languages)
        # A failed locale or one failed setting must not prevent checking the
        # webhook, menu, administrator rights or avatar in the same cycle.
        for section, operation in (("menu", self._menu), ("webhook", self._webhook),
                                   ("default_admin_rights", self._rights), ("photo", self._photo)):
            try:
                if await operation():
                    changes.append(section)
            except Exception as exc:
                logger.warning("Bot profile check failed: %s (%s)", section, type(exc).__name__)
        if changes:
            # Field names only, never the changed text, URLs or identities.
            logger.warning("Bot profile restored from source: %s", ", ".join(changes))
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

    async def run(self):
        last_full = None
        while True:
            full = last_full is None or time.monotonic() - last_full >= profile.FULL_SWEEP_SECONDS
            try:
                # Restore the public fallback first; sweep stale localizations
                # in the background while the bot continues handling reports.
                await self.enforce(languages=tuple(dict.fromkeys(
                    ("", "uk", "en", *sorted(self._retry_languages)))))
                if full:
                    await self._languages(lang for lang in profile.PROFILE_LANGUAGES
                                          if lang not in ("", "uk", "en"))
                    last_full = time.monotonic()
                    logger.info("Ukrainian bot profile localization sweep complete")
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                logger.warning("Bot profile check failed (%s); will retry", type(exc).__name__)
            await asyncio.sleep(profile.CHECK_SECONDS)


async def stop_guard(app):
    task = app.bot_data.pop("profile_guard_task", None)
    if task:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass
