"""
Telegram bot bridge endpoints.

POST /api/tg/link/<sub_id>     — generate a one-time deep-link token
POST /api/tg/report/<token>    — bind the recipient and return the report (bot only)
POST /api/tg/contact/<token>   — save Telegram chat_id + username after delivery
"""

import os
import re
import hmac
import secrets
import base64
import logging
from datetime import datetime, timedelta, timezone

from flask import Blueprint, jsonify, request
from database.db import execute, query
from utils.crypto import decrypt_value
from middleware.admin_middleware import submission_owner_or_admin
from services.scoring import resolve_zones
from services.telegram_send import bot_username, deep_link
from utils.validators import clean_text, clean_optional, MAX_NAME

log = logging.getLogger(__name__)

tg_bp = Blueprint("telegram", __name__, url_prefix="/api_crowe_bizcheck/tg")

_TOKEN_TTL_HOURS = 24

_EMAIL_RE = re.compile(r'^[^@\s]{1,64}@[^@\s]{1,253}\.[^@\s]{1,63}$')
_PHONE_RE = re.compile(r'^\+?[\d\s\-()]{7,20}$')


@tg_bp.before_request
def _validate_bot_request():
    """Bound inputs before they can reach SQL or identity-field parsers."""
    token = (request.view_args or {}).get("token")
    if token is not None and not re.fullmatch(r"[A-Za-z0-9_-]{1,64}", token):
        return jsonify({"error": "Token not found or expired"}), 404
    body = request.get_json(silent=True)
    if body is not None and not isinstance(body, dict):
        return jsonify({"error": "Expected a JSON object"}), 400


@tg_bp.after_request
def _private_response(response):
    # Reports, contact details and bearer links must never enter a proxy cache.
    response.headers["Cache-Control"] = "no-store"
    response.headers["Pragma"] = "no-cache"
    return response


# ---------------------------------------------------------------------------
# Bot identity and private recipient gates
# ---------------------------------------------------------------------------
def _bot_secret_ok(req, endpoint: str) -> bool:
    """Fail closed: a report link never grants direct bot API access."""
    secret = (os.getenv("BOT_SHARED_SECRET") or "").strip()
    provided = req.headers.get("X-Bot-Secret", "")
    if secret and provided and hmac.compare_digest(provided.encode(), secret.encode()):
        return True
    log.warning("[tg] %s: missing or invalid bot credentials — rejected", endpoint)
    return False


def _private_chat_id():
    """The trusted bot supplies the actual private Telegram recipient."""
    raw = request.headers.get("X-Telegram-Chat-ID", "")
    if not re.fullmatch(r"[1-9][0-9]{0,15}", raw):
        return None
    return int(raw)


def _reject_unauthorized_bot(endpoint: str):
    """Return a 403 response when the bot gate fails, else None."""
    if _bot_secret_ok(request, endpoint):
        if _private_chat_id() is not None:
            return None
        return jsonify({"error": "Invalid private Telegram recipient"}), 400
    return jsonify({"error": "forbidden"}), 403


def _submission_id_for_valid_token(token):
    """Only the private chat which claimed the token can use its actions."""
    row = query(
        """SELECT id FROM submissions WHERE tg_token = %s
           AND tg_token_expires > NOW() AND tg_token_chat_id = %s""",
        (token, _private_chat_id()), fetch_one=True,
    )
    if not row:
        return None
    return row["id"]


# ---------------------------------------------------------------------------
# Generate deep-link token
# ---------------------------------------------------------------------------

@tg_bp.route("/link/<int:sub_id>", methods=["POST"])
@submission_owner_or_admin
def generate_tg_link(sub_id):
    """
    Create a recipient-bound Telegram deep-link token for a submission.
    Returns { token, url, pdf_ready } where pdf_ready=true iff the submission
    already has its PDF persisted (user can safely click the bot link).
    Token expires after TOKEN_TTL_HOURS hours.
    """
    token = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc) + timedelta(hours=_TOKEN_TTL_HOURS)

    # No handle configured → no link. Handing back a link built from a default
    # handle would send the client into a DIFFERENT bot, one that never received
    # this token and so cannot recognize them: a dead end with no error anywhere.
    if not bot_username():
        return jsonify({"error": "Telegram delivery is not configured"}), 503

    # One UPDATE serializes competing requests: neither can invalidate the link
    # another request just returned. A rotated token gets a fresh recipient bind.
    row = execute(
        """UPDATE submissions SET
           tg_token_chat_id = CASE WHEN tg_token IS NOT NULL AND tg_token_expires > NOW()
                                  THEN tg_token_chat_id ELSE NULL END,
           tg_token = CASE WHEN tg_token IS NOT NULL AND tg_token_expires > NOW()
                           THEN tg_token ELSE %s END,
           tg_token_expires = CASE WHEN tg_token IS NOT NULL AND tg_token_expires > NOW()
                                   THEN tg_token_expires ELSE %s END
           WHERE id = %s
           RETURNING tg_token, pdf_data IS NOT NULL AS has_pdf""",
        (token, expires, sub_id),
    )
    if not row:
        return jsonify({"error": "Submission not found"}), 404

    return jsonify({
        "token": row["tg_token"],
        "url": deep_link(row["tg_token"]),
        "pdf_ready": bool(row.get("has_pdf")),
    })


# ---------------------------------------------------------------------------
# Fetch report by token (used internally by the bot)
# ---------------------------------------------------------------------------

@tg_bp.route("/report/<token>", methods=["POST"])
def get_report_by_token(token):
    """
    Return submission data + base64-encoded PDF for a valid token.
    Called exclusively by the Telegram bot service.
    """
    denied = _reject_unauthorized_bot("/tg/report")
    if denied:
        return denied
    chat_id = _private_chat_id()
    # scoring_zones comes along on the SAME row (LEFT JOIN, no extra round-trip):
    # the bot prints the score's zone and must use the test's admin-configured
    # bands, not a ladder of its own. LEFT JOIN because submissions.test_id is
    # nullable — a submission without a test still delivers its PDF, it just
    # falls back to the default zones.
    # Claim and read in one statement: simultaneous opens in different chats
    # cannot both receive the PDF. Reopening in the same chat remains retryable.
    row = execute(
        """WITH claimed AS (
             UPDATE submissions SET tg_token_chat_id = %s
             WHERE tg_token = %s AND tg_token_expires > NOW()
               AND (tg_token_chat_id IS NULL OR tg_token_chat_id = %s)
             RETURNING id, first_name, last_name, total_score,
                       block_scores_json, pdf_data, language, test_id
           )
           SELECT s.*, t.scoring_zones FROM claimed s
           LEFT JOIN tests t ON t.id = s.test_id
        """,
        (chat_id, token, chat_id),
    )

    if not row:
        return jsonify({"error": "Token not found or expired"}), 404

    # Convert BYTEA pdf_data → base64
    pdf_b64 = None
    raw = row.get("pdf_data")
    if raw:
        pdf_bytes = bytes(raw) if isinstance(raw, memoryview) else raw
        pdf_b64 = base64.b64encode(pdf_bytes).decode("utf-8")

    return jsonify({
        "id": row["id"],
        "first_name": decrypt_value(row["first_name"]),
        "last_name": decrypt_value(row["last_name"]),
        "total_score": row["total_score"],
        "block_scores_json": row["block_scores_json"],
        "pdf_b64": pdf_b64,
        "language": row.get("language") or "uk",
        # Always a complete, ordered 4-key dict — resolve_zones() repairs legacy
        # / hand-edited rows, so the bot never receives null or a partial ladder.
        "scoring_zones": resolve_zones(row.get("scoring_zones")),
    })


# ---------------------------------------------------------------------------
# Report delivery FAILED in the bot → alert the sales team (fire-and-forget)
# ---------------------------------------------------------------------------

# Fixed UK labels for the reasons the bot can report. A closed map (not free
# text) means the bot can never inject arbitrary content into the sales group.
_FAIL_REASONS = {
    "expired":      "Термін дії посилання минув (>24 год)",
    "server_error": "Бекенд недоступний / помилка сервера",
    "server_fail":  "Помилка отримання звіту з бекенду",
    "no_pdf":       "PDF ще не готовий на момент відкриття",
}


@tg_bp.route("/report/<token>/failed", methods=["POST"])
def report_delivery_failed(token):
    """Bot-only: the user opened their report link but delivery FAILED (expired
    token, backend error, …). We look the token up — it may be EXPIRED, but the
    row still exists — and, if it maps to a real submission, alert the sales team
    so they can reach the lead manually.

    Unknown tokens are ignored silently: an alert only fires for a token that
    maps to a real submission, so a forged/guessed token can neither spam the
    sales group nor probe which tokens exist (identical 200 either way).
    """
    denied = _reject_unauthorized_bot("/tg/report/failed")
    if denied:
        return denied
    data = request.get_json(silent=True) or {}
    reason_label = _FAIL_REASONS.get(
        clean_text(data.get("reason"), max_len=50), "Невідома помилка доставки звіту"
    )
    tg_username = clean_optional(data.get("tg_username"), max_len=MAX_NAME) or ""
    tg_chat_id = _private_chat_id()

    # Look up by token even when expired — rescuing expired-link leads is the point.
    sub = None
    try:
        row = query(
            """SELECT id FROM submissions WHERE tg_token = %s
               AND (tg_token_chat_id IS NULL OR tg_token_chat_id = %s)""",
            (token, tg_chat_id), fetch_one=True,
        )
        if row:
            from models.submission import Submission
            sub = Submission.find_by_id(row["id"])
    except Exception:
        # Swallowed: the bot already told the user delivery failed; a DB hiccup
        # here must not turn into a 500 that makes the bot retry in a loop.
        log.exception("[tg] /report/<token>/failed: could not resolve the submission "
                      "for the reported token (reason=%s)", reason_label)
        sub = None

    if sub:
        try:
            from services.sales_notify import notify_delivery_issue
            notify_delivery_issue(
                reason_label, sub,
                tg_username=tg_username or None, tg_chat_id=tg_chat_id,
            )
        except Exception:
            # Swallowed on purpose (always-200 contract), but a lost alert means
            # a lost lead — must be visible in the logs.
            log.exception("[tg] could not enqueue the delivery-failure alert for "
                          "submission %s (reason=%s)", sub.get("id"), reason_label)

    # Always 200 — fire-and-forget, identical response for known/unknown tokens.
    return jsonify({"ok": True})


# ---------------------------------------------------------------------------
# Save Telegram contact after report delivery (called by the bot)
# ---------------------------------------------------------------------------

@tg_bp.route("/contact/<token>", methods=["POST"])
def save_tg_contact(token):
    """
    Called by the bot after successfully delivering the report.
    Saves tg_chat_id, tg_username, tg_first_name, tg_last_name to the submission
    so the team can follow up with the user via Telegram.
    """
    denied = _reject_unauthorized_bot("/tg/contact")
    if denied:
        return denied

    data = request.get_json(silent=True) or {}

    tg_chat_id = _private_chat_id()
    # Sanitize free-text Telegram identity fields (defense-in-depth: even though
    # the bot is the only normal caller, a stolen token could carry an XSS
    # payload that lands in the admin "Submissions" panel).
    tg_username = clean_optional(data.get("tg_username"), max_len=MAX_NAME) or ""
    tg_first_name = clean_optional(data.get("tg_first_name"), max_len=MAX_NAME) or ""
    tg_last_name = clean_optional(data.get("tg_last_name"), max_len=MAX_NAME) or ""

    # The asserted JSON identity may not differ from the trusted recipient.
    raw_chat_id = data.get("tg_chat_id")
    if isinstance(raw_chat_id, bool) or str(raw_chat_id) != str(tg_chat_id):
        return jsonify({"error": "Telegram recipient mismatch"}), 400

    row = execute(
        """UPDATE submissions
           SET tg_chat_id    = %s,
               tg_username   = %s,
               tg_first_name = %s,
               tg_last_name  = %s
           WHERE tg_token = %s AND tg_token_expires > NOW()
             AND tg_token_chat_id = %s
           RETURNING id""",
        (tg_chat_id, tg_username, tg_first_name, tg_last_name, token, tg_chat_id),
    )

    if not row:
        return jsonify({"error": "Token not found"}), 404

    # Telegram delivery path: now that we have the lead's tg contact, notify
    # the sales team (fire-once — won't duplicate if PATCH already notified).
    try:
        from services.sales_notify import maybe_notify_sales
        maybe_notify_sales(row["id"])
    except Exception:
        # Swallowed: the contact was saved, which is what the bot is waiting on.
        log.exception("[tg] /contact: sales notification failed for submission %s",
                      row["id"])
    try:
        from services.crm_notify import maybe_notify_crm
        maybe_notify_crm(row["id"])
    except Exception:
        log.exception("[tg] /contact: CRM webhook failed for submission %s", row["id"])

    # Schedule the automatic feedback question (no-op unless enabled in admin).
    # Fires `feedback_auto_delay_min` minutes after delivery; once per chat.
    try:
        from services.feedback import maybe_schedule_auto
        maybe_schedule_auto(tg_chat_id, "uk")
    except Exception:
        # Swallowed: an unscheduled feedback question is a nice-to-have, the
        # saved contact is the thing that matters.
        log.exception("[tg] /contact: could not schedule auto-feedback for chat %s "
                      "(submission %s)", tg_chat_id, row["id"])

    return jsonify({"ok": True})


# ---------------------------------------------------------------------------
# Request the report by email FROM the Telegram bot (inline button flow)
# ---------------------------------------------------------------------------

@tg_bp.route("/email/<token>", methods=["POST"])
def send_report_email_via_tg(token):
    """Bot-only: the user tapped "send me the report by email" inside Telegram
    and typed an address. Validates the (still-valid) deep-link token, stores the
    email on the submission (Fernet-encrypted via the model) and queues the SAME
    report email the website sends (token-gated download link, no attachment).

    Returns {ok:true} or {error, reason}. reason ∈
    {"invalid_email","expired","pdf_not_ready","error"}.
    """
    denied = _reject_unauthorized_bot("/tg/email")
    if denied:
        return denied

    data = request.get_json(silent=True) or {}
    email = clean_text(data.get("email"), max_len=254).lower()
    if not email or not _EMAIL_RE.match(email):
        return jsonify({"error": "Invalid email", "reason": "invalid_email"}), 400

    sub_id = _submission_id_for_valid_token(token)
    if not sub_id:
        return jsonify({"error": "Token not found or expired", "reason": "expired"}), 404

    # Persist the email — Submission.update encrypts PII fields.
    try:
        from models.submission import Submission
        Submission.update(sub_id, email=email)
    except Exception:
        log.exception("[tg] /email: could not persist the email on submission %s", sub_id)
        return jsonify({"error": "Could not save email", "reason": "error"}), 500

    from services.report_email import dispatch_report_email
    ok, reason = dispatch_report_email(sub_id)
    if ok:
        return jsonify({"ok": True, "email": email})

    code = 409 if reason == "pdf_not_ready" else 400 if reason == "no_email" else 500
    return jsonify({"error": "Could not send the report", "reason": reason}), code


# ---------------------------------------------------------------------------
# Save lead contacts (email + phone) collected by the bot — NO email is sent.
# ---------------------------------------------------------------------------

@tg_bp.route("/lead/<token>", methods=["POST"])
def save_lead_via_tg(token):
    """Bot-only: the client left their email + phone inside Telegram so the
    sales team can follow up. Validates the (still-valid) deep-link token,
    stores the contacts (Fernet-encrypted via the model) and notifies sales.
    Does NOT send the report email — the report was already delivered in Telegram.

    Returns {ok:true} or {error, reason} where reason ∈
    {"invalid_email","invalid_phone","empty","expired","error"}.
    """
    denied = _reject_unauthorized_bot("/tg/lead")
    if denied:
        return denied

    data = request.get_json(silent=True) or {}
    email = clean_text(data.get("email"), max_len=254).lower()
    phone = clean_text(data.get("phone"), max_len=20)

    if email and not _EMAIL_RE.match(email):
        return jsonify({"error": "Invalid email", "reason": "invalid_email"}), 400
    if phone and not _PHONE_RE.match(phone):
        return jsonify({"error": "Invalid phone", "reason": "invalid_phone"}), 400
    if not email and not phone:
        return jsonify({"error": "Nothing to save", "reason": "empty"}), 400

    sub_id = _submission_id_for_valid_token(token)
    if not sub_id:
        return jsonify({"error": "Token not found or expired", "reason": "expired"}), 404

    fields = {}
    if email:
        fields["email"] = email
    if phone:
        fields["phone"] = phone
    try:
        from models.submission import Submission
        Submission.update(sub_id, **fields)
    except Exception:
        log.exception("[tg] /lead: could not persist contacts on submission %s "
                      "(fields=%s)", sub_id, sorted(fields))
        return jsonify({"error": "Could not save contacts", "reason": "error"}), 500

    # Lead now has name (from the quiz) + a contact channel → notify sales (fire-once).
    try:
        from services.sales_notify import maybe_notify_sales
        maybe_notify_sales(sub_id)
    except Exception:
        # Swallowed: the contacts ARE persisted, so the lead is not lost even if
        # the Telegram notification could not be queued.
        log.exception("[tg] /lead: sales notification failed for submission %s", sub_id)
    try:
        from services.crm_notify import maybe_notify_crm
        maybe_notify_crm(sub_id)
    except Exception:
        log.exception("[tg] /lead: CRM webhook failed for submission %s", sub_id)

    return jsonify({"ok": True})
