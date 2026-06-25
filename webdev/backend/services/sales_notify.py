"""
Sales-team Telegram notification.

When a visitor completes a test on bizcheck.md and leaves contact details, a
notification is posted to a private Telegram group where the sales people sit.
The message carries the lead's name, phone, email, Telegram (if they chose the
Telegram delivery), which test was completed + score, and the PDF report as an
attachment.

Fire-once: guarded by the `submissions.sales_notified` column claimed
atomically (see Submission.claim_sales_notification) so concurrent PATCH /
/tg/contact calls never send a duplicate.

Configuration (env vars — set on the server, NOT in code):
    SALES_BOT_TOKEN    bot token of the notifier bot (BotFather)
    SALES_CHAT_ID      id of the sales group (negative, e.g. -1001234567890)

Not configured? The notification is silently skipped (logged at info level).
Uses only the Python standard library (urllib) — no extra dependency.
"""
import io
import json
import logging
import mimetypes  # noqa: F401  (kept for clarity; we hardcode application/pdf)
import os
import threading
import urllib.error
import urllib.request
import uuid

log = logging.getLogger(__name__)

_API = "https://api.telegram.org/bot{token}/{method}"


def _env(name: str, default: str = "") -> str:
    return (os.getenv(name) or default).strip()


def _configured() -> bool:
    return bool(_env("SALES_BOT_TOKEN") and _env("SALES_CHAT_ID"))


def _zone_label_uk(score: int) -> str:
    if score >= 80: return "Низький ризик"
    if score >= 70: return "Помірний ризик"
    if score >= 65: return "Високий ризик"
    return "Критичний ризик"


def _esc(s) -> str:
    """Escape for Telegram HTML parse_mode."""
    s = "" if s is None else str(s)
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def _build_caption(sub: dict, test_name: str) -> str:
    name = " ".join(p for p in [sub.get("first_name"), sub.get("last_name")] if p) or "—"
    phone = sub.get("phone") or "—"
    email = sub.get("email") or "—"
    tg_user = sub.get("tg_username")
    tg_line = f"@{_esc(tg_user)}" if tg_user else "—"
    score = sub.get("total_score")
    try:
        score_int = int(round(float(score)))
        score_line = f"{score_int}% — {_zone_label_uk(score_int)}"
    except (TypeError, ValueError):
        score_line = "—"
    date = str(sub.get("created_at") or "")[:16].replace("T", " ")

    return (
        "🔔 <b>Новий тест пройдено на bizcheck.md</b>\n\n"
        f"👤 <b>{_esc(name)}</b>\n"
        f"📞 {_esc(phone)}\n"
        f"✉️ {_esc(email)}\n"
        f"✈️ Telegram: {tg_line}\n\n"
        f"🧪 Тест: <b>{_esc(test_name or '—')}</b>\n"
        f"📊 Бал: <b>{score_line}</b>\n"
        f"🗓 {_esc(date)}"
    )


def _post_json(method: str, payload: dict) -> dict:
    token = _env("SALES_BOT_TOKEN")
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        _API.format(token=token, method=method),
        data=data,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _post_document(caption: str, pdf_bytes: bytes, filename: str) -> dict:
    """Multipart/form-data POST to sendDocument (stdlib, no `requests`)."""
    token = _env("SALES_BOT_TOKEN")
    chat_id = _env("SALES_CHAT_ID")
    boundary = "----bizcheck" + uuid.uuid4().hex

    def field(name, value):
        return (
            f'--{boundary}\r\n'
            f'Content-Disposition: form-data; name="{name}"\r\n\r\n'
            f'{value}\r\n'
        ).encode("utf-8")

    body = io.BytesIO()
    body.write(field("chat_id", chat_id))
    body.write(field("caption", caption))
    body.write(field("parse_mode", "HTML"))
    body.write(
        f'--{boundary}\r\n'
        f'Content-Disposition: form-data; name="document"; filename="{filename}"\r\n'
        f'Content-Type: application/pdf\r\n\r\n'.encode("utf-8")
    )
    body.write(pdf_bytes)
    body.write(f'\r\n--{boundary}--\r\n'.encode("utf-8"))

    req = urllib.request.Request(
        _API.format(token=token, method="sendDocument"),
        data=body.getvalue(),
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
    )
    with urllib.request.urlopen(req, timeout=40) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _send_sync(sub: dict, test_name: str, pdf_bytes: bytes | None) -> None:
    chat_id = _env("SALES_CHAT_ID")
    caption = _build_caption(sub, test_name)
    msg_id = None
    is_doc = False
    try:
        if pdf_bytes and len(pdf_bytes) > 1024:
            safe_name = " ".join(p for p in [sub.get("first_name"), sub.get("last_name")] if p) or f"submission_{sub.get('id')}"
            filename = "BizCheck_" + "".join(c for c in safe_name if c.isalnum() or c in " _-").strip().replace(" ", "_")[:40] + ".pdf"
            resp = _post_document(caption, pdf_bytes, filename)
            is_doc = True
        else:
            # No PDF yet — send just the text so the lead isn't lost.
            resp = _post_json("sendMessage", {"chat_id": chat_id, "text": caption, "parse_mode": "HTML"})
        msg_id = ((resp or {}).get("result") or {}).get("message_id")
        log.info("[sales] notification sent for submission %s (msg %s)", sub.get("id"), msg_id)
    except urllib.error.HTTPError as e:
        log.error("[sales] Telegram API error for submission %s: %s %s",
                  sub.get("id"), e.code, e.read()[:300])
    except Exception as e:
        log.exception("[sales] failed to notify for submission %s: %s", sub.get("id"), e)

    # Persist the message id so later contact updates can edit it in-place.
    if msg_id:
        try:
            from models.submission import Submission
            Submission.set_sales_message(sub.get("id"), msg_id, is_doc)
        except Exception:
            pass


def _update_sync(sub: dict, test_name: str, msg_id: int, is_doc: bool) -> None:
    """Edit the already-sent sales notification in place with fresh contact data."""
    chat_id = _env("SALES_CHAT_ID")
    caption = _build_caption(sub, test_name)
    method = "editMessageCaption" if is_doc else "editMessageText"
    text_field = "caption" if is_doc else "text"
    payload = {"chat_id": chat_id, "message_id": msg_id, text_field: caption, "parse_mode": "HTML"}
    try:
        _post_json(method, payload)
        log.info("[sales] notification updated for submission %s (msg %s)", sub.get("id"), msg_id)
    except urllib.error.HTTPError as e:
        body = e.read()[:300]
        # Editing with identical content returns 400 "message is not modified" — harmless.
        if b"not modified" in body:
            return
        log.error("[sales] update error for submission %s: %s %s", sub.get("id"), e.code, body)
    except Exception as e:
        log.exception("[sales] failed to update notification for submission %s: %s", sub.get("id"), e)


def maybe_notify_sales(submission_id: int) -> None:
    """Fire-and-forget. On the FIRST complete lead (name + a contact channel) it
    sends the sales notification; on every later write it EDITS that same message
    in place so newly-added contact info (e.g. email/phone left in the bot) shows
    up without spamming the group with duplicates.

    Safe to call from any write path (PATCH, /tg/contact, /tg/lead).
    """
    if not _configured():
        return

    from models.submission import Submission
    from models.test import Test

    try:
        sub = Submission.find_by_id(submission_id)
    except Exception:
        sub = None
    if not sub:
        return

    has_name = bool(sub.get("first_name") or sub.get("last_name"))
    has_contact = bool(sub.get("email") or sub.get("phone") or sub.get("tg_chat_id"))
    if not (has_name and has_contact):
        return  # not a complete lead yet — wait for the next write

    test_name = ""
    try:
        tid = sub.get("test_id")
        if tid:
            t = Test.find_by_id(tid)
            if t:
                test_name = t.get("name_uk") or t.get("name_en") or ""
    except Exception:
        pass

    # Atomically claim the right to notify. If we win → first send. If not →
    # the notification already exists; edit it with the fresh data instead.
    if Submission.claim_sales_notification(submission_id) is not None:
        pdf_bytes = None
        try:
            pdf_bytes = Submission.get_pdf(submission_id)
        except Exception:
            pdf_bytes = None
        threading.Thread(
            target=_send_sync,
            args=(sub, test_name, pdf_bytes),
            daemon=True,
            name=f"sales-notify-{submission_id}",
        ).start()
        return

    # Already notified → update the existing message (if we know which one).
    try:
        existing = Submission.get_sales_message(submission_id)
    except Exception:
        existing = None
    if not existing:
        return
    msg_id, is_doc = existing
    threading.Thread(
        target=_update_sync,
        args=(sub, test_name, msg_id, is_doc),
        daemon=True,
        name=f"sales-update-{submission_id}",
    ).start()
