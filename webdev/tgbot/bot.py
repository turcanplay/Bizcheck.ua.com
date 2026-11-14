"""
BizCheck Telegram Bot — web-flow report delivery.

Flow:
  1. User completes quiz on the website
  2. On the report page, clicks "Send report to Telegram"
  3. Website opens: t.me/BizCheckBot?start=<token>
  4. Telegram shows the bot — user presses START
  5. Bot receives /start <token>, fetches report from backend, sends PDF

Package layout:
  config.py    env, logging, bot-secret headers, input regexes
  strings.py   Ukrainian copy (_STRINGS) + _t()
  bot_profile.py / profile_guard.py  source-owned identity and drift repair
  backend.py   async httpx calls to the backend /tg/* endpoints
  helpers.py   score-zone / progress-bar formatters
  handlers.py  Telegram update handlers
  bot.py       (this file) handler wiring + entry point
"""

from telegram import Update
from telegram.error import Conflict, NetworkError, TimedOut
from telegram.ext import (
    Application, AIORateLimiter, CommandHandler, CallbackQueryHandler,
    MessageHandler, ContextTypes, filters,
)

from config import logger, BOT_TOKEN, BOT_USERNAME, BOT_SHARED_SECRET
from bot_profile import REFERENCE_BOT_USERNAME
from profile_guard import ProfileGuard, command_list, start_guard, stop_guard
from handlers import (
    cmd_start, cmd_help, on_email_button, on_lead_button, on_contact, on_text,
)


# ---------------------------------------------------------------------------
# Command menu (the "Menu" button in every Telegram client)
# ---------------------------------------------------------------------------

# Only commands that actually have a handler below. Do not advertise anything
# else — a menu entry that does nothing is worse than no menu.
def _command_list(lang: str = "uk") -> list:
    return command_list()


async def _post_init(app: Application) -> None:
    """Publish Ukrainian commands and start code-owned profile restoration."""
    actual = app.bot.username.casefold()
    if (not BOT_USERNAME or actual != BOT_USERNAME.casefold()
            or actual == REFERENCE_BOT_USERNAME.casefold()):
        raise RuntimeError("Telegram bot identity mismatch; profile was not changed")
    try:
        await app.bot.set_my_commands(command_list())
        logger.info("Bot command menu published (uk)")
    except Exception as exc:
        # Never let a menu hiccup stop the bot from polling.
        logger.warning("Could not publish the command menu (%s)", type(exc).__name__)
    start_guard(app, ProfileGuard(app.bot))


# ---------------------------------------------------------------------------
# Error handling
# ---------------------------------------------------------------------------

async def error_handler(update: object, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Global error handler — keep logs clean and survive transient issues."""
    err = context.error

    if isinstance(err, Conflict):
        # A foreign webhook or poller using our token. PTB's polling loop
        # already backs off (up to 30s); the guard enforces a minimum gap
        # between forced checks, so repeated conflicts cannot hammer the API.
        logger.warning("getUpdates conflict — possible foreign webhook/poller; forcing guard check")
        guard = context.bot_data.get("profile_guard")
        if guard is not None:
            guard.poke()
        return

    if isinstance(err, (NetworkError, TimedOut)):
        logger.warning("Transient network issue (%s)", type(err).__name__)
        return

    logger.error("Unhandled error in bot (%s)", type(err).__name__)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    if not BOT_TOKEN:
        raise RuntimeError("TELEGRAM_BOT_TOKEN is not set")
    if not BOT_SHARED_SECRET:
        raise RuntimeError("BOT_SHARED_SECRET is not set")
    if not BOT_USERNAME:
        raise RuntimeError("TELEGRAM_BOT_USERNAME is not set")

    # AIORateLimiter transparently obeys Telegram's flood limits (429 /
    # retry_after): under a burst of START deliveries the bot queues and
    # retries instead of dropping messages after the first ~30.
    app = (
        Application.builder()
        .token(BOT_TOKEN)
        .rate_limiter(AIORateLimiter(max_retries=3))
        .post_init(_post_init)
        .post_stop(stop_guard)
        .build()
    )
    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CommandHandler("help", cmd_help))
    app.add_handler(CallbackQueryHandler(on_email_button, pattern=r"^eml:"))
    app.add_handler(CallbackQueryHandler(on_lead_button, pattern=r"^lead:"))
    app.add_handler(MessageHandler(filters.CONTACT, on_contact))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, on_text))
    app.add_error_handler(error_handler)

    logger.info("BizCheck Bot started (polling)")
    app.run_polling(
        drop_pending_updates=False,
        allowed_updates=[Update.MESSAGE, Update.CALLBACK_QUERY],
        poll_interval=1.5,
        timeout=30,
    )


if __name__ == "__main__":
    main()
