"""
Telegram update handlers for the BizCheck bot.

Groups, in order:
  1. /start entry point + feedback-outreach deep link
  2. Report delivery
  3. Post-report inline flows (email / lead / one-tap phone share)
  4. Free-text router (armed flow, or a feedback reply)
"""

import io
import base64

import httpx
from telegram import (
    Update, InlineKeyboardButton, InlineKeyboardMarkup,
    KeyboardButton, ReplyKeyboardMarkup, ReplyKeyboardRemove,
)
from telegram.ext import ContextTypes

import backend
from config import logger, EMAIL_RE, PHONE_RE
from strings import _STRINGS, _t
from helpers import _zone


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
        await _send_report(update, context, token=arg)
    else:
        # User opened the bot directly without a token — default to RO welcome
        await update.message.reply_text(
            _t("uk", "welcome"),
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
        "lang": "en",
    }
    try:
        await backend.feedback_open(payload)
    except httpx.RequestError as exc:
        logger.warning("feedback/open backend unreachable: %s", exc)


# ---------------------------------------------------------------------------
# Report delivery
# ---------------------------------------------------------------------------

async def _send_report(update: Update, context: ContextTypes.DEFAULT_TYPE, token: str) -> None:
    """Fetch the report PDF from the backend and send it to the user."""
    chat    = update.effective_chat
    tg_user = update.effective_user

    # Use a neutral loading message first (we don't know the language yet)
    status_msg = await chat.send_message("⏳ ...")

    # 1. Fetch report data from backend
    try:
        resp = await backend.get_report(token)
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
            await backend.save_contact(token, {
                "tg_chat_id":    tg_user.id,
                "tg_username":   tg_user.username   or "",
                "tg_first_name": tg_user.first_name or "",
                "tg_last_name":  tg_user.last_name  or "",
            })
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
        resp = await backend.save_lead(token, {"phone": phone})
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
        # No report flow armed → this may be the reply to a feedback question.
        await _maybe_capture_feedback(update, text)
        return
    lang = context.user_data.get("lng", "uk")
    token = context.user_data.get("tok")

    # ----- flow: receive report by email (single step) -----
    if flow == "email":
        if not EMAIL_RE.match(text):
            await update.message.reply_text(_t(lang, "email_invalid"))
            return
        try:
            resp = await backend.send_email(token, text)
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
        if not EMAIL_RE.match(text):
            await update.message.reply_text(_t(lang, "lead_invalid_email"))
            return
        context.user_data["eml"] = text
        context.user_data["step"] = "phone"
        await update.message.reply_text(_t(lang, "lead_ask_phone"))
        return

    # step == "phone"
    if not PHONE_RE.match(text):
        await update.message.reply_text(_t(lang, "lead_invalid_phone"))
        return
    email = context.user_data.get("eml", "")
    try:
        resp = await backend.save_lead(token, {"email": email, "phone": text})
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
        resp = await backend.feedback_reply({
            "chat_id": tg_user.id,
            "username": tg_user.username or "",
            "text": text,
        })
        data = resp.json() if resp.status_code == 200 else {}
    except httpx.RequestError as exc:
        logger.warning("feedback/reply backend unreachable: %s", exc)
        return
    except Exception:
        return

    if data.get("matched") and data.get("ack"):
        await update.message.reply_text(data["ack"])
