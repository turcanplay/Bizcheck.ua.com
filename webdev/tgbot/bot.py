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
    Application, AIORateLimiter, CommandHandler, CallbackQueryHandler,
    MessageHandler, ContextTypes, filters,
)

load_dotenv()

logging.basicConfig(
    format="%(asctime)s [%(levelname)s] %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)

BACKEND_URL = os.getenv("BACKEND_URL", "http://backend:4001")
BOT_TOKEN   = os.getenv("TELEGRAM_BOT_TOKEN", "")
# Shared secret for the bot-only feedback endpoints. Must match BOT_SHARED_SECRET
# on the backend. When empty, the backend allows the calls ungated (dev only).
BOT_SHARED_SECRET = os.getenv("BOT_SHARED_SECRET", "")


def _bot_headers() -> dict:
    return {"X-Bot-Secret": BOT_SHARED_SECRET} if BOT_SHARED_SECRET else {}

_EMAIL_RE = re.compile(r'^[^@\s]{1,64}@[^@\s]{1,253}\.[^@\s]{1,63}$')
_PHONE_RE = re.compile(r'^\+?[\d\s\-()]{7,20}$')

# ---------------------------------------------------------------------------
# Bilingual strings
# ---------------------------------------------------------------------------

_STRINGS = {
    "ro": {
        "welcome": (
            "Bună ziua și bine ați venit la *Bizcheck.md* — instrumentul de evaluare "
            "al companiei Crowe Turcan Mikhailenko.\n\n"
            "Pentru a primi raportul dumneavoastră aici, în Telegram:\n\n"
            "• Completați chestionarul pe Bizcheck.md\n"
            "• La final, alegeți opțiunea *Trimite în Telegram*\n"
            "• Reveniți aici și apăsați *START* — raportul ajunge automat\n\n"
            "Pentru întrebări sau pentru o ofertă personalizată, "
            "ne puteți scrie oricând la *office@crowe-tm.md*."
        ),
        "preparing": "Pregătim raportul, durează câteva secunde…",
        "server_error": (
            "Momentan serverul nostru nu răspunde. Vă rugăm să încercați din nou peste "
            "câteva secunde. Dacă problema persistă, scrieți-ne la office@crowe-tm.md."
        ),
        "expired": (
            "Link-ul de acces a expirat sau a fost deja folosit.\n\n"
            "Reveniți la pagina raportului și apăsați din nou butonul *Trimite în Telegram*. "
            "Dacă întâmpinați probleme, vă putem ajuta la office@crowe-tm.md."
        ),
        "server_fail": (
            "Ne pare rău, a apărut o eroare neașteptată. Reîncercați în câteva clipe. "
            "Pentru asistență directă: office@crowe-tm.md."
        ),
        "report_header": "📊 *Raport Bizcheck.md pentru {first_name} {last_name}*\n",
        "score_line": "Scor general: *{score}%*",
        "blocks_header": "*Blocuri evaluate:*",
        "pdf_footer": "Atașăm mai jos raportul complet în format PDF.",
        "pdf_caption": (
            "Raport Bizcheck.md · Crowe Turcan Mikhailenko\n\n"
            "Specialiștii noștri vă vor contacta în cel mai scurt timp pentru a discuta "
            "rezultatele. Pentru întrebări suplimentare sau o ofertă personalizată — "
            "office@crowe-tm.md."
        ),
        "pdf_pending": (
            "Raportul PDF se generează încă pe site. Vă rugăm să reveniți la pagina "
            "raportului și să apăsați din nou *Trimite în Telegram* — durează câteva "
            "secunde după finalizarea testului.\n\n"
            "Pentru asistență: office@crowe-tm.md."
        ),
        "zone_high": "Risc scăzut",
        "zone_mid":  "Risc moderat",
        "zone_warn": "Risc ridicat",
        "zone_low":  "Risc critic",
        "actions_msg": "Mai puteți primi raportul pe email sau lăsa datele pentru o ofertă personalizată:",
        "email_button": "📧 Primește raportul pe email",
        "email_prompt": "Scrieți adresa de email unde să trimitem raportul:",
        "email_invalid": "Adresa de email nu pare validă. Mai încercați o dată:",
        "email_sent": "✓ Am trimis raportul pe {email}. Verificați și folderul Spam.",
        "email_pending": "Raportul încă se pregătește. Reveniți peste câteva secunde și apăsați din nou butonul.",
        "email_expired": "Link-ul a expirat. Reveniți la pagina raportului și retrimiteți în Telegram.",
        "email_error": "Nu am putut trimite emailul acum. Încercați mai târziu sau scrieți la office@bizcheck.md.",
        "lead_button": "📝 Lasă datele de contact",
        "lead_ask_email": "Scrieți adresa dvs. de email:",
        "lead_ask_phone": "Acum scrieți numărul de telefon (ex: +373 60 123 456):",
        "lead_invalid_email": "Adresa de email nu pare validă. Mai încercați o dată:",
        "lead_invalid_phone": "Numărul de telefon nu pare valid. Mai încercați (ex: +373 60 123 456):",
        "lead_saved": "✓ Vă mulțumim! Am salvat datele, vă vom contacta în curând.",
        "lead_expired": "Link-ul a expirat. Reveniți la pagina raportului și retrimiteți în Telegram.",
        "lead_error": "Nu am putut salva datele acum. Încercați mai târziu sau scrieți la office@bizcheck.md.",
        "phone_intro": (
            "📱 Pentru a vă putea contacta direct — chiar dacă nu aveți un nume de utilizator "
            "Telegram — partajați numărul de telefon cu o singură atingere:"
        ),
        "phone_share_btn": "📱 Partajează numărul meu",
        "phone_later_btn": "Mai târziu",
        "phone_saved": "✓ Vă mulțumim! Am salvat numărul de telefon, vă vom contacta în curând.",
        "phone_later_ack": "Bine. Puteți lăsa datele oricând folosind butoanele de mai sus.",
        "phone_error": "Nu am putut salva numărul acum. Încercați mai târziu sau scrieți la office@bizcheck.md.",
    },
    "ru": {
        "welcome": (
            "Здравствуйте! Добро пожаловать на *Bizcheck.md* — инструмент диагностики "
            "от Crowe Turcan Mikhailenko.\n\n"
            "Чтобы получить отчёт прямо здесь, в Telegram:\n\n"
            "• Пройдите тест на сайте Bizcheck.md\n"
            "• На последнем шаге выберите *Отправить в Telegram*\n"
            "• Вернитесь сюда и нажмите *START* — отчёт придёт автоматически\n\n"
            "По вопросам или для персонального предложения "
            "напишите нам в любое время: *office@crowe-tm.md*."
        ),
        "preparing": "Готовим ваш отчёт, это займёт несколько секунд…",
        "server_error": (
            "Сейчас наш сервер не отвечает. Пожалуйста, попробуйте ещё раз через "
            "несколько секунд. Если проблема не уходит — напишите нам на office@crowe-tm.md."
        ),
        "expired": (
            "Ссылка устарела или уже была использована.\n\n"
            "Вернитесь на страницу отчёта и снова нажмите *Отправить в Telegram*. "
            "Если возникнут трудности — мы поможем: office@crowe-tm.md."
        ),
        "server_fail": (
            "К сожалению, произошла непредвиденная ошибка. Попробуйте, пожалуйста, "
            "ещё раз. Для быстрой помощи: office@crowe-tm.md."
        ),
        "report_header": "📊 *Отчёт Bizcheck.md для {first_name} {last_name}*\n",
        "score_line": "Общий балл: *{score}%*",
        "blocks_header": "*Оценённые блоки:*",
        "pdf_footer": "Ниже прилагаем полный отчёт в формате PDF.",
        "pdf_caption": (
            "Отчёт Bizcheck.md · Crowe Turcan Mikhailenko\n\n"
            "Наши специалисты свяжутся с вами в ближайшее время для обсуждения "
            "результатов. По дополнительным вопросам или для персонального предложения — "
            "office@crowe-tm.md."
        ),
        "pdf_pending": (
            "PDF-отчёт ещё формируется на сайте. Пожалуйста, вернитесь на страницу "
            "отчёта и снова нажмите *Отправить в Telegram* — это занимает несколько "
            "секунд после завершения теста.\n\n"
            "Поддержка: office@crowe-tm.md."
        ),
        "zone_high": "Низкий риск",
        "zone_mid":  "Умеренный риск",
        "zone_warn": "Повышенный риск",
        "zone_low":  "Критический риск",
        "actions_msg": "Можете получить отчёт на почту или оставить контакты для персонального предложения:",
        "email_button": "📧 Получить отчёт на почту",
        "email_prompt": "Напишите адрес эл. почты, куда отправить отчёт:",
        "email_invalid": "Адрес эл. почты выглядит неверным. Попробуйте ещё раз:",
        "email_sent": "✓ Отчёт отправлен на {email}. Проверьте также папку Спам.",
        "email_pending": "Отчёт ещё готовится. Вернитесь через несколько секунд и нажмите кнопку снова.",
        "email_expired": "Ссылка устарела. Вернитесь на страницу отчёта и снова отправьте в Telegram.",
        "email_error": "Не удалось отправить письмо. Попробуйте позже или напишите на office@bizcheck.md.",
        "lead_button": "📝 Оставить контакты",
        "lead_ask_email": "Напишите ваш адрес эл. почты:",
        "lead_ask_phone": "Теперь напишите номер телефона (напр.: +373 60 123 456):",
        "lead_invalid_email": "Адрес эл. почты выглядит неверным. Попробуйте ещё раз:",
        "lead_invalid_phone": "Номер телефона выглядит неверным. Попробуйте ещё раз (напр.: +373 60 123 456):",
        "lead_saved": "✓ Спасибо! Мы сохранили данные и свяжемся с вами в ближайшее время.",
        "lead_expired": "Ссылка устарела. Вернитесь на страницу отчёта и снова отправьте в Telegram.",
        "lead_error": "Не удалось сохранить данные. Попробуйте позже или напишите на office@bizcheck.md.",
        "phone_intro": (
            "📱 Чтобы мы могли связаться с вами напрямую — даже если у вас нет имени "
            "пользователя в Telegram — поделитесь номером телефона одним нажатием:"
        ),
        "phone_share_btn": "📱 Поделиться номером",
        "phone_later_btn": "Позже",
        "phone_saved": "✓ Спасибо! Мы сохранили номер телефона и свяжемся с вами в ближайшее время.",
        "phone_later_ack": "Хорошо. Вы можете оставить контакты в любой момент с помощью кнопок выше.",
        "phone_error": "Не удалось сохранить номер. Попробуйте позже или напишите на office@bizcheck.md.",
    },
}


def _t(lang: str, key: str, **kwargs) -> str:
    """Get a translated string, falling back to 'ro'."""
    s = _STRINGS.get(lang, _STRINGS["ro"]).get(key, _STRINGS["ro"].get(key, key))
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
        arg = context.args[0].strip()
        # Feedback outreach deep-link: t.me/BizCheckBot?start=fb_<token>
        if arg.startswith("fb_"):
            await _feedback_open(update, token=arg[3:])
            return
        # Otherwise a report delivery token.
        await _send_report(update, token=arg)
    else:
        # User opened the bot directly without a token — default to RO welcome
        await update.message.reply_text(
            _t("ro", "welcome"),
            parse_mode="Markdown",
        )


# ---------------------------------------------------------------------------
# Feedback outreach — person opened a personal t.me/...?start=fb_<token> link.
# The backend binds their chat_id and sends the (editable) question itself;
# their next text message is captured by on_text → /tg/feedback/reply.
# ---------------------------------------------------------------------------

async def _feedback_open(update: Update, token: str) -> None:
    tg_user = update.effective_user
    if not tg_user:
        return
    payload = {
        "token": token,
        "chat_id": tg_user.id,
        "username": tg_user.username or "",
        "lang": "ru",
    }
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            await client.post(
                f"{BACKEND_URL}/api_crowe_bizcheck/tg/feedback/open",
                json=payload,
                headers=_bot_headers(),
            )
    except httpx.RequestError as exc:
        logger.warning("feedback/open backend unreachable: %s", exc)


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
        await status_msg.edit_text(_t("ro", "server_error"))
        return

    if resp.status_code == 404:
        await status_msg.edit_text(_t("ro", "expired"), parse_mode="Markdown")
        return

    if resp.status_code != 200:
        logger.error("Backend returned %s", resp.status_code)
        await status_msg.edit_text(_t("ro", "server_fail"))
        return

    data        = resp.json()
    lang        = data.get("language") or "ro"
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
            title = b.get("title", f"Bloc {b.get('order', '')}")
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
    lng = lang if lang in ("ro", "ru") else "ro"
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
    lang = context.user_data.get("clng", "ro")
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
    if text in (_STRINGS["ro"]["phone_later_btn"], _STRINGS["ru"]["phone_later_btn"]):
        lng = context.user_data.get("clng", context.user_data.get("lng", "ro"))
        context.user_data.pop("ctok", None)
        await update.message.reply_text(_t(lng, "phone_later_ack"), reply_markup=ReplyKeyboardRemove())
        return

    flow = context.user_data.get("flow")
    if not flow:
        # No report flow armed → this may be the reply to a feedback question.
        await _maybe_capture_feedback(update, text)
        return
    lang = context.user_data.get("lng", "ro")
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


async def _maybe_capture_feedback(update: Update, text: str) -> None:
    """If this chat has an open feedback question, save the message as the reply.

    Sends the backend the chat_id + text; the backend matches it against an
    outreach awaiting a reply (status='sent'). On a match it returns a thank-you
    we relay back. On no match it returns matched=false and we stay silent —
    preserving the bot's current behavior for stray messages.
    """
    tg_user = update.effective_user
    if not tg_user or not text:
        return
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(
                f"{BACKEND_URL}/api_crowe_bizcheck/tg/feedback/reply",
                json={
                    "chat_id": tg_user.id,
                    "username": tg_user.username or "",
                    "text": text,
                },
                headers=_bot_headers(),
            )
        data = resp.json() if resp.status_code == 200 else {}
    except httpx.RequestError as exc:
        logger.warning("feedback/reply backend unreachable: %s", exc)
        return
    except Exception:
        return

    if data.get("matched") and data.get("ack"):
        await update.message.reply_text(data["ack"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _zone(score: int, lang: str = "ro") -> tuple[str, str]:
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
