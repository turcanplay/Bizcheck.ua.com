"""
Sales-team Telegram notification.

When a visitor completes a test on bizcheck.md and leaves contact details, a
TEXT notification is posted to a private Telegram group (a forum / topics group)
where the sales people sit. The message carries the lead's name, phone, email,
Telegram (if they chose the Telegram delivery), which test was completed + score.

No PDF is attached — the file is intentionally left out so a burst of heavy
reports can never bloat the group or OOM the worker. The full PDF archive is
pulled on demand from the group bot via /pdf (see webdev/groupbot/).

Forum topics: each test gets its OWN topic, created automatically on the first
notification (createForumTopic) and remembered in `tests.tg_topic_id`. Every
later notification for that test lands in the same topic. If the group is not a
forum (or the bot lacks "Manage Topics"), we fall back to the General thread.

Fire-once: guarded by the `submissions.sales_notified` column claimed
atomically (see Submission.claim_sales_notification) so concurrent PATCH /
/tg/contact calls never send a duplicate.

Configuration (env vars — set on the server, NOT in code):
    SALES_BOT_TOKEN    bot token of the notifier bot (BotFather)
    SALES_CHAT_ID      id of the sales group (negative, e.g. -1001234567890)

Not configured? The notification is silently skipped (logged at info level).
Uses only the Python standard library (urllib) — no extra dependency.
"""
from __future__ import annotations

import json
import logging
import os
import queue
import threading
import time
import urllib.error
import urllib.parse
import urllib.request

log = logging.getLogger(__name__)

_API = "https://api.telegram.org/bot{token}/{method}"


def _env(name: str, default: str = "") -> str:
    return (os.getenv(name) or default).strip()


def _configured() -> bool:
    return bool(_env("SALES_BOT_TOKEN") and _env("SALES_CHAT_ID"))


def _zone_label_ro(score: int) -> str:
    if score >= 80: return "Risc scăzut"
    if score >= 70: return "Risc moderat"
    if score >= 65: return "Risc ridicat"
    return "Risc critic"


def _esc(s) -> str:
    """Escape for Telegram HTML parse_mode."""
    s = "" if s is None else str(s)
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def _admin_url() -> str:
    base = (os.getenv("PUBLIC_BASE_URL") or "https://bizcheck.md").rstrip("/")
    return f"{base}/admin_bizcheck_md_crowe/"


def _tg_contact_line(sub: dict) -> str:
    """@username clicabil → t.me; altfel link tg://user?id= ca să-i scrii; altfel —."""
    user = sub.get("tg_username")
    if user:
        u = str(user).lstrip("@")
        return f'<a href="https://t.me/{u}">@{_esc(u)}</a>'
    chat_id = sub.get("tg_chat_id")
    if chat_id:
        return f'<a href="tg://user?id={chat_id}">scrie-i pe Telegram</a> (ID {_esc(chat_id)})'
    return "—"


def _build_keyboard(sub: dict):
    """Inline buttons: deschide chat-ul Telegram al persoanei + scrie-i email.
    Returnează dict reply_markup sau None dacă nu există niciun buton valid."""
    rows = []
    user = sub.get("tg_username")
    chat_id = sub.get("tg_chat_id")
    if user:
        u = str(user).lstrip("@")
        rows.append([{"text": "💬 Scrie pe Telegram", "url": f"https://t.me/{u}"}])
    elif chat_id:
        rows.append([{"text": "💬 Scrie pe Telegram", "url": f"tg://user?id={chat_id}"}])
    email = sub.get("email")
    if email and "@" in str(email):
        to = urllib.parse.quote(str(email))
        rows.append([{"text": "✉️ Scrie email", "url": f"https://mail.google.com/mail/?view=cm&fs=1&to={to}"}])
    return {"inline_keyboard": rows} if rows else None


def _build_caption(sub: dict, test_name: str) -> str:
    name = " ".join(p for p in [sub.get("first_name"), sub.get("last_name")] if p) or "—"
    phone = sub.get("phone") or "—"
    email = sub.get("email") or "—"
    tg_line = _tg_contact_line(sub)

    score = sub.get("total_score")
    try:
        score_int = int(round(float(score)))
        score_line = f"{score_int}% — {_zone_label_ro(score_int)}"
    except (TypeError, ValueError):
        score_line = "—"

    sector = sub.get("sector") or "—"
    revenue = sub.get("company_revenue") or "—"

    sep = "➖➖➖➖➖➖➖➖➖➖"
    return (
        "🆕 <b>Lead nou pe bizcheck.md</b>\n\n"
        f"👤 <b>{_esc(name)}</b>\n"
        f"✉️ {_esc(email)}\n"
        f"📞 {_esc(phone)}\n"
        f"✈️ {tg_line}\n\n"
        f"🧪 Test: <b>{_esc(test_name or '—')}</b>\n"
        f"📊 Scor: <b>{_esc(score_line)}</b>\n\n"
        f"{sep}\n"
        "🏢 <b>Companie</b>\n"
        f"• Sector: {_esc(sector)}\n"
        f"• Cifră de afaceri: {_esc(revenue)}\n\n"
        f"{sep}\n"
        f'📄 PDF & detalii complete → <a href="{_admin_url()}">panou admin</a>'
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


# ──────────────────────────────────────────────────────────────────
# Forum topics — one per test, created on demand
# ──────────────────────────────────────────────────────────────────
# Once we learn the group is not a forum (or the bot lacks "Manage Topics"),
# stop trying to create topics this process and post to the General thread.
_topics_disabled = False


def _create_forum_topic(name: str):
    """Create a forum topic in the sales group; return its message_thread_id or None."""
    global _topics_disabled
    chat_id = _env("SALES_CHAT_ID")
    try:
        resp = _post_json("createForumTopic", {"chat_id": chat_id, "name": name[:128]})
        return ((resp or {}).get("result") or {}).get("message_thread_id")
    except urllib.error.HTTPError as e:
        body = b""
        try:
            body = e.read()
        except Exception:
            body = b""
        low = body.lower()
        if b"forum" in low or b"not enough rights" in low or b"can't be managed" in low:
            log.warning("[sales] forum topics unavailable (%s) — using General thread", body[:200])
            _topics_disabled = True
        else:
            log.error("[sales] createForumTopic failed: %s %s", e.code, body[:200])
    except Exception:
        log.exception("[sales] createForumTopic error")
    return None


def _topic_thread_id(sub: dict):
    """Resolve the forum topic to post the lead notification into.

    If SALES_TOPIC_ID is set, ALL lead notifications go to that single topic
    (e.g. the dedicated "Lead/Client Chat bot" topic) — this takes priority.
    Otherwise fall back to a per-test topic (auto-created once), or General.
    """
    fixed = _env("SALES_TOPIC_ID")
    if fixed:
        try:
            return int(fixed)
        except ValueError:
            pass

    if _topics_disabled:
        return None
    tid = sub.get("test_id")
    if not tid:
        return None
    try:
        from models.test import Test
        existing = Test.get_topic_id(tid)
        if existing:
            return int(existing)
        name = _resolve_test_name(sub) or f"Test {tid}"
        thread_id = _create_forum_topic(name)
        if thread_id:
            try:
                Test.set_topic_id(tid, thread_id)
            except Exception:
                log.exception("[sales] could not persist topic id for test %s", tid)
            return thread_id
    except Exception:
        log.exception("[sales] topic resolve failed for test %s", tid)
    return None


# ──────────────────────────────────────────────────────────────────
# Serialized sender
# ──────────────────────────────────────────────────────────────────
# A single background worker per process drains a queue, so no matter how many
# leads complete at once we NEVER spawn a thread-per-submission storm. Jobs carry
# only the submission id and the messages are plain text (no PDF), so memory stays
# flat under a burst. Sends are spaced to respect Telegram's per-chat rate limit
# and 429s are retried.

_QUEUE: "queue.Queue" = queue.Queue(maxsize=2000)
_worker_started = False
_worker_lock = threading.Lock()

_SEND_SPACING_SEC = float(_env("SALES_SEND_SPACING_SEC") or 3.0)   # ~20 msg/min (limita de grup)
_MAX_SEND_RETRY = int(_env("SALES_MAX_SEND_RETRY") or 4)           # mai rezistent la 429 înainte de release


def _retry_after(body: bytes) -> float:
    try:
        ra = int((json.loads(body.decode("utf-8")).get("parameters") or {}).get("retry_after") or 0)
    except Exception:
        ra = 0
    return min(max(ra, 1), 30)


def _resolve_test_name(sub: dict) -> str:
    try:
        from models.test import Test
        tid = sub.get("test_id")
        if tid:
            t = Test.find_by_id(tid)
            if t:
                return t.get("name_ro") or t.get("name_ru") or ""
    except Exception:
        pass
    return ""


def _do_send(sub: dict, test_name: str, thread_id):
    """Send the text notification into the test's topic (or General).
    Returns (ok, msg_id). Retries 429 a few times; on a missing topic falls
    back once to the General thread so the lead still lands."""
    chat_id = _env("SALES_CHAT_ID")
    caption = _build_caption(sub, test_name)
    payload = {"chat_id": chat_id, "text": caption, "parse_mode": "HTML"}
    kb = _build_keyboard(sub)
    if kb:
        payload["reply_markup"] = kb
    if thread_id:
        payload["message_thread_id"] = thread_id

    for attempt in range(_MAX_SEND_RETRY + 1):
        try:
            resp = _post_json("sendMessage", payload)
            msg_id = ((resp or {}).get("result") or {}).get("message_id")
            log.info("[sales] notification sent for submission %s (msg %s)", sub.get("id"), msg_id)
            return True, msg_id
        except urllib.error.HTTPError as e:
            body = b""
            try:
                body = e.read()
            except Exception:
                body = b""
            if e.code == 429 and attempt < _MAX_SEND_RETRY:
                wait = _retry_after(body)
                log.warning("[sales] 429 for submission %s; sleeping %ss then retry", sub.get("id"), wait)
                time.sleep(wait)
                continue
            # Topic was deleted on the group side → retry once into General.
            if payload.get("message_thread_id") and b"thread not found" in body.lower():
                log.warning("[sales] topic missing for submission %s — retrying in General", sub.get("id"))
                payload.pop("message_thread_id", None)
                continue
            log.error("[sales] Telegram API error for submission %s: %s %s",
                      sub.get("id"), e.code, body[:300])
            return False, None
        except Exception as e:
            log.exception("[sales] failed to notify for submission %s: %s", sub.get("id"), e)
            return False, None
    return False, None


def _process_send(submission_id: int) -> None:
    from models.submission import Submission
    try:
        sub = Submission.find_by_id(submission_id)
    except Exception:
        sub = None
    if not sub:
        Submission.release_sales_notification(submission_id)
        return

    thread_id = _topic_thread_id(sub)
    ok, msg_id = _do_send(sub, _resolve_test_name(sub), thread_id)
    if ok and msg_id:
        try:
            # Text message → is_doc is always False now (no PDF attachment).
            Submission.set_sales_message(submission_id, msg_id, False)
        except Exception:
            pass
    elif not ok:
        # Real failure → release the claim so a later write retries instead of
        # the lead being lost forever.
        try:
            Submission.release_sales_notification(submission_id)
        except Exception:
            pass


def _process_update(submission_id: int, msg_id: int, is_doc: bool) -> None:
    """Edit the already-sent sales notification in place with fresh contact data."""
    from models.submission import Submission
    try:
        sub = Submission.find_by_id(submission_id)
    except Exception:
        sub = None
    if not sub:
        return
    chat_id = _env("SALES_CHAT_ID")
    caption = _build_caption(sub, _resolve_test_name(sub))
    method = "editMessageCaption" if is_doc else "editMessageText"
    text_field = "caption" if is_doc else "text"
    payload = {"chat_id": chat_id, "message_id": msg_id, text_field: caption, "parse_mode": "HTML"}
    kb = _build_keyboard(sub)
    if kb:
        payload["reply_markup"] = kb
    try:
        _post_json(method, payload)
        log.info("[sales] notification updated for submission %s (msg %s)", submission_id, msg_id)
    except urllib.error.HTTPError as e:
        body = e.read()[:300]
        # Editing with identical content returns 400 "message is not modified" — harmless.
        if b"not modified" in body:
            return
        log.error("[sales] update error for submission %s: %s %s", submission_id, e.code, body)
    except Exception as e:
        log.exception("[sales] failed to update notification for submission %s: %s", submission_id, e)


def _worker_loop() -> None:
    while True:
        job = _QUEUE.get()
        try:
            if job[0] == "send":
                _process_send(job[1])
            elif job[0] == "update":
                _process_update(job[1], job[2], job[3])
        except Exception:
            log.exception("[sales] worker job failed: %s", job)
        finally:
            _QUEUE.task_done()
            # Space consecutive sends to the same chat (per-chat ~1 msg/s).
            time.sleep(_SEND_SPACING_SEC)


def _ensure_worker() -> None:
    global _worker_started
    if _worker_started:
        return
    with _worker_lock:
        if _worker_started:
            return
        threading.Thread(target=_worker_loop, daemon=True, name="sales-notify").start()
        _worker_started = True


def _enqueue(job: tuple, *, release_on_drop: int | None = None) -> None:
    """Non-blocking enqueue. If the queue is somehow full, drop the job rather
    than block a request thread; release the claim so it can retry later."""
    try:
        _QUEUE.put_nowait(job)
    except queue.Full:
        log.error("[sales] queue full, dropping job %s", job)
        if release_on_drop is not None:
            try:
                from models.submission import Submission
                Submission.release_sales_notification(release_on_drop)
            except Exception:
                pass


def maybe_notify_sales(submission_id: int) -> None:
    """Fire-and-forget. On the FIRST complete lead (name + a contact channel) it
    sends the sales notification; on every later write it EDITS that same message
    in place so newly-added contact info (e.g. email/phone left in the bot) shows
    up without spamming the group with duplicates.

    The actual sending is handed to a single serialized background worker (see
    above) so heavy PDFs and lead bursts can never spawn a thread storm / OOM.

    Safe to call from any write path (PATCH, /tg/contact, /tg/lead).
    """
    if not _configured():
        return

    from models.submission import Submission

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

    _ensure_worker()

    # Atomically claim the right to notify. If we win → first send. If not →
    # the notification already exists; edit it with the fresh data instead.
    if Submission.claim_sales_notification(submission_id) is not None:
        _enqueue(("send", submission_id), release_on_drop=submission_id)
        return

    # Already notified → update the existing message (if we know which one).
    try:
        existing = Submission.get_sales_message(submission_id)
    except Exception:
        existing = None
    if not existing:
        return
    msg_id, is_doc = existing
    _enqueue(("update", submission_id, msg_id, is_doc))
