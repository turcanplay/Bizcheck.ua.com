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


# --- Branding / contact -----------------------------------------------------
# Single source of truth for the public brand + support address. Every string in
# strings.py interpolates {site} / {contact} instead of hardcoding them, so the
# UA launch only has to change these two values (or the env vars).
# TODO: confirmă contactul pentru piața UA — the address below is the one
# inherited from the MD launch and has NOT been confirmed for bizcheck.ua.com.
SITE_NAME     = os.getenv("SITE_NAME", "Bizcheck.ua.com")
CONTACT_EMAIL = os.getenv("CONTACT_EMAIL", "office@bizcheck.md")


# --- Backend retry policy ---------------------------------------------------
# Transient failures (connect/read timeouts, 5xx) are retried with an
# exponential backoff + jitter. 4xx are NOT retried: 403/404 are legitimate
# answers ("expired link", "wrong token") and retrying only delays the message.
RETRY_ATTEMPTS   = 3      # total attempts, i.e. 1 try + 2 retries
RETRY_BASE_DELAY = 0.5    # seconds; doubles each retry (0.5 → 1.0 → 2.0)
RETRY_MAX_DELAY  = 2.0
RETRY_JITTER     = 0.25   # ± fraction of the delay, to de-synchronise retries


# --- Supported UI languages -------------------------------------------------
LANGUAGES    = ("uk", "en")
DEFAULT_LANG = "uk"


# --- Input validation -------------------------------------------------------
EMAIL_RE = re.compile(r'^[^@\s]{1,64}@[^@\s]{1,253}\.[^@\s]{1,63}$')
PHONE_RE = re.compile(r'^\+?[\d\s\-()]{7,20}$')
