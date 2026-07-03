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
  strings.py   bilingual copy (_STRINGS) + _t()
  backend.py   async httpx calls to the backend /tg/* endpoints
  helpers.py   score-zone / progress-bar formatters
  handlers.py  Telegram update handlers
  bot.py       (this file) handler wiring + entry point
"""

import asyncio

from telegram import Update
from telegram.error import Conflict, NetworkError, TimedOut
from telegram.ext import (
    Application, AIORateLimiter, CommandHandler, CallbackQueryHandler,
    MessageHandler, ContextTypes, filters,
)

from config import logger, BOT_TOKEN
from handlers import (
    cmd_start, on_email_button, on_lead_button, on_contact, on_text,
)


# ---------------------------------------------------------------------------
# Error handling
# ---------------------------------------------------------------------------

async def error_handler(update: object, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Global error handler — keep logs clean and survive transient issues."""
    err = context.error

    if isinstance(err, Conflict):
        logger.warning(
            "Telegram getUpdates conflict — another instance is polling with the same token. "
            "Backing off 15s. Make sure no other bot process / webhook is active."
        )
        await asyncio.sleep(15)
        return

    if isinstance(err, (NetworkError, TimedOut)):
        logger.warning("Transient network issue: %s", err)
        return

    logger.exception("Unhandled error in bot: %s", err)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    if not BOT_TOKEN:
        raise RuntimeError("TELEGRAM_BOT_TOKEN is not set")

    # AIORateLimiter transparently obeys Telegram's flood limits (429 /
    # retry_after): under a burst of START deliveries the bot queues and
    # retries instead of dropping messages after the first ~30.
    app = (
        Application.builder()
        .token(BOT_TOKEN)
        .rate_limiter(AIORateLimiter(max_retries=3))
        .build()
    )
    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CallbackQueryHandler(on_email_button, pattern=r"^eml:"))
    app.add_handler(CallbackQueryHandler(on_lead_button, pattern=r"^lead:"))
    app.add_handler(MessageHandler(filters.CONTACT, on_contact))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, on_text))
    app.add_error_handler(error_handler)

    logger.info("BizCheck Bot started (polling)")
    app.run_polling(
        drop_pending_updates=True,
        allowed_updates=Update.ALL_TYPES,
        poll_interval=1.5,
        timeout=30,
    )


if __name__ == "__main__":
    main()
