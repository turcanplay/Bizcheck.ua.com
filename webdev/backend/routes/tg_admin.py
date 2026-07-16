"""
Bot-only export endpoints, consumed by the group bot (webdev/groupbot/) to serve
the /excel and /pdf commands inside the team's Telegram group.

These return PII (full Excel exports and the PDF archive of a test), so unlike
the feedback endpoints they are guarded by a STRICT shared secret: when
BOT_SHARED_SECRET is unset the endpoints are DISABLED (403) rather than open.
The group bot sends the secret in the X-Bot-Secret header.

  GET /tg/exports/tests              list {id, name} for the inline test picker
  GET /tg/exports/excel/<test_id>    combined multi-sheet Excel for one test
                                     (?period=today|7d|30d|month|all)
"""
import os
from datetime import date, timedelta

from flask import Blueprint, jsonify, request, Response

from models.test import Test
from models.submission import Submission
from services.export_service import (
    build_test_combined_workbook,
    workbook_to_bytes,
    list_submissions_for_picker,
    single_pdf_filename,
    export_basename,
)

tg_exports_bp = Blueprint("tg_exports", __name__, url_prefix="/api_crowe_bizcheck/tg/exports")


def _authorized(req) -> bool:
    """STRICT: a configured secret is mandatory. No secret → feature off (403)."""
    secret = (os.getenv("BOT_SHARED_SECRET") or "").strip()
    if not secret:
        return False
    return req.headers.get("X-Bot-Secret", "") == secret


def _admin_url() -> str:
    base = (os.getenv("PUBLIC_BASE_URL") or "https://bizcheck.md").rstrip("/")
    return f"{base}/admin_bizcheck_md_crowe/"


@tg_exports_bp.before_request
def _guard():
    if not _authorized(request):
        return jsonify({"error": "forbidden"}), 403


@tg_exports_bp.route("/tests", methods=["GET"])
def list_tests():
    tests = Test.find_all() or []
    return jsonify([
        {"id": t["id"], "name": t.get("name_uk") or t.get("name_en") or f"Test {t['id']}"}
        for t in tests
    ])


def _period_range(period):
    """Map a period keyword to an inclusive (date_from, date_to) pair.

    Unknown / "all" → (None, None) meaning no date filter.
    """
    today = date.today()
    if period == "today":
        return today, today
    if period == "7d":
        return today - timedelta(days=6), today
    if period == "30d":
        return today - timedelta(days=29), today
    if period == "month":
        return today.replace(day=1), today
    return None, None


@tg_exports_bp.route("/excel/<int:test_id>", methods=["GET"])
def excel(test_id):
    period = request.args.get("period") or "all"
    date_from, date_to = _period_range(period)
    wb = build_test_combined_workbook(test_id, date_from, date_to)
    data = workbook_to_bytes(wb)
    filename = export_basename(test_id, "Excel") + f"_{period}.xlsx"
    return Response(
        data,
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@tg_exports_bp.route("/submissions/<int:test_id>", methods=["GET"])
def submissions(test_id):
    q = request.args.get("q")
    return jsonify(list_submissions_for_picker(test_id, q))


@tg_exports_bp.route("/pdf/<int:submission_id>", methods=["GET"])
def single_pdf(submission_id):
    sub = Submission.find_by_id(submission_id)
    if not sub:
        return jsonify({"error": "no_pdf"}), 404
    pdf = Submission.get_pdf(submission_id)
    if not pdf:
        return jsonify({"error": "no_pdf"}), 404
    if len(pdf) > 49_000_000:
        return jsonify({"too_big": True, "admin_url": _admin_url()}), 413
    return Response(
        pdf,
        mimetype="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{single_pdf_filename(sub)}"'},
    )
