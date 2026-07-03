"""
Configuration and shared constants for the BizCheck Telegram bot.

Loads environment, sets up logging, and exposes the values every other
module needs (backend URL, bot token, shared-secret headers, input regexes).
"""

import os
import re
import logging

from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    format="%(asctime)s [%(levelname)s] %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger("bizcheck-bot")

# --- Environment ------------------------------------------------------------
BACKEND_URL = os.getenv("BACKEND_URL", "http://backend:4001")
BOT_TOKEN   = os.getenv("TELEGRAM_BOT_TOKEN", "")
# Shared secret for the bot-only feedback endpoints. Must match BOT_SHARED_SECRET
# on the backend. When empty, the backend allows the calls ungated (dev only).
BOT_SHARED_SECRET = os.getenv("BOT_SHARED_SECRET", "")

# Common prefix for every backend endpoint the bot talks to.
API_PREFIX = "/api_crowe_bizcheck/tg"


def bot_headers() -> dict:
    """Auth header for the bot-only backend endpoints (empty when ungated)."""
    return {"X-Bot-Secret": BOT_SHARED_SECRET} if BOT_SHARED_SECRET else {}


# --- Input validation -------------------------------------------------------
EMAIL_RE = re.compile(r'^[^@\s]{1,64}@[^@\s]{1,253}\.[^@\s]{1,63}$')
PHONE_RE = re.compile(r'^\+?[\d\s\-()]{7,20}$')
