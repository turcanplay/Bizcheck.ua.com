"""
Send a Telegram message AS the BizCheck bot, from the backend.

Used by the feedback-outreach flow: when the admin targets an existing contact
we already know their chat_id, so the backend can deliver the question instantly
via the Bot API (sendMessage) without routing through the polling bot service.

Replies still arrive at the polling bot (getUpdates) — only the OUTBOUND send
happens here, and it MUST use the same bot token the user talks to, otherwise
the reply would land on a different bot. Hence TELEGRAM_BOT_TOKEN (the BizCheck
bot), NOT SALES_BOT_TOKEN.

Uses only the Python standard library (urllib) — no extra dependency, mirroring
services/sales_notify.py.
"""
import json
import logging
import os
import time
import urllib.error
import urllib.request

log = logging.getLogger(__name__)

_API = "https://api.telegram.org/bot{token}/{method}"


def _token() -> str:
    return (os.getenv("TELEGRAM_BOT_TOKEN") or "").strip()


def is_configured() -> bool:
    return bool(_token())


_MAX_RETRY = 3       # how many times to wait-and-retry on a 429
_RETRY_CAP_SEC = 30  # never sleep longer than this on a single retry_after


def send_message(chat_id, text: str, _attempt: int = 0) -> tuple[bool, str]:
    """Send a plain-text message to a chat_id.

    Returns (ok, error). `ok` is False with a human-readable error string on
    any failure (not configured, blocked by user, network, Telegram API error).
    No exception escapes — callers persist the error onto the outreach row.

    On HTTP 429 (Telegram rate-limit) we honor `parameters.retry_after`,
    sleep, and retry up to _MAX_RETRY times — otherwise a burst of sends gets
    throttled and silently dropped after the first ~30 messages.
    """
    token = _token()
    if not token:
        return False, "TELEGRAM_BOT_TOKEN not configured"

    payload = {
        "chat_id": chat_id,
        "text": text,
        "disable_web_page_preview": True,
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        _API.format(token=token, method="sendMessage"),
        data=data,
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            body = json.loads(resp.read().decode("utf-8"))
        if body.get("ok"):
            return True, ""
        return False, str(body.get("description") or "Telegram API returned ok=false")
    except urllib.error.HTTPError as e:
        detail = ""
        retry_after = 0
        try:
            err_body = json.loads(e.read().decode("utf-8"))
            detail = err_body.get("description", "")
            retry_after = int((err_body.get("parameters") or {}).get("retry_after") or 0)
        except Exception:
            pass
        # 429 = Too Many Requests. Wait the time Telegram asks for and retry.
        if e.code == 429 and _attempt < _MAX_RETRY:
            wait = min(max(retry_after, 1), _RETRY_CAP_SEC)
            log.warning("[tg-send] 429 rate-limited; sleeping %ss then retry (%s/%s)",
                        wait, _attempt + 1, _MAX_RETRY)
            time.sleep(wait)
            return send_message(chat_id, text, _attempt=_attempt + 1)
        # 403 = user never started the bot or blocked it — the common case for
        # a username that hasn't actually opened the bot.
        msg = detail or f"HTTP {e.code}"
        log.warning("[tg-send] sendMessage failed: %s", msg)
        return False, msg
    except Exception as e:
        log.warning("[tg-send] sendMessage error: %s", e)
        return False, str(e)
