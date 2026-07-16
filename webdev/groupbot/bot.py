"""
BizCheck Group Bot — the team's internal Telegram bot.

Lives in the private sales/team group (a forum / topics group) and serves two
on-demand commands. It is SEPARATE from the client-facing report bot:

  • Notifications (test completed) are posted by the backend itself
    (services/sales_notify.py) into a per-test topic — this bot does NOT send them.
  • /excel — pick a test (inline buttons) → bot fetches the combined Excel for
              that test from the backend and drops it into the same topic.
  • /pdf   — pick a test (inline buttons) → bot fetches the ZIP archive of every
              stored PDF for that test and drops it into the same topic.

Token: SALES_BOT_TOKEN (the SAME bot the backend uses to post notifications;
the backend only *sends*, this process *polls* — no getUpdates conflict).

Security: commands are honored ONLY inside the configured group (SALES_CHAT_ID).
The backend export endpoints are guarded by BOT_SHARED_SECRET (strict).
"""
import io
import os
import logging

import httpx
from dotenv import load_dotenv
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.error import Conflict, NetworkError, TimedOut
from telegram.ext import (
    Application, AIORateLimiter, CommandHandler, CallbackQueryHandler, ContextTypes,
    MessageHandler, filters,
)

load_dotenv()

logging.basicConfig(
    format="%(asctime)s [%(levelname)s] %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)

BACKEND_URL       = os.getenv("BACKEND_URL", "http://backend:4001")
BOT_TOKEN         = os.getenv("SALES_BOT_TOKEN", "")
ALLOWED_CHAT_ID   = (os.getenv("SALES_CHAT_ID", "") or "").strip()
BOT_SHARED_SECRET = os.getenv("BOT_SHARED_SECRET", "")
ADMIN_PANEL_URL   = os.getenv("ADMIN_PANEL_URL", "https://bizcheck.md/admin_bizcheck_md_crowe/")

EXPORTS = f"{BACKEND_URL}/api_crowe_bizcheck/tg/exports"

# Telegram bots can upload files up to 50 MB. Stay just under it.
_MAX_UPLOAD = 49_000_000


def _headers() -> dict:
    return {"X-Bot-Secret": BOT_SHARED_SECRET} if BOT_SHARED_SECRET else {}


def _allowed(update: Update) -> bool:
    """Honor commands only inside the configured team group."""
    chat = update.effective_chat
    if not ALLOWED_CHAT_ID:
        return True  # not locked down (dev) — backend secret still gates the data
    return bool(chat and str(chat.id) == ALLOWED_CHAT_ID)


def _thread_id(update: Update):
    msg = update.effective_message
    return getattr(msg, "message_thread_id", None) if msg else None


def _filename_from_headers(resp, fallback: str) -> str:
    """Extract filename from a Content-Disposition header; else return fallback."""
    cd = resp.headers.get("content-disposition") or ""
    marker = 'filename="'
    start = cd.find(marker)
    if start != -1:
        start += len(marker)
        end = cd.find('"', start)
        if end != -1:
            name = cd[start:end].strip()
            if name:
                return name
    return fallback


def _too_big_text(data) -> str:
    """UK message for a 413 'too big' JSON payload from the backend."""
    admin_url = ""
    if isinstance(data, dict):
        admin_url = data.get("admin_url") or ""
    return (
        "⚠️ Файл завеликий для Telegram. Завантажте його з адмін-панелі:\n"
        f"{admin_url}"
    )


# ---------------------------------------------------------------------------
# Commands → show the inline test picker
# ---------------------------------------------------------------------------

async def _send_menu(update: Update, kind: str) -> None:
    if not _allowed(update):
        return
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.get(f"{EXPORTS}/tests", headers=_headers())
    except httpx.RequestError as exc:
        logger.warning("tests list backend unreachable: %s", exc)
        await update.message.reply_text("Бекенд недоступний. Спробуйте ще раз.")
        return
    if resp.status_code != 200:
        await update.message.reply_text(f"Не вдалося отримати список тестів (код {resp.status_code}).")
        return
    tests = resp.json() or []
    if not tests:
        await update.message.reply_text("Немає налаштованих тестів.")
        return

    kb = [[InlineKeyboardButton((t.get("name") or f"Тест {t['id']}")[:60],
                                 callback_data=f"{kind}:{t['id']}")]
          for t in tests]
    if kind == "xls":
        prompt = "Оберіть тест, для якого потрібен Excel:"
    elif kind == "pdf":
        prompt = "Оберіть тест, для якого потрібен PDF-архів:"
    else:  # cl
        prompt = "Оберіть тест, щоб переглянути особу:"
    await update.message.reply_text(
        prompt,
        reply_markup=InlineKeyboardMarkup(kb),
        message_thread_id=_thread_id(update),
    )


async def cmd_excel(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await _send_menu(update, "xls")


async def cmd_pdf(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not _allowed(update):
        return
    await update.message.reply_text(
        "📄 PDF-архів усіх користувачів завантажується з адмін-панелі:\n"
        + ADMIN_PANEL_URL
        + "\n\nЩоб отримати PDF однієї особи, скористайтеся /client.",
        message_thread_id=_thread_id(update),
    )


async def cmd_client(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await _send_menu(update, "cl")


# ---------------------------------------------------------------------------
# Inline choice → fetch the file and drop it into the same topic
# ---------------------------------------------------------------------------

def _period_menu(test_id) -> InlineKeyboardMarkup:
    """Period picker for a chosen test → callbacks xp:<test_id>:<period>."""
    kb = [
        [InlineKeyboardButton("Сьогодні",          callback_data=f"xp:{test_id}:today")],
        [InlineKeyboardButton("Останні 7 днів",    callback_data=f"xp:{test_id}:7d")],
        [InlineKeyboardButton("Останні 30 днів",   callback_data=f"xp:{test_id}:30d")],
        [InlineKeyboardButton("Поточний місяць",   callback_data=f"xp:{test_id}:month")],
        [InlineKeyboardButton("Усе",               callback_data=f"xp:{test_id}:all")],
    ]
    return InlineKeyboardMarkup(kb)


async def on_choice(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Test chosen for Excel → show the period picker (no download yet)."""
    query = update.callback_query
    await query.answer()
    if not _allowed(update):
        return

    kind, _, tid = (query.data or "").partition(":")
    if kind != "xls" or not tid.isdigit():
        return
    thread_id = getattr(query.message, "message_thread_id", None) if query.message else None
    chat = query.message.chat

    await chat.send_message(
        "За який період потрібен Excel?",
        reply_markup=_period_menu(tid),
        message_thread_id=thread_id,
    )


async def _send_excel(chat, thread_id, test_id, period) -> None:
    """Fetch the period-scoped Excel for a test and drop it into the topic."""
    note = await chat.send_message("Генерую Excel…", message_thread_id=thread_id)
    try:
        async with httpx.AsyncClient(timeout=180.0) as client:
            resp = await client.get(
                f"{EXPORTS}/excel/{test_id}",
                params={"period": period},
                headers=_headers(),
            )
    except httpx.RequestError as exc:
        logger.warning("export backend unreachable: %s", exc)
        await note.edit_text("Бекенд недоступний. Спробуйте ще раз.")
        return

    if resp.status_code == 413:
        await note.edit_text(_too_big_text(resp.json()))
        return
    if resp.status_code != 200:
        await note.edit_text(f"Помилка під час генерації (код {resp.status_code}).")
        return

    data = resp.content
    if not data:
        await note.edit_text("Немає даних за цей період.")
        return
    if len(data) > _MAX_UPLOAD:
        await note.edit_text(
            f"Файл завеликий для Telegram ({len(data)//1_000_000} МБ > 50 МБ). "
            "Звузьте період або завантажте його з адмін-панелі."
        )
        return

    fname = _filename_from_headers(resp, f"Vytiah_Excel_{test_id}_{period}.xlsx")
    f = io.BytesIO(data)
    f.name = fname
    try:
        await chat.send_document(document=f, filename=fname, message_thread_id=thread_id)
        await note.delete()
    except Exception as exc:
        logger.warning("send_document failed: %s", exc)
        await note.edit_text("Не вдалося надіслати файл. Спробуйте ще раз.")


async def on_excel_period(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Period chosen → download & send that period's Excel (callback xp:<id>:<period>)."""
    query = update.callback_query
    await query.answer()
    if not _allowed(update):
        return

    parts = (query.data or "").split(":")
    if len(parts) != 3 or parts[0] != "xp" or not parts[1].isdigit():
        return
    test_id, period = parts[1], parts[2]
    thread_id = getattr(query.message, "message_thread_id", None) if query.message else None
    chat = query.message.chat

    await _send_excel(chat, thread_id, test_id, period)


# ---------------------------------------------------------------------------
# /client → pick a test → pick a person → fetch that person's PDF
# ---------------------------------------------------------------------------

def _subs_keyboard(subs: list) -> InlineKeyboardMarkup:
    kb = [[InlineKeyboardButton((s.get("label") or f"#{s['id']}")[:60],
                                callback_data=f"clp:{s['id']}")]
          for s in subs]
    return InlineKeyboardMarkup(kb)


async def on_client_test(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()
    if not _allowed(update):
        return

    _, _, tid = (query.data or "").partition(":")
    if not tid.isdigit():
        return
    thread_id = getattr(query.message, "message_thread_id", None) if query.message else None
    chat = query.message.chat

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.get(f"{EXPORTS}/submissions/{tid}", headers=_headers())
    except httpx.RequestError as exc:
        logger.warning("submissions list backend unreachable: %s", exc)
        await chat.send_message("Бекенд недоступний. Спробуйте ще раз.",
                                message_thread_id=thread_id)
        return
    if resp.status_code != 200:
        await chat.send_message(f"Не вдалося отримати заявки (код {resp.status_code}).",
                                message_thread_id=thread_id)
        return

    subs = resp.json() or []
    if not subs:
        await chat.send_message("Немає заявок для цього тесту.",
                                message_thread_id=thread_id)
        return

    context.user_data["client_test"] = int(tid)
    await chat.send_message(
        "Оберіть особу (або введіть ім'я для пошуку):",
        reply_markup=_subs_keyboard(subs),
        message_thread_id=thread_id,
    )


async def on_client_pdf(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()
    if not _allowed(update):
        return

    _, _, sid = (query.data or "").partition(":")
    if not sid.isdigit():
        return
    thread_id = getattr(query.message, "message_thread_id", None) if query.message else None
    chat = query.message.chat

    note = await chat.send_message("Готую PDF…", message_thread_id=thread_id)
    try:
        async with httpx.AsyncClient(timeout=180.0) as client:
            resp = await client.get(f"{EXPORTS}/pdf/{sid}", headers=_headers())
    except httpx.RequestError as exc:
        logger.warning("pdf backend unreachable: %s", exc)
        await note.edit_text("Бекенд недоступний. Спробуйте ще раз.")
        return

    if resp.status_code == 404:
        await note.edit_text("Ця особа не має збереженого PDF.")
        return
    if resp.status_code == 413:
        await note.edit_text(_too_big_text(resp.json()))
        return
    if resp.status_code != 200:
        await note.edit_text(f"Помилка під час генерації (код {resp.status_code}).")
        return

    data = resp.content
    if not data:
        await note.edit_text("Ця особа не має збереженого PDF.")
        return
    if len(data) > _MAX_UPLOAD:
        await note.edit_text(
            f"Файл завеликий для Telegram ({len(data)//1_000_000} МБ > 50 МБ). "
            "Завантажте його з адмін-панелі."
        )
        return

    fname = _filename_from_headers(resp, f"submission_{sid}.pdf")
    f = io.BytesIO(data)
    f.name = fname
    try:
        await chat.send_document(document=f, filename=fname, message_thread_id=thread_id)
        await note.delete()
    except Exception as exc:
        logger.warning("send_document failed: %s", exc)
        await note.edit_text("Не вдалося надіслати файл. Спробуйте ще раз.")


async def on_client_search(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not _allowed(update):
        return
    tid = context.user_data.get("client_test")
    if not tid:
        return  # not in a /client flow — ignore random group text

    q = (update.message.text or "").strip()
    if not q:
        return

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.get(f"{EXPORTS}/submissions/{tid}",
                                    params={"q": q}, headers=_headers())
    except httpx.RequestError as exc:
        logger.warning("submissions search backend unreachable: %s", exc)
        await update.message.reply_text("Бекенд недоступний. Спробуйте ще раз.",
                                        message_thread_id=_thread_id(update))
        return
    if resp.status_code != 200:
        await update.message.reply_text(f"Не вдалося виконати пошук (код {resp.status_code}).",
                                        message_thread_id=_thread_id(update))
        return

    subs = resp.json() or []
    if not subs:
        await update.message.reply_text(f"Немає збігів для «{q}».",
                                        message_thread_id=_thread_id(update))
        return

    await update.message.reply_text(
        "Оберіть особу:",
        reply_markup=_subs_keyboard(subs),
        message_thread_id=_thread_id(update),
    )


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

async def error_handler(update: object, context: ContextTypes.DEFAULT_TYPE) -> None:
    err = context.error
    if isinstance(err, Conflict):
        logger.warning("getUpdates conflict — another instance polls SALES_BOT_TOKEN.")
        return
    if isinstance(err, (NetworkError, TimedOut)):
        logger.warning("Transient network issue: %s", err)
        return
    logger.exception("Unhandled error in group bot: %s", err)


def main() -> None:
    if not BOT_TOKEN:
        raise RuntimeError("SALES_BOT_TOKEN is not set")

    app = (
        Application.builder()
        .token(BOT_TOKEN)
        .rate_limiter(AIORateLimiter(max_retries=3))
        .build()
    )
    app.add_handler(CommandHandler("excel", cmd_excel))
    app.add_handler(CommandHandler("pdf", cmd_pdf))
    app.add_handler(CommandHandler("client", cmd_client))
    # Callback dispatch via disjoint, colon-anchored patterns so they cannot
    # overlap (^xls: vs ^xp:, ^cl: vs ^clp:).
    app.add_handler(CallbackQueryHandler(on_choice, pattern=r"^xls:"))
    app.add_handler(CallbackQueryHandler(on_excel_period, pattern=r"^xp:"))
    app.add_handler(CallbackQueryHandler(on_client_test, pattern=r"^cl:"))
    app.add_handler(CallbackQueryHandler(on_client_pdf, pattern=r"^clp:"))
    # Free text in the group → person search (only inside an active /client flow).
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, on_client_search))
    app.add_error_handler(error_handler)

    logger.info("BizCheck Group Bot started (polling)")
    app.run_polling(
        drop_pending_updates=True,
        allowed_updates=Update.ALL_TYPES,
        poll_interval=1.5,
        timeout=30,
    )


if __name__ == "__main__":
    main()
