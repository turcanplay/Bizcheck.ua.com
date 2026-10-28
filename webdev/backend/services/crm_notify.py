"""
Outbound CRM webhook — push every new lead to the client's CRM.

Runs ALONGSIDE the Telegram sales notification (services/sales_notify.py) and
uses the very same "complete lead" rule: a name AND a contact channel (email,
phone or a bound Telegram chat). The first time a submission reaches that state
one `lead.created` event is POSTed to the CRM; there is no update event.

Fire-once: guarded by the `submissions.crm_notified` column claimed atomically
(see Submission.claim_crm_notification), independent of `sales_notified` so a
Telegram outage never blocks the CRM and vice versa. A delivery that finally
fails releases the claim, so the next write on that submission retries.

Request shape (a public contract — the lead object is services/crm_payload.py):

    POST <CRM_WEBHOOK_URL>
    Content-Type:         application/json
    User-Agent:           Bizcheck-CRM-Webhook/1
    X-Bizcheck-Event:     lead.created            (or "ping" from the CLI test)
    X-Bizcheck-Delivery:  <uuid4, same across the retries of one delivery>
    X-Bizcheck-Token:     <secret>                 only when the secret is set
    X-Bizcheck-Signature: sha256=<hex HMAC-SHA256(secret, raw body)>  idem

    {"event": "lead.created", "schema_version": 1,
     "sent_at": "2026-01-01T12:00:00Z", "lead": {...}}

The token header is the simple static check a no-code CRM (Zapier, Make, a
form-style inbound hook) can do; the signature is for receivers that can verify
an HMAC over the exact bytes received. Both carry the same secret.

Configuration (env vars — set on the server, NOT in code; read at call time):
    CRM_WEBHOOK_URL     http(s) endpoint of the CRM. Unset/empty → feature off.
    CRM_WEBHOOK_SECRET  shared secret for the token + signature headers.

Delivery runs on ONE background daemon worker per process, so a slow or dead
CRM can never hold a request thread. Retries on network errors / 5xx / 429
(backoff 2s, 10s, 30s → up to 4 attempts); any other 4xx gives up at once.
Redirects are NOT followed: urllib would replay our secret headers to whatever
host the Location points at.

Test the configuration from the backend container:
    python -m scripts.crm_test_webhook
"""
from __future__ import annotations

import hashlib
import hmac
import http.client
import json
import logging
import os
import queue
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from datetime import datetime, timezone

from services.crm_payload import SCHEMA_VERSION, build_lead

log = logging.getLogger(__name__)

_TIMEOUT_SEC = 10
_BACKOFF_SEC = (2, 10, 30)
_USER_AGENT = "Bizcheck-CRM-Webhook/1"


def _env(name: str) -> str:
    return (os.getenv(name) or "").strip()


def _url_allowed(url: str) -> bool:
    try:
        parts = urllib.parse.urlsplit(url)
    except ValueError:
        return False
    return parts.scheme in ("http", "https") and bool(parts.netloc)


def _safe_target(url: str) -> str:
    """scheme://host for logs. Never the path/query: hook URLs of no-code CRMs
    often embed their own secret there."""
    parts = urllib.parse.urlsplit(url)
    return f"{parts.scheme}://{parts.hostname or '?'}"


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _sleep(seconds: float) -> None:
    # Indirection so the unit tests can neutralise the backoff.
    time.sleep(seconds)


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None  # → the 3xx surfaces as an HTTPError and we give up


_OPENER = urllib.request.build_opener(_NoRedirect)


def _urlopen(req, timeout):
    return _OPENER.open(req, timeout=timeout)


def _build_request(url: str, secret: str, event: str, lead: dict, delivery_id: str):
    """Serialize ONCE; the signature is computed over exactly these bytes."""
    body = json.dumps(
        {"event": event, "schema_version": SCHEMA_VERSION,
         "sent_at": _now_iso(), "lead": lead},
        ensure_ascii=False, separators=(",", ":"), default=str,
    ).encode("utf-8")
    headers = {
        "Content-Type": "application/json",
        "User-Agent": _USER_AGENT,
        "X-Bizcheck-Event": event,
        "X-Bizcheck-Delivery": delivery_id,
    }
    if secret:
        sig = hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()
        headers["X-Bizcheck-Token"] = secret
        headers["X-Bizcheck-Signature"] = f"sha256={sig}"
    return urllib.request.Request(url, data=body, headers=headers, method="POST")


def _post_event(url: str, secret: str, event: str, lead: dict,
                backoff=_BACKOFF_SEC) -> tuple[bool, str]:
    """POST one event, retrying per `backoff`. Returns (ok, short status).
    The status never contains the secret, the URL path or any lead data."""
    if not _url_allowed(url):
        return False, "refused: CRM_WEBHOOK_URL must be an http(s) URL"
    req = _build_request(url, secret, event, lead, str(uuid.uuid4()))

    status = "not sent"
    for attempt in range(len(backoff) + 1):
        if attempt:
            _sleep(backoff[attempt - 1])
        try:
            with _urlopen(req, timeout=_TIMEOUT_SEC) as resp:
                code = resp.getcode()
                resp.read(1024)  # drain a little; the body is not used
            if 200 <= code < 300:
                return True, f"HTTP {code}"
            # urllib raises for >= 400, so this is a 1xx/3xx that slipped through.
            return False, f"HTTP {code} (not a 2xx)"
        except urllib.error.HTTPError as e:
            code = e.code
            e.close()
            status = f"HTTP {code}"
            if 300 <= code < 400:
                return False, f"{status} (redirects are not followed)"
            if code == 429 or code >= 500:
                continue
            return False, status  # other 4xx: the CRM rejected it, retrying won't help
        except (urllib.error.URLError, OSError, http.client.HTTPException) as e:
            reason = getattr(e, "reason", None) or e
            status = f"network error: {type(reason).__name__}"
            continue
        except ValueError as e:
            return False, f"invalid request: {type(e).__name__}"
    return False, f"{status} after {len(backoff) + 1} attempts"


# ---------------------------------------------------------------------------
# Background delivery
# ---------------------------------------------------------------------------
_QUEUE: "queue.Queue" = queue.Queue(maxsize=1000)
_worker_started = False
_worker_lock = threading.Lock()


def _release(submission_id: int) -> None:
    from models.submission import Submission
    try:
        Submission.release_crm_notification(submission_id)
    except Exception:
        log.exception(
            "[crm] releasing the claim failed for submission %s — this lead will "
            "not be retried automatically", submission_id)


def _deliver(submission_id: int) -> bool:
    """Synchronous delivery of one lead.created (what the worker runs)."""
    url = _env("CRM_WEBHOOK_URL")
    if not url:
        # Turned off between enqueue and delivery: give the claim back so the
        # lead goes out once the hook is configured again.
        _release(submission_id)
        return False

    from models.submission import Submission
    try:
        sub = Submission.find_by_id(submission_id)
    except Exception:
        log.exception("[crm] could not load submission %s for delivery", submission_id)
        sub = None
    if not sub:
        _release(submission_id)
        return False

    try:
        lead = build_lead(sub)
    except Exception:
        log.exception("[crm] could not build the payload for submission %s", submission_id)
        _release(submission_id)
        return False

    ok, status = _post_event(url, _env("CRM_WEBHOOK_SECRET"), "lead.created", lead)
    if ok:
        log.info("[crm] submission %s delivered to %s (%s)",
                 submission_id, _safe_target(url), status)
        return True
    log.warning("[crm] delivery FAILED for submission %s to %s: %s — claim released, "
                "the next write on this submission retries",
                submission_id, _safe_target(url), status)
    _release(submission_id)
    return False


def _worker_loop() -> None:
    while True:
        submission_id = _QUEUE.get()
        try:
            _deliver(submission_id)
        except Exception:
            log.exception("[crm] worker job failed for submission %s", submission_id)
        finally:
            _QUEUE.task_done()


def _ensure_worker() -> None:
    global _worker_started
    if _worker_started:
        return
    with _worker_lock:
        if _worker_started:
            return
        threading.Thread(target=_worker_loop, daemon=True, name="crm-notify").start()
        _worker_started = True


def _enqueue(submission_id: int) -> None:
    """Non-blocking. A full queue drops the job and releases the claim."""
    try:
        _QUEUE.put_nowait(submission_id)
    except queue.Full:
        log.error("[crm] queue full, dropping submission %s", submission_id)
        _release(submission_id)


def maybe_notify_crm(submission_id: int) -> None:
    """Fire-and-forget. Pushes `lead.created` the first time the submission is a
    complete lead (name + email/phone/tg_chat_id). Every later call is a no-op
    once delivered. Safe to call from any write path (PATCH, /tg/contact,
    /tg/lead) — it never raises.
    """
    url = _env("CRM_WEBHOOK_URL")
    if not url:
        log.debug("[crm] CRM_WEBHOOK_URL not set — webhook skipped")
        return
    if not _url_allowed(url):
        log.warning("[crm] CRM_WEBHOOK_URL is not an http(s) URL — webhook skipped")
        return

    from models.submission import Submission

    try:
        sub = Submission.find_by_id(submission_id)
    except Exception:
        log.exception("[crm] could not load submission %s — webhook skipped", submission_id)
        return
    if not sub:
        return

    has_name = bool(sub.get("first_name") or sub.get("last_name"))
    has_contact = bool(sub.get("email") or sub.get("phone") or sub.get("tg_chat_id"))
    if not (has_name and has_contact):
        return  # not a complete lead yet — wait for the next write

    try:
        if Submission.claim_crm_notification(submission_id) is None:
            return  # already delivered (or in flight)
    except Exception:
        log.exception("[crm] could not claim submission %s — webhook skipped", submission_id)
        return

    _ensure_worker()
    _enqueue(submission_id)


# ---------------------------------------------------------------------------
# Configuration check (scripts/crm_test_webhook.py)
# ---------------------------------------------------------------------------
_SAMPLE_SUB = {
    "id": 0,
    "created_at": "2000-01-01T00:00:00+00:00",
    "language": "uk",
    "status": "completed",
    "first_name": "Test",
    "last_name": "Example",
    "email": "test.lead@example.com",
    "phone": "+380000000000",
    "tg_username": None,
    "tg_chat_id": None,
    "sector": "Example sector",
    "company_size": "1-10",
    "company_age": "1-3",
    "company_revenue": "example",
    "test_id": 0,
    "total_score": 72,
    "has_pdf": False,
    "consent": True,
}
_SAMPLE_TEST = {"slug": "example-test", "name_uk": "Тестовий приклад (не справжній лід)",
                "name_en": "Sample (not a real lead)", "scoring_zones": None}


def send_test_event() -> tuple[bool, str]:
    """Synchronously POST one `ping` event carrying an obviously fake lead (id 0)
    with the real headers and signature. Single attempt — this is an interactive
    check. Returns (ok, short status text)."""
    url = _env("CRM_WEBHOOK_URL")
    if not url:
        return False, "CRM_WEBHOOK_URL is not set"
    lead = build_lead(dict(_SAMPLE_SUB), test=dict(_SAMPLE_TEST))
    ok, status = _post_event(url, _env("CRM_WEBHOOK_SECRET"), "ping", lead, backoff=())
    if ok and not _env("CRM_WEBHOOK_SECRET"):
        status += " (warning: CRM_WEBHOOK_SECRET is not set — requests are unsigned)"
    return ok, status
