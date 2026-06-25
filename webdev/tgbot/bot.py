"""
BizCheck Telegram Bot

Flow:
  1. User completes quiz on the website
  2. On the report page, clicks "Send report to Telegram"
  3. Website opens: t.me/BizCheckBot?start=<token>
  4. Telegram shows the bot — user presses START
  5. Bot receives /start <token>, fetches report from backend, sends PDF to user
"""

import os
import io
import re
import asyncio
import base64
import logging
import httpx
from dotenv import load_dotenv
from telegram import (
    Update, InlineKeyboardButton, InlineKeyboardMarkup,
    KeyboardButton, ReplyKeyboardMarkup, ReplyKeyboardRemove,
)
from telegram.error import Conflict, NetworkError, TimedOut
from telegram.ext import (
    Application, CommandHandler, CallbackQueryHandler, MessageHandler,
    ContextTypes, filters,
)

load_dotenv()

logging.basicConfig(
    format="%(asctime)s [%(levelname)s] %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)

BACKEND_URL = os.getenv("BACKEND_URL", "http://backend:4001")
BOT_TOKEN   = os.getenv("TELEGRAM_BOT_TOKEN", "")

_EMAIL_RE = re.compile(r'^[^@\s]{1,64}@[^@\s]{1,253}\.[^@\s]{1,63}$')
_PHONE_RE = re.compile(r'^\+?[\d\s\-()]{7,20}$')

# ---------------------------------------------------------------------------
# Bilingual strings
# ---------------------------------------------------------------------------

_STRINGS = {
    "uk": {
        "welcome": (
            "Доброго дня та ласкаво просимо до *Bizcheck.md* — інструмента діагностики "
            "компанії Crowe Turcan Mikhailenko.\n\n"
            "Щоб отримати ваш звіт тут, у Telegram:\n\n"
            "• Пройдіть опитувальник на Bizcheck.md\n"
            "• Наприкінці оберіть опцію *Надіслати в Telegram*\n"
            "• Поверніться сюди й натисніть *START* — звіт надійде автоматично\n\n"
            "З питань або щодо персональної пропозиції "
            "ви можете написати нам будь-коли на *office@crowe-tm.md*."
        ),
        "preparing": "Готуємо звіт, це триватиме кілька секунд…",
        "server_error": (
            "Наразі наш сервер не відповідає. Будь ласка, спробуйте ще раз за "
            "кілька секунд. Якщо проблема не зникає — напишіть нам на office@crowe-tm.md."
        ),
        "expired": (
            "Посилання застаріло або вже було використане.\n\n"
            "Поверніться на сторінку звіту та знову натисніть кнопку *Надіслати в Telegram*. "
            "Якщо виникнуть труднощі — ми допоможемо: office@crowe-tm.md."
        ),
        "server_fail": (
            "На жаль, сталася непередбачувана помилка. Спробуйте, будь ласка, ще раз. "
            "Для швидкої допомоги: office@crowe-tm.md."
        ),
        "report_header": "📊 *Звіт Bizcheck.md для {first_name} {last_name}*\n",
        "score_line": "Загальний бал: *{score}%*",
        "blocks_header": "*Оцінені блоки:*",
        "pdf_footer": "Нижче додаємо повний звіт у форматі PDF.",
        "pdf_caption": (
            "Звіт Bizcheck.md · Crowe Turcan Mikhailenko\n\n"
            "Наші фахівці зв’яжуться з вами найближчим часом для обговорення "
            "результатів. З додаткових питань або щодо персональної пропозиції — "
            "office@crowe-tm.md."
        ),
        "pdf_pending": (
            "PDF-звіт ще формується на сайті. Будь ласка, поверніться на сторінку "
            "звіту та знову натисніть *Надіслати в Telegram* — це триває кілька "
            "секунд після завершення тесту.\n\n"
            "Підтримка: office@crowe-tm.md."
        ),
        "zone_high": "Низький ризик",
        "zone_mid":  "Помірний ризик",
        "zone_warn": "Високий ризик",
        "zone_low":  "Критичний ризик",
        "actions_msg": "Ви також можете отримати звіт на email або залишити контакти для персональної пропозиції:",
        "email_button": "📧 Отримати звіт на email",
        "email_prompt": "Напишіть адресу email, на яку надіслати звіт:",
        "email_invalid": "Адреса email виглядає невірною. Спробуйте ще раз:",
        "email_sent": "✓ Ми надіслали звіт на {email}. Перевірте також теку «Спам».",
        "email_pending": "Звіт ще готується. Поверніться за кілька секунд і натисніть кнопку знову.",
        "email_expired": "Посилання застаріло. Поверніться на сторінку звіту та надішліть у Telegram ще раз.",
        "email_error": "Не вдалося надіслати лист зараз. Спробуйте пізніше або напишіть на office@bizcheck.md.",
        "lead_button": "📝 Залишити контактні дані",
        "lead_ask_email": "Напишіть вашу адресу email:",
        "lead_ask_phone": "Тепер напишіть номер телефону (напр.: +373 60 123 456):",
        "lead_invalid_email": "Адреса email виглядає невірною. Спробуйте ще раз:",
        "lead_invalid_phone": "Номер телефону виглядає невірним. Спробуйте ще раз (напр.: +373 60 123 456):",
        "lead_saved": "✓ Дякуємо! Ми зберегли дані й зв’яжемося з вами найближчим часом.",
        "lead_expired": "Посилання застаріло. Поверніться на сторінку звіту та надішліть у Telegram ще раз.",
        "lead_error": "Не вдалося зберегти дані зараз. Спробуйте пізніше або напишіть на office@bizcheck.md.",
        "phone_intro": (
            "📱 Щоб ми могли зв’язатися з вами напряму — навіть якщо у вас немає імені "
            "користувача в Telegram — поділіться номером телефону одним натисканням:"
        ),
        "phone_share_btn": "📱 Поділитися моїм номером",
        "phone_later_btn": "Пізніше",
        "phone_saved": "✓ Дякуємо! Ми зберегли номер телефону й зв’яжемося з вами найближчим часом.",
        "phone_later_ack": "Гаразд. Ви можете залишити контакти будь-коли за допомогою кнопок вище.",
        "phone_error": "Не вдалося зберегти номер зараз. Спробуйте пізніше або напишіть на office@bizcheck.md.",
    },
    "en": {
        "welcome": (
            "Hello and welcome to *Bizcheck.md* — the diagnostic tool "
            "by Crowe Turcan Mikhailenko.\n\n"
            "To receive your report right here in Telegram:\n\n"
            "• Complete the questionnaire on Bizcheck.md\n"
            "• At the last step, choose the *Send to Telegram* option\n"
            "• Come back here and press *START* — the report arrives automatically\n\n"
            "For questions or a personalised offer, "
            "you can write to us anytime at *office@crowe-tm.md*."
        ),
        "preparing": "Preparing your report, this will take a few seconds…",
        "server_error": (
            "Our server is not responding at the moment. Please try again in "
            "a few seconds. If the problem persists, write to us at office@crowe-tm.md."
        ),
        "expired": (
            "The access link has expired or has already been used.\n\n"
            "Go back to the report page and press the *Send to Telegram* button again. "
            "If you run into trouble, we can help at office@crowe-tm.md."
        ),
        "server_fail": (
            "Sorry, an unexpected error occurred. Please try again in a moment. "
            "For direct assistance: office@crowe-tm.md."
        ),
        "report_header": "📊 *Bizcheck.md report for {first_name} {last_name}*\n",
        "score_line": "Overall score: *{score}%*",
        "blocks_header": "*Assessed blocks:*",
        "pdf_footer": "We attach the full report in PDF format below.",
        "pdf_caption": (
            "Bizcheck.md report · Crowe Turcan Mikhailenko\n\n"
            "Our specialists will contact you shortly to discuss the results. "
            "For further questions or a personalised offer — "
            "office@crowe-tm.md."
        ),
        "pdf_pending": (
            "The PDF report is still being generated on the site. Please go back to the "
            "report page and press *Send to Telegram* again — it takes a few "
            "seconds after you finish the test.\n\n"
            "Support: office@crowe-tm.md."
        ),
        "zone_high": "Low risk",
        "zone_mid":  "Moderate risk",
        "zone_warn": "High risk",
        "zone_low":  "Critical risk",
        "actions_msg": "You can also receive the report by email or leave your contacts for a personalised offer:",
        "email_button": "📧 Receive the report by email",
        "email_prompt": "Write the email address where we should send the report:",
        "email_invalid": "The email address doesn’t look valid. Please try again:",
        "email_sent": "✓ We have sent the report to {email}. Please also check your Spam folder.",
        "email_pending": "The report is still being prepared. Come back in a few seconds and press the button again.",
        "email_expired": "The link has expired. Go back to the report page and resend to Telegram.",
        "email_error": "We couldn’t send the email right now. Try later or write to office@bizcheck.md.",
        "lead_button": "📝 Leave your contact details",
        "lead_ask_email": "Write your email address:",
        "lead_ask_phone": "Now write your phone number (e.g.: +373 60 123 456):",
        "lead_invalid_email": "The email address doesn’t look valid. Please try again:",
        "lead_invalid_phone": "The phone number doesn’t look valid. Please try again (e.g.: +373 60 123 456):",
        "lead_saved": "✓ Thank you! We have saved your details and will contact you shortly.",
        "lead_expired": "The link has expired. Go back to the report page and resend to Telegram.",
        "lead_error": "We couldn’t save your details right now. Try later or write to office@bizcheck.md.",
        "phone_intro": (
            "📱 So we can contact you directly — even if you don’t have a Telegram "
            "username — share your phone number with a single tap:"
        ),
        "phone_share_btn": "📱 Share my number",
        "phone_later_btn": "Later",
        "phone_saved": "✓ Thank you! We have saved your phone number and will contact you shortly.",
        "phone_later_ack": "Alright. You can leave your contacts anytime using the buttons above.",
        "phone_error": "We couldn’t save the number right now. Try later or write to office@bizcheck.md.",
    },
}


def _t(lang: str, key: str, **kwargs) -> str:
    """Get a translated string, falling back to 'uk'."""
    s = _STRINGS.get(lang, _STRINGS["uk"]).get(key, _STRINGS["uk"].get(key, key))
    return s.format(**kwargs) if kwargs else s


# ---------------------------------------------------------------------------
# /start  —  entry point for every user
# ---------------------------------------------------------------------------

async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    Called when user presses START in Telegram.
    If a token is present (came from the website deep-link), deliver the report.
    Otherwise show a welcome message with instructions.
    """
    if context.args:
        # Token passed via deep-link: t.me/BizCheckBot?start=<token>
        await _send_report(update, token=context.args[0].strip())
    else:
        # User opened the bot directly without a token — default to UK welcome
        await update.message.reply_text(
            _t("uk", "welcome"),
            parse_mode="Markdown",
        )


# ---------------------------------------------------------------------------
# Report delivery
# ---------------------------------------------------------------------------

async def _send_report(update: Update, token: str) -> None:
    """Fetch the report PDF from the backend and send it to the user."""
    chat    = update.effective_chat
    tg_user = update.effective_user

    # Use a neutral loading message first (we don't know the language yet)
    status_msg = await chat.send_message("⏳ ...")

    # 1. Fetch report data from backend
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(f"{BACKEND_URL}/api_crowe_bizcheck/tg/report/{token}")
    except httpx.RequestError as exc:
        logger.error("Backend unreachable: %s", exc)
        await status_msg.edit_text(_t("uk", "server_error"))
        return

    if resp.status_code == 404:
        await status_msg.edit_text(_t("uk", "expired"), parse_mode="Markdown")
        return

    if resp.status_code != 200:
        logger.error("Backend returned %s", resp.status_code)
        await status_msg.edit_text(_t("uk", "server_fail"))
        return

    data        = resp.json()
    lang        = data.get("language") or "uk"
    first_name  = data.get("first_name", "")
    last_name   = data.get("last_name", "")
    total_score = int(round(data.get("total_score") or 0))
    pdf_b64     = data.get("pdf_b64")

    # Update loading message now that we know the language
    await status_msg.edit_text(_t(lang, "preparing"))

    # 2. Build summary text
    zone_emoji, zone_label = _zone(total_score, lang)
    lines = [
        _t(lang, "report_header", first_name=first_name, last_name=last_name),
        _t(lang, "score_line", score=total_score),
        f"{zone_emoji} {zone_label}\n",
    ]

    block_scores = data.get("block_scores_json") or []
    if block_scores:
        lines.append(_t(lang, "blocks_header"))
        for b in block_scores:
            title = b.get("title", f"Block {b.get('order', '')}")
            lines.append(f"└ {title}")
        lines.append("")

    lines.append(_t(lang, "pdf_footer"))

    await status_msg.delete()
    await chat.send_message("\n".join(lines), parse_mode="Markdown")

    # 3. Send PDF file
    if pdf_b64:
        pdf_bytes        = base64.b64decode(pdf_b64)
        pdf_file         = io.BytesIO(pdf_bytes)
        pdf_file.name    = f"BizCheck_{first_name}_{last_name}.pdf"
        await chat.send_document(
            document=pdf_file,
            filename=pdf_file.name,
            caption=_t(lang, "pdf_caption"),
        )
    else:
        await chat.send_message(
            _t(lang, "pdf_pending"),
            parse_mode="Markdown",
        )

    # 4. Save Telegram contact info for follow-up
    if tg_user:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                await client.post(
                    f"{BACKEND_URL}/api_crowe_bizcheck/tg/contact/{token}",
                    json={
                        "tg_chat_id":    tg_user.id,
                        "tg_username":   tg_user.username   or "",
                        "tg_first_name": tg_user.first_name or "",
                        "tg_last_name":  tg_user.last_name  or "",
                    },
                )
        except Exception as exc:
            logger.warning("Could not save Telegram contact: %s", exc)

    # 5. One-tap "share my phone number" prompt. This is the convenient channel:
    #    the user taps once and Telegram sends their real phone — works even when
    #    they have no @username (so the team can still reach them by mobile).
    #    The token/lang live under ctok/clng so the request_contact button keeps
    #    working regardless of any email/lead inline flow the user may start.
    try:
        context.user_data["ctok"] = token
        context.user_data["clng"] = lang
        contact_kb = ReplyKeyboardMarkup(
            [
                [KeyboardButton(_t(lang, "phone_share_btn"), request_contact=True)],
                [KeyboardButton(_t(lang, "phone_later_btn"))],
            ],
            resize_keyboard=True,
            one_time_keyboard=True,
        )
        await chat.send_message(_t(lang, "phone_intro"), reply_markup=contact_kb)
    except Exception as exc:
        logger.warning("Could not send phone-share button: %s", exc)

    # 6. Two inline actions after the last message:
    #    (a) receive the report by email, (b) leave email + phone for sales.
    #    lang+token are encoded in callback_data so we don't persist them.
    try:
        kb = InlineKeyboardMarkup([
            [InlineKeyboardButton(_t(lang, "email_button"), callback_data=f"eml:{lang}:{token}")],
            [InlineKeyboardButton(_t(lang, "lead_button"),  callback_data=f"lead:{lang}:{token}")],
        ])
        await chat.send_message(_t(lang, "actions_msg"), reply_markup=kb)
    except Exception as exc:
        logger.warning("Could not send action buttons: %s", exc)


# ---------------------------------------------------------------------------
# Post-report inline flows (shared text handler keyed on context.user_data["flow"])
#   flow="email" → ask email → send the report by email (POST /tg/email)
#   flow="lead"  → ask email → ask phone → save contacts (POST /tg/lead)
# ---------------------------------------------------------------------------

def _start_flow(context, flow: str, lang: str, token: str) -> str:
    """Reset and arm a fresh inline flow. Returns the normalized language.

    Preserves the phone-share context (ctok/clng) so the request_contact reply
    keyboard offered after the report keeps working even mid-flow.
    """
    lng = lang if lang in ("uk", "en") else "uk"
    ctok = context.user_data.get("ctok")
    clng = context.user_data.get("clng")
    context.user_data.clear()
    if ctok:
        context.user_data["ctok"] = ctok
    if clng:
        context.user_data["clng"] = clng
    context.user_data.update({"flow": flow, "lng": lng, "tok": token, "step": "email"})
    return lng


async def on_email_button(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """User tapped 'receive the report by email'."""
    query = update.callback_query
    await query.answer()
    parts = (query.data or "").split(":", 2)   # ["eml", lang, token]
    if len(parts) != 3:
        return
    lng = _start_flow(context, "email", parts[1], parts[2])
    await query.message.reply_text(_t(lng, "email_prompt"))


async def on_lead_button(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """User tapped 'leave your contacts' (email + phone, for sales)."""
    query = update.callback_query
    await query.answer()
    parts = (query.data or "").split(":", 2)   # ["lead", lang, token]
    if len(parts) != 3:
        return
    lng = _start_flow(context, "lead", parts[1], parts[2])
    await query.message.reply_text(_t(lng, "lead_ask_email"))


async def on_contact(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """User tapped the one-tap 'share my phone number' reply-keyboard button.

    Telegram delivers their phone via a Contact object — save it (phone-only)
    through the same /tg/lead endpoint and remove the reply keyboard.
    """
    contact = update.message.contact if update.message else None
    token = context.user_data.get("ctok")
    lang = context.user_data.get("clng", "uk")
    if not contact or not token:
        return
    phone = (contact.phone_number or "").strip()
    if not phone:
        return

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(
                f"{BACKEND_URL}/api_crowe_bizcheck/tg/lead/{token}",
                json={"phone": phone},
            )
    except httpx.RequestError as exc:
        logger.warning("tg/lead (contact) backend unreachable: %s", exc)
        await update.message.reply_text(_t(lang, "phone_error"), reply_markup=ReplyKeyboardRemove())
        return

    if resp.status_code == 200:
        context.user_data.pop("ctok", None)
        await update.message.reply_text(_t(lang, "phone_saved"), reply_markup=ReplyKeyboardRemove())
    elif resp.status_code == 404:
        context.user_data.pop("ctok", None)
        await update.message.reply_text(_t(lang, "lead_expired"), reply_markup=ReplyKeyboardRemove())
    else:
        await update.message.reply_text(_t(lang, "phone_error"), reply_markup=ReplyKeyboardRemove())


async def on_text(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Plain-text handler. Acts only while an inline flow is armed."""
    text = (update.message.text or "").strip()

    # Dismiss the phone-share reply keyboard if the user chose "later".
    if text in (_STRINGS["uk"]["phone_later_btn"], _STRINGS["en"]["phone_later_btn"]):
        lng = context.user_data.get("clng", context.user_data.get("lng", "uk"))
        context.user_data.pop("ctok", None)
        await update.message.reply_text(_t(lng, "phone_later_ack"), reply_markup=ReplyKeyboardRemove())
        return

    flow = context.user_data.get("flow")
    if not flow:
        return
    lang = context.user_data.get("lng", "uk")
    token = context.user_data.get("tok")

    # ----- flow: receive report by email (single step) -----
    if flow == "email":
        if not _EMAIL_RE.match(text):
            await update.message.reply_text(_t(lang, "email_invalid"))
            return
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.post(
                    f"{BACKEND_URL}/api_crowe_bizcheck/tg/email/{token}",
                    json={"email": text},
                )
        except httpx.RequestError as exc:
            logger.warning("tg/email backend unreachable: %s", exc)
            await update.message.reply_text(_t(lang, "email_error"))
            return
        if resp.status_code == 200:
            context.user_data.clear()
            await update.message.reply_text(_t(lang, "email_sent", email=text))
        elif resp.status_code == 409:
            await update.message.reply_text(_t(lang, "email_pending"))
        elif resp.status_code == 404:
            context.user_data.clear()
            await update.message.reply_text(_t(lang, "email_expired"))
        else:
            await update.message.reply_text(_t(lang, "email_error"))
        return

    # ----- flow: leave contacts (email then phone) -----
    if context.user_data.get("step") == "email":
        if not _EMAIL_RE.match(text):
            await update.message.reply_text(_t(lang, "lead_invalid_email"))
            return
        context.user_data["eml"] = text
        context.user_data["step"] = "phone"
        await update.message.reply_text(_t(lang, "lead_ask_phone"))
        return

    # step == "phone"
    if not _PHONE_RE.match(text):
        await update.message.reply_text(_t(lang, "lead_invalid_phone"))
        return
    email = context.user_data.get("eml", "")
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(
                f"{BACKEND_URL}/api_crowe_bizcheck/tg/lead/{token}",
                json={"email": email, "phone": text},
            )
    except httpx.RequestError as exc:
        logger.warning("tg/lead backend unreachable: %s", exc)
        await update.message.reply_text(_t(lang, "lead_error"))
        return
    if resp.status_code == 200:
        context.user_data.clear()
        await update.message.reply_text(_t(lang, "lead_saved"))
    elif resp.status_code == 404:
        context.user_data.clear()
        await update.message.reply_text(_t(lang, "lead_expired"))
    else:
        await update.message.reply_text(_t(lang, "lead_error"))


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _zone(score: int, lang: str = "uk") -> tuple[str, str]:
    if score >= 80:
        return "🟢", _t(lang, "zone_high")
    if score >= 70:
        return "🟡", _t(lang, "zone_mid")
    if score >= 65:
        return "🟠", _t(lang, "zone_warn")
    return "🔴", _t(lang, "zone_low")


def _bar(score: int) -> str:
    """5-cell emoji progress bar."""
    filled = round(score / 20)   # 0-5 cells
    if score >= 80:
        char = "🟢"
    elif score >= 70:
        char = "🟡"
    elif score >= 65:
        char = "🟠"
    else:
        char = "🔴"
    return char * filled + "⬜" * (5 - filled)


# ---------------------------------------------------------------------------
# Entry point
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


def main() -> None:
    if not BOT_TOKEN:
        raise RuntimeError("TELEGRAM_BOT_TOKEN is not set")

    app = Application.builder().token(BOT_TOKEN).build()
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
