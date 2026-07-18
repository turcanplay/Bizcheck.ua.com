"""
Telegram bot bridge endpoints.

POST /api/tg/link/<sub_id>     — generate a one-time deep-link token
GET  /api/tg/report/<token>    — return submission data + PDF (called by the bot)
POST /api/tg/contact/<token>   — save Telegram chat_id + username after delivery
"""

import os
import re
import uuid
import base64
from datetime import datetime, timedelta, timezone

from flask import Blueprint, jsonify, request
from database.db import execute, query
from utils.crypto import decrypt_value
from middleware.admin_middleware import submission_owner_or_admin
from utils.validators import clean_text, clean_optional, MAX_NAME

tg_bp = Blueprint("telegram", __name__, url_prefix="/api_crowe_bizcheck/tg")

_TOKEN_TTL_HOURS = 24

_EMAIL_RE = re.compile(r'^[^@\s]{1,64}@[^@\s]{1,253}\.[^@\s]{1,63}$')
_PHONE_RE = re.compile(r'^\+?[\d\s\-()]{7,20}$')


def _submission_id_for_valid_token(token):
    """Return the submission id for a non-expired tg_token, else None."""
    row = query(
        "SELECT id, tg_token_expires FROM submissions WHERE tg_token = %s",
        (token,), fetch_one=True,
    )
    if not row:
        return None
    exp = row.get("tg_token_expires")
    if exp:
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > exp:
            return None
    return row["id"]


# ---------------------------------------------------------------------------
# Generate deep-link token
# ---------------------------------------------------------------------------

@tg_bp.route("/link/<int:sub_id>", methods=["POST"])
@submission_owner_or_admin
def generate_tg_link(sub_id):
    """
    Create a one-time Telegram deep-link token for a submission.
    Returns { token, url, pdf_ready } where pdf_ready=true iff the submission
    already has its PDF persisted (user can safely click the bot link).
    Token expires after TOKEN_TTL_HOURS hours.
    """
    token = uuid.uuid4().hex
    expires = datetime.now(timezone.utc) + timedelta(hours=_TOKEN_TTL_HOURS)
    bot_username = os.getenv("TELEGRAM_BOT_USERNAME", "CROWE_BIZCHECK_bot")

    existing = query(
        "SELECT tg_token, tg_token_expires, pdf_data IS NOT NULL AS has_pdf FROM submissions WHERE id = %s",
        (sub_id,), fetch_one=True,
    )
    if not existing:
        return jsonify({"error": "Submission not found"}), 404

    pdf_ready = bool(existing.get("has_pdf"))

    # Don't overwrite an existing valid token
    ex_exp = existing.get("tg_token_expires")
    if ex_exp and existing.get("tg_token"):
        if ex_exp.tzinfo is None:
            ex_exp = ex_exp.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) < ex_exp:
            return jsonify({
                "token": existing["tg_token"],
                "url": f"https://t.me/{bot_username}?start={existing['tg_token']}",
                "pdf_ready": pdf_ready,
            })

    execute(
        "UPDATE submissions SET tg_token = %s, tg_token_expires = %s WHERE id = %s RETURNING id",
        (token, expires, sub_id),
    )

    return jsonify({
        "token": token,
        "url": f"https://t.me/{bot_username}?start={token}",
        "pdf_ready": pdf_ready,
    })


# ---------------------------------------------------------------------------
# Fetch report by token (used internally by the bot)
# ---------------------------------------------------------------------------

@tg_bp.route("/report/<token>", methods=["GET"])
def get_report_by_token(token):
    """
    Return submission data + base64-encoded PDF for a valid token.
    Called exclusively by the Telegram bot service.
    """
    row = query(
        """SELECT id, first_name, last_name, total_score, block_scores_json,
                  tg_token_expires, pdf_data, language
           FROM submissions
           WHERE tg_token = %s""",
        (token,),
        fetch_one=True,
    )

    if not row:
        return jsonify({"error": "Token not found"}), 404

    expires = row.get("tg_token_expires")
    if expires:
        # psycopg2 returns aware datetime; compare safely
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > expires:
            return jsonify({"error": "Token expired"}), 404

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
    data = request.get_json(silent=True) or {}
    reason_label = _FAIL_REASONS.get(
        (data.get("reason") or "").strip(), "Невідома помилка доставки звіту"
    )
    tg_username = clean_optional(data.get("tg_username"), max_len=MAX_NAME) or ""
    try:
        tg_chat_id = int(data.get("tg_chat_id"))
    except (TypeError, ValueError):
        tg_chat_id = None

    # Look up by token even when expired — rescuing expired-link leads is the point.
    sub = None
    try:
        row = query("SELECT id FROM submissions WHERE tg_token = %s", (token,), fetch_one=True)
        if row:
            from models.submission import Submission
            sub = Submission.find_by_id(row["id"])
    except Exception:
        sub = None

    if sub:
        try:
            from services.sales_notify import notify_delivery_issue
            notify_delivery_issue(
                reason_label, sub,
                tg_username=tg_username or None, tg_chat_id=tg_chat_id,
            )
        except Exception:
            pass

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
    data = request.get_json(silent=True) or {}

    tg_chat_id = data.get("tg_chat_id")
    # Sanitize free-text Telegram identity fields (defense-in-depth: even though
    # the bot is the only normal caller, a stolen token could carry an XSS
    # payload that lands in the admin "Submissions" panel).
    tg_username = clean_optional(data.get("tg_username"), max_len=MAX_NAME) or ""
    tg_first_name = clean_optional(data.get("tg_first_name"), max_len=MAX_NAME) or ""
    tg_last_name = clean_optional(data.get("tg_last_name"), max_len=MAX_NAME) or ""

    # tg_chat_id must be a positive integer (Telegram chat IDs are int64).
    try:
        tg_chat_id = int(tg_chat_id)
    except (TypeError, ValueError):
        return jsonify({"error": "tg_chat_id must be an integer"}), 400

    # Validate token has not expired
    tok_row = query(
        "SELECT tg_token_expires FROM submissions WHERE tg_token = %s",
        (token,), fetch_one=True,
    )
    if not tok_row:
        return jsonify({"error": "Token not found"}), 404
    tok_exp = tok_row.get("tg_token_expires")
    if tok_exp:
        if tok_exp.tzinfo is None:
            tok_exp = tok_exp.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > tok_exp:
            return jsonify({"error": "Token expired"}), 404

    row = execute(
        """UPDATE submissions
           SET tg_chat_id    = %s,
               tg_username   = %s,
               tg_first_name = %s,
               tg_last_name  = %s
           WHERE tg_token = %s
           RETURNING id""",
        (tg_chat_id, tg_username, tg_first_name, tg_last_name, token),
    )

    if not row:
        return jsonify({"error": "Token not found"}), 404

    # Telegram delivery path: now that we have the lead's tg contact, notify
    # the sales team (fire-once — won't duplicate if PATCH already notified).
    try:
        from services.sales_notify import maybe_notify_sales
        maybe_notify_sales(row["id"])
    except Exception:
        pass

    # Schedule the automatic feedback question (no-op unless enabled in admin).
    # Fires `feedback_auto_delay_min` minutes after delivery; once per chat.
    try:
        from services.feedback import maybe_schedule_auto
        lang_row = query("SELECT language FROM submissions WHERE id = %s", (row["id"],), fetch_one=True)
        maybe_schedule_auto(tg_chat_id, (lang_row or {}).get("language") or "en")
    except Exception:
        pass

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
        return jsonify({"error": "Could not save contacts", "reason": "error"}), 500

    # Lead now has name (from the quiz) + a contact channel → notify sales (fire-once).
    try:
        from services.sales_notify import maybe_notify_sales
        maybe_notify_sales(sub_id)
    except Exception:
        pass

    return jsonify({"ok": True})
