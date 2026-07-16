"""
Feedback question — shared logic for the manual (admin bulk-send) and the
automatic (scheduled, 1h-after-delivery) flows.

Single source of truth for: the editable bilingual prompt, the "answer in one
message" hint we append, sending the question, scheduling an auto follow-up, and
the background scheduler that fires due auto rows.

Config (all in site_settings, admin-editable):
    feedback_prompt_uk / feedback_prompt_en   the question text
    feedback_auto_enabled                      "1"/"0" — send automatically after delivery
    feedback_auto_delay_min                    minutes to wait (default 60)
"""
import logging
import os
import sys
import threading
import time
import uuid

from models.site_settings import SiteSettings
from models.tg_outreach import TgOutreach
from services.telegram_send import send_message

log = logging.getLogger(__name__)

PROMPT_KEYS = {"uk": "feedback_prompt_uk", "en": "feedback_prompt_en"}
AUTO_ENABLED_KEY = "feedback_auto_enabled"
AUTO_DELAY_KEY = "feedback_auto_delay_min"

DEFAULT_DELAY_MIN = 60
MIN_DELAY_MIN = 1
MAX_DELAY_MIN = 10080  # 7 days

DEFAULT_PROMPT = {
    "en": (
        "Hi! \n"
        "You took BizCheck — and we'd like to ask you about one thing.\n"
        "Complete two sentences in your own words:\n\n"
        "1️⃣ \"For me, BizCheck is...\"\n"
        "2️⃣ \"When I saw the result, I felt...\"\n\n"
        "Write right here — in any words, just as they are. Even a single word is "
        "already valuable and very important to us in making our products better."
    ),
    "uk": (
        "Вітаємо! \n"
        "Ви проходили BizCheck — і ми хотіли б запитати про одне.\n"
        "Продовжіть дві фрази своїми словами:\n\n"
        "1️⃣ «Для мене BizCheck — це...»\n"
        "2️⃣ «Коли я побачив(ла) результат, я відчув(ла)...»\n\n"
        "Напишіть прямо тут — будь-якими словами, як є. Навіть одне слово — уже "
        "цінно й дуже важливо для нас, щоб робити наші продукти кращими."
    ),
}

# Appended to every sent question: we only capture the FIRST reply, so we ask the
# person to put their whole answer in a single message.
REPLY_HINT = {
    "uk": "📩 Будь ласка, напишіть усю відповідь одним повідомленням.",
    "en": "📩 Please write your entire answer in a single message.",
}

THANKS = {
    "uk": "Щиро дякуємо! Ваш відгук дуже допомагає нам. 🙏",
    "en": "Thank you so much! Your feedback really helps us. 🙏",
}


def norm_lang(v):
    return v if v in ("uk", "en") else "en"


def get_prompt(lang):
    lang = norm_lang(lang)
    return SiteSettings.get(PROMPT_KEYS[lang], "") or DEFAULT_PROMPT[lang]


def compose_message(lang):
    """The full text we actually send: editable prompt + the one-message hint."""
    lang = norm_lang(lang)
    return f"{get_prompt(lang)}\n\n{REPLY_HINT[lang]}"


def auto_enabled():
    return SiteSettings.get(AUTO_ENABLED_KEY, "0") == "1"


def auto_delay_min():
    try:
        n = int(SiteSettings.get(AUTO_DELAY_KEY, str(DEFAULT_DELAY_MIN)))
    except (TypeError, ValueError):
        n = DEFAULT_DELAY_MIN
    return max(MIN_DELAY_MIN, min(MAX_DELAY_MIN, n))


def send_question(chat_id, lang):
    """Send the composed question to a chat_id. Returns (ok, error, text)."""
    text = compose_message(lang)
    ok, err = send_message(chat_id, text)
    return ok, err, text


# ---------------------------------------------------------------------------
# Automatic scheduling — called when a report is delivered in Telegram
# ---------------------------------------------------------------------------

def maybe_schedule_auto(chat_id, lang):
    """If auto-feedback is enabled, schedule a one-time question for this chat_id,
    due `delay` minutes from now. No-op if disabled, no chat_id, or already
    scheduled/sent for this chat (so a re-delivery never double-asks)."""
    if not auto_enabled() or not chat_id:
        return
    try:
        if TgOutreach.has_auto_for_chat(chat_id):
            return
        TgOutreach.create(
            mode="auto", username=None, tg_chat_id=chat_id, lang=norm_lang(lang),
            token=uuid.uuid4().hex, status="scheduled", due_at_minutes=auto_delay_min(),
        )
    except Exception as exc:
        log.warning("[feedback] could not schedule auto for chat %s: %s", chat_id, exc)


# ---------------------------------------------------------------------------
# Background scheduler — fires due auto rows
# ---------------------------------------------------------------------------

def run_due_once(limit=50):
    """Claim and send all currently-due scheduled rows (atomic per-row claim so
    concurrent gunicorn workers never double-send). Returns number sent."""
    sent = 0
    for _ in range(limit):
        row = TgOutreach.claim_due()
        if not row:
            break
        chat_id = row.get("tg_chat_id")
        lang = norm_lang(row.get("lang"))
        if not chat_id:
            TgOutreach.mark_failed(row["id"], "no chat_id")
            continue
        ok, err, text = send_question(chat_id, lang)
        if ok:
            TgOutreach.mark_sent(row["id"], chat_id, text)
            sent += 1
        else:
            TgOutreach.mark_failed(row["id"], err)
        # Stay under Telegram's ~30 msg/s global cap when flushing a backlog.
        # send_question already backs off on 429; this keeps us from getting there.
        time.sleep(0.1)
    return sent


_started = False


def start_scheduler(interval_sec=120):
    """Start the background loop once per process. Skipped under pytest and when
    FEEDBACK_SCHEDULER=0. Safe with multiple gunicorn workers (atomic claim)."""
    global _started
    if _started:
        return
    if "pytest" in sys.modules:
        return
    if os.getenv("FEEDBACK_SCHEDULER", "1") != "1":
        return
    _started = True

    def _loop():
        # Small stagger so 4 workers don't all poll on the same tick.
        time.sleep(5)
        while True:
            try:
                run_due_once()
            except Exception as exc:
                log.warning("[feedback] scheduler tick failed: %s", exc)
            time.sleep(interval_sec)

    threading.Thread(target=_loop, daemon=True, name="feedback-scheduler").start()
    log.info("[feedback] auto-scheduler started")
