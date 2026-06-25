"""Shared report-email dispatch.

Used by BOTH the web `POST /submissions/<id>/send-email` route and the Telegram
`POST /tg/email/<token>` endpoint so the two send the IDENTICAL email. The PDF is
delivered as a secure, token-gated download LINK (no attachment) — a multi-MB PDF
from a young domain trips spam filters; the link stays tiny and lands in the inbox.
"""
import os
import re
import logging
from datetime import datetime

from services.submission_service import get_submission_detail, get_submission_pdf
from services.test_service import get_test_by_id
from services.email_service import send_report_email_async
from models.submission import Submission

log = logging.getLogger(__name__)

# Base URL used to build the report download link inside the email.
PUBLIC_BASE_URL = (os.getenv("PUBLIC_BASE_URL") or "https://bizcheck.md").rstrip("/")

_EMAIL_RE = re.compile(r'^[^@\s]{1,64}@[^@\s]{1,253}\.[^@\s]{1,63}$')

_UK_MONTHS = ["січня", "лютого", "березня", "квітня", "травня", "червня",
              "липня", "серпня", "вересня", "жовтня", "листопада", "грудня"]
_EN_MONTHS = ["January", "February", "March", "April", "May", "June",
              "July", "August", "September", "October", "November", "December"]


def dispatch_report_email(sub_id):
    """Queue the report email for a submission.

    Returns ``(ok: bool, reason: str)`` where reason ∈
    {"ok", "not_found", "no_email", "pdf_not_ready", "error"}.
    The caller maps the reason to an HTTP status / user message.
    """
    try:
        sub = get_submission_detail(sub_id)
    except ValueError:
        return False, "not_found"

    to_email = (sub.get("email") or "").strip().lower()
    if not to_email or not _EMAIL_RE.match(to_email):
        return False, "no_email"

    # The download link only resolves if the PDF is actually stored.
    try:
        pdf_bytes = get_submission_pdf(sub_id)
    except ValueError:
        pdf_bytes = None
    if not pdf_bytes or len(pdf_bytes) < 1024:
        return False, "pdf_not_ready"

    lang = (sub.get("language") or "uk").lower()

    # Test name in the user's language.
    test_name = ""
    test_id = sub.get("test_id")
    if test_id:
        try:
            t = get_test_by_id(test_id)
            if t:
                test_name = (t.get("name_en") if lang == "en" else t.get("name_uk")) or t.get("name_uk") or ""
        except Exception:
            pass

    # Friendly date in the user's language.
    try:
        created_at = sub.get("created_at")
        dt = datetime.fromisoformat(str(created_at).replace("Z", "+00:00")) if created_at else datetime.utcnow()
    except Exception:
        dt = datetime.utcnow()
    months = _EN_MONTHS if lang == "en" else _UK_MONTHS
    date_str = f"{dt.day} {months[dt.month - 1]} {dt.year}"

    score = int(round(float(sub.get("total_score") or 0)))

    first = (sub.get("first_name") or "").strip()
    last = (sub.get("last_name") or "").strip()
    safe_first = re.sub(r'[^\w\-]', '_', first)[:30]
    safe_last = re.sub(r'[^\w\-]', '_', last)[:30]
    pdf_filename = f"BizCheck_{safe_first}_{safe_last}.pdf".replace("__", "_").strip("_") or f"BizCheck_{sub_id}.pdf"

    token = Submission.get_token(sub_id)
    download_url = (
        f"{PUBLIC_BASE_URL}/api_crowe_bizcheck/submissions/{sub_id}/report.pdf?t={token}"
        if token else None
    )
    if not download_url:
        log.warning("[report-email] sub %s: no submission_token — email will have no download link", sub_id)

    try:
        send_report_email_async(
            to_email=to_email,
            first_name=first or ("Client" if lang == "en" else "Клієнт"),
            lang=lang,
            test_name=test_name or ("BizCheck report" if lang == "en" else "Звіт BizCheck"),
            date_str=date_str,
            score=score,
            download_url=download_url,
            pdf_filename=pdf_filename,
        )
    except Exception as e:
        log.exception("[report-email] dispatch failed for sub %s: %s", sub_id, e)
        return False, "error"

    log.info("[report-email] queued for sub %s → %s (download link)", sub_id, to_email)
    return True, "ok"
