"""Submission routes — public quiz submission + admin data access."""
import re
import base64
import logging

log = logging.getLogger(__name__)
from flask import Blueprint, request, jsonify, Response
from services.submission_service import (
    create_submission, update_submission, save_submission_pdf,
    get_all_submissions, get_submission_pdf, get_submission_detail,
    delete_submission, delete_all_submissions, count_submissions,
)
from models.submission import Submission
from middleware.admin_middleware import admin_required, submission_owner_or_admin
from utils.validators import clean_text, clean_optional, clean_json_content

submissions_bp = Blueprint("submissions", __name__, url_prefix="/api_crowe_bizcheck/submissions")

# Allowed fields for PATCH /submissions/{id} (token-gated).
# Anything not listed here is silently dropped — even with a valid token, the
# client can only mutate the operational/PII fields it owns. tg_* and pdf_data
# stay off-limits (bot-only / dedicated endpoints).
_PATCH_ALLOWED = {
    "sector", "company_size", "company_age", "company_revenue", "status",
    "language", "answers_json", "block_scores_json",
    "selected_answers_json", "total_score",
    "first_name", "last_name", "email", "phone", "consent",
}

_VALID_STATUSES = {"started", "in_progress", "completed", "abandoned"}

_EMAIL_RE = re.compile(r'^[^@\s]{1,64}@[^@\s]{1,253}\.[^@\s]{1,63}$')

_PHONE_RE = re.compile(r'^\+?[\d\s\-()]{7,20}$')

def _strip(val, max_len=200):
    """HTML-stripping, control-char-removing string normalizer.

    All user-submitted free-text passes through here so a payload like
    `<svg/onload=...>` becomes the empty string before it ever hits the DB.
    Defense in depth: React already escapes on render, but storing a clean
    value protects every future consumer (PDF generator, exports, etc.).
    """
    return clean_text(val, max_len=max_len)


def _clean_json_field(value):
    """Sanitize a nested answers/block-scores payload.

    The SPA sends these as objects; a pre-serialized string is decoded first so
    the sanitizer walks the structure instead of mangling — and truncating — the
    whole serialized blob. Undecodable strings are left to the service layer.
    """
    if isinstance(value, str):
        import json
        try:
            value = json.loads(value)
        except (ValueError, TypeError):
            return value
    if isinstance(value, (dict, list)):
        return clean_json_content(value)
    return value


@submissions_bp.route("", methods=["POST"])
def create():
    data = request.get_json(silent=True) or {}

    errors = []
    first_name = _strip(data.get("first_name"), 30)
    last_name = _strip(data.get("last_name"), 30)
    email = _strip(data.get("email"), 254).lower()
    phone = _strip(data.get("phone"), 20)

    # Contact info is now collected after the quiz; only validate fields if present.
    if email and not _EMAIL_RE.match(email):
        errors.append("Invalid email address")
    if phone and not _PHONE_RE.match(phone):
        errors.append("Invalid phone number")
    if errors:
        return jsonify({"errors": errors}), 400

    # Coerce test_id to int — a malformed value (string, list, …) reaching the
    # DB layer raised HTTP 500 (input-validation finding). Reject cleanly.
    test_id = data.get("test_id")
    if test_id is not None:
        try:
            test_id = int(test_id)
        except (TypeError, ValueError):
            return jsonify({"errors": ["Invalid test_id"]}), 400
    test_slug = _strip(data.get("test_slug"), 64).lower() or None

    try:
        sub = create_submission(
            first_name or None, last_name or None, email or None, phone or None,
            bool(data.get("consent", False)),
            test_id=test_id, test_slug=test_slug,
        )
        # `submission_token` is returned ONLY by create (RETURNING _SELECT_COLS_WITH_TOKEN);
        # update_submission below uses _SELECT_COLS which excludes the token by design.
        # Preserve it across the language patch so the client receives it exactly once.
        created_token = sub.get("submission_token") if sub else None
        # language: whitelist strict — coloana e VARCHAR(5) și doar uk/en sunt valide.
        # Fără asta, un input cu caractere speciale e expandat de bleach (ex. " → &quot;),
        # depășește VARCHAR(5) și PostgreSQL aruncă „value too long" → HTTP 500.
        lang_in = data.get("language")
        language = lang_in if lang_in in ("uk", "en") else "uk"
        if sub and language:
            updated = update_submission(sub["id"], {"language": language})
            if updated:
                updated["submission_token"] = created_token
                sub = updated
        return jsonify({"submission": sub}), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


_PII_WRITE_ONCE = ("first_name", "last_name", "email", "phone", "consent")


@submissions_bp.route("/<int:sub_id>", methods=["PATCH"])
@submission_owner_or_admin
def update(sub_id):
    data = request.get_json(silent=True) or {}
    filtered = {k: v for k, v in data.items() if k in _PATCH_ALLOWED}
    # Sanitize free-text fields; max_len e fixat la dimensiunea coloanei din DB ca să
    # evităm overflow de VARCHAR (bleach poate expanda caracterele → „value too long" → 500).
    for str_field, mx in (("sector", 200), ("company_size", 50), ("company_age", 50), ("company_revenue", 50), ("status", 20)):
        if str_field in filtered and isinstance(filtered[str_field], str):
            filtered[str_field] = clean_text(filtered[str_field], max_len=mx)
    # language: whitelist strict (coloana VARCHAR(5); doar uk/en).
    if "language" in filtered:
        filtered["language"] = filtered["language"] if filtered["language"] in ("uk", "en") else "uk"
    if "first_name" in filtered and isinstance(filtered["first_name"], str):
        filtered["first_name"] = clean_optional(filtered["first_name"], max_len=30)
    if "last_name" in filtered and isinstance(filtered["last_name"], str):
        filtered["last_name"] = clean_optional(filtered["last_name"], max_len=30)
    if "email" in filtered and isinstance(filtered["email"], str):
        em = clean_text(filtered["email"], max_len=254).lower()
        if em and not _EMAIL_RE.match(em):
            return jsonify({"error": "Invalid email address"}), 400
        filtered["email"] = em or None
    if "phone" in filtered and isinstance(filtered["phone"], str):
        ph = clean_text(filtered["phone"], max_len=20)
        if ph and not _PHONE_RE.match(ph):
            return jsonify({"error": "Invalid phone number"}), 400
        filtered["phone"] = ph or None
    # The *_json payloads are nested structures the CLIENT builds (block titles,
    # answer labels) and they are re-emitted by the Excel export and the admin
    # HTML report → sanitize every string inside, leave the scores as numbers.
    for json_field in ("answers_json", "block_scores_json", "selected_answers_json"):
        if json_field in filtered:
            filtered[json_field] = _clean_json_field(filtered[json_field])
    if "consent" in filtered:
        filtered["consent"] = bool(filtered["consent"])
    if "status" in filtered and filtered["status"] not in _VALID_STATUSES:
        return jsonify({"error": "Invalid status"}), 400
    if "total_score" in filtered:
        try:
            filtered["total_score"] = max(0, min(100, float(filtered["total_score"])))
        except (TypeError, ValueError):
            del filtered["total_score"]

    # Write-once guard: PII fields can only be set if not already present.
    # Protects against a third party with a known sub_id overwriting
    # someone else's contact info.
    pii_fields_in_patch = [f for f in _PII_WRITE_ONCE if f in filtered]
    if pii_fields_in_patch:
        try:
            existing = get_submission_detail(sub_id)
        except ValueError as e:
            return jsonify({"error": str(e)}), 404
        for f in pii_fields_in_patch:
            current = existing.get(f)
            # `consent` is a bool: False is "not yet given", True is locked-in.
            already_set = (current is True) if f == "consent" else bool(current)
            if already_set:
                del filtered[f]

    try:
        sub = update_submission(sub_id, filtered)
    except ValueError as e:
        return jsonify({"error": str(e)}), 404

    # Notify the sales team once the lead has a name + contact channel.
    # Fire-and-forget + fire-once (claimed atomically inside the service).
    try:
        from services.sales_notify import maybe_notify_sales
        maybe_notify_sales(sub_id)
    except Exception:
        # Swallowed ON PURPOSE: the notification must never break the
        # user-facing save. Logged with a stack trace so the failure is
        # visible in `docker compose logs` instead of vanishing.
        log.exception("[sales] enqueue failed after PATCH of submission %s", sub_id)
    return jsonify({"submission": sub})


@submissions_bp.route("/<int:sub_id>/pdf", methods=["POST"])
@submission_owner_or_admin
def upload_pdf(sub_id):
    data = request.get_json(silent=True) or {}
    pdf_base64 = data.get("pdf")
    if not pdf_base64:
        return jsonify({"error": "PDF data is required"}), 400
    if len(pdf_base64) > 28_000_000:
        return jsonify({"error": "PDF too large (max 20 MB)"}), 413
    try:
        pdf_bytes = base64.b64decode(pdf_base64, validate=True)
    except Exception:
        return jsonify({"error": "Invalid PDF data"}), 400
    if not pdf_bytes.startswith(b"%PDF"):
        return jsonify({"error": "File is not a valid PDF"}), 400
    try:
        save_submission_pdf(sub_id, pdf_bytes)
        return jsonify({"message": "PDF saved"})
    except ValueError as e:
        return jsonify({"error": str(e)}), 404


@submissions_bp.route("/<int:sub_id>/send-email", methods=["POST"])
@submission_owner_or_admin
def send_email(sub_id):
    """Dispatch the stored report to the submission's email address.

    Fire-and-forget: queues a background send and returns 202 immediately.
    All the heavy lifting (validation, localized template, token-gated download
    link) lives in services.report_email so the Telegram flow reuses it verbatim.
    """
    from services.report_email import dispatch_report_email
    ok, reason = dispatch_report_email(sub_id)
    if ok:
        return jsonify({"message": "Email queued for delivery"}), 202

    status_map = {
        "not_found":     (404, "Submission not found"),
        "no_email":      (400, "No valid email on submission"),
        "pdf_not_ready": (409, "Report PDF not ready yet. Please retry in a moment."),
        "error":         (500, "Failed to queue email"),
    }
    code, msg = status_map.get(reason, (500, "Failed to queue email"))
    log.warning("[send-email] sub %s not sent: %s", sub_id, reason)
    return jsonify({"error": msg}), code


@submissions_bp.route("/<int:sub_id>/report.pdf", methods=["GET"])
def public_report_pdf(sub_id):
    """Public, token-gated report PDF — the target of the email download button.

    The emailed link carries ?t=<submission_token>. We validate the token
    against the id manually (no cookie/CSRF — the link must open in any browser,
    even one the user isn't logged into). Wrong/missing token → 403, identical
    to an unknown id, so the id space can't be enumerated.

    Served `inline` so the browser OPENS the report in a PDF viewer tab; the
    viewer's own toolbar still lets the user download or print it.
    """
    token = request.args.get("t", "")
    if not Submission.find_id_by_token(sub_id, token):
        return jsonify({"error": "Forbidden"}), 403

    try:
        pdf_bytes = get_submission_pdf(sub_id)
    except ValueError:
        pdf_bytes = None
    if not pdf_bytes:
        return jsonify({"error": "Report not available"}), 404

    try:
        sub = get_submission_detail(sub_id)
        first = re.sub(r'[^\w\-]', '_', (sub.get("first_name") or "").strip())[:30]
        last = re.sub(r'[^\w\-]', '_', (sub.get("last_name") or "").strip())[:30]
        fname = f"BizCheck_{first}_{last}.pdf".replace("__", "_").strip("_")
    except Exception:
        # Cosmetic only — fall back to the id-based filename below, but log it:
        # a failure here usually means PII decryption is broken.
        log.warning("[report.pdf] could not build filename for sub %s", sub_id, exc_info=True)
        fname = ""
    if not fname or fname == "BizCheck_.pdf":
        fname = f"BizCheck_{sub_id}.pdf"

    return Response(
        pdf_bytes,
        mimetype="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{fname}"'},
    )


# Pagination policy for GET /submissions (admin listing).
# OPT-IN by design: the existing admin SPA calls this endpoint with no paging
# params and renders `data.submissions` as a plain array, so silently slicing
# the result would hide rows. Paging engages only when `page` or `per_page` is
# present; without them the response is byte-for-byte what it was before, plus
# the new `total` field and the X-Total-Count header.
DEFAULT_PER_PAGE = 50
MAX_PER_PAGE = 200


def _paging_params(args):
    """Parse ?page=&per_page= → (page, per_page) or (None, None) when absent.

    Out-of-range values are clamped rather than rejected: a bad page number is
    a UI bug, not an attack, and a 400 here would just break the table.
    """
    if "page" not in args and "per_page" not in args:
        return None, None
    try:
        page = max(1, int(args.get("page", 1)))
    except (TypeError, ValueError):
        page = 1
    try:
        per_page = int(args.get("per_page", DEFAULT_PER_PAGE))
    except (TypeError, ValueError):
        per_page = DEFAULT_PER_PAGE
    per_page = max(1, min(MAX_PER_PAGE, per_page))
    return page, per_page


@submissions_bp.route("", methods=["GET"])
@admin_required
def get_all():
    """GET /submissions[?test_id=][&page=&per_page=] — admin listing.

    Response (always): {"submissions": [...], "count": <len of this page>,
                        "total": <rows matching the filter>}
    Response (paged):  additionally {"page", "per_page", "total_pages"}
    Header (always):   X-Total-Count: <total>
    """
    test_id = request.args.get("test_id", type=int)
    page, per_page = _paging_params(request.args)

    total = count_submissions(test_id=test_id)
    if page is None:
        subs = get_all_submissions(test_id=test_id)
        payload = {"submissions": subs, "count": len(subs), "total": total}
    else:
        subs = get_all_submissions(
            test_id=test_id, limit=per_page, offset=(page - 1) * per_page,
        )
        payload = {
            "submissions": subs,
            "count": len(subs),
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": (total + per_page - 1) // per_page if per_page else 0,
        }

    resp = jsonify(payload)
    resp.headers["X-Total-Count"] = str(total)
    return resp


@submissions_bp.route("/<int:sub_id>", methods=["GET"])
@admin_required
def get_detail(sub_id):
    try:
        sub = get_submission_detail(sub_id)
        return jsonify({"submission": sub})
    except ValueError as e:
        return jsonify({"error": str(e)}), 404


@submissions_bp.route("/<int:sub_id>/pdf", methods=["GET"])
@admin_required
def download_pdf(sub_id):
    try:
        sub = get_submission_detail(sub_id)
        pdf_bytes = get_submission_pdf(sub_id)
        first = re.sub(r'[^\w\-]', '_', (sub.get("first_name") or "").strip())[:30]
        last = re.sub(r'[^\w\-]', '_', (sub.get("last_name") or "").strip())[:30]
        fname = f"BizCheck_{first}_{last}.pdf" if first or last else f"BizCheck_report_{sub_id}.pdf"
        return Response(
            pdf_bytes,
            mimetype="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{fname}"'},
        )
    except ValueError as e:
        return jsonify({"error": str(e)}), 404


@submissions_bp.route("/<int:sub_id>", methods=["DELETE"])
@admin_required
def delete_one(sub_id):
    try:
        delete_submission(sub_id)
        return jsonify({"message": "Submission deleted"})
    except ValueError as e:
        return jsonify({"error": str(e)}), 404


@submissions_bp.route("", methods=["DELETE"])
@admin_required
def delete_all():
    delete_all_submissions()
    return jsonify({"message": "All submissions deleted"})


@submissions_bp.route("/export/excel", methods=["GET"])
@admin_required
def export_excel():
    """GET /api/submissions/export/excel — Export all submissions as Excel (admin).

    Multi-sheet: "Sumar" (toate, cu răspunsuri), "Finalizați" (completed) și
    "În proces" (nefinalizați — doar contact + companie + scor total).
    """
    from services.export_service import build_all_submissions_workbook, workbook_to_bytes

    try:
        wb = build_all_submissions_workbook()
        data = workbook_to_bytes(wb)
    except Exception:
        log.exception("[export] all-submissions Excel failed")
        return jsonify({"error": "Export failed. Check the server logs."}), 500
    return Response(
        data,
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=bizcheck_submissions.xlsx"},
    )


# ─────────────────────────────────────────────────────────────
#  Per-test report exports (used by the admin "Rapoarte" tab)
# ─────────────────────────────────────────────────────────────

_XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


@submissions_bp.route("/<int:sub_id>/report", methods=["GET"])
@admin_required
def view_single_user_report(sub_id):
    """Standalone HTML report for one submission — always available (PDF-independent).

    Opened in a new tab from the admin table so the report can be reviewed even
    when the user never uploaded a PDF.
    """
    from services.export_service import build_single_user_report_html
    try:
        page, _name = build_single_user_report_html(sub_id)
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception:
        log.exception("[export] single-user HTML report failed for sub %s", sub_id)
        return jsonify({"error": "Report generation failed. Check the server logs."}), 500
    return Response(page, mimetype="text/html; charset=utf-8")


@submissions_bp.route("/<int:sub_id>/export/excel", methods=["GET"])
@admin_required
def export_single_user_excel(sub_id):
    """Detailed single-user Excel (one sheet with company info + answers)."""
    from services.export_service import build_single_user_workbook, workbook_to_bytes
    try:
        wb, stem = build_single_user_workbook(sub_id)
        data = workbook_to_bytes(wb)
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception:
        log.exception("[export] single-user Excel failed for sub %s", sub_id)
        return jsonify({"error": "Export failed. Check the server logs."}), 500
    return Response(
        data,
        mimetype=_XLSX_MIME,
        headers={"Content-Disposition": f'attachment; filename="BizCheck_{stem}.xlsx"'},
    )


@submissions_bp.route("/tests/<int:test_id>/export/excel-combined", methods=["GET"])
@admin_required
def export_test_combined_excel(test_id):
    """One Excel file for a test — summary sheet + one detail sheet per user."""
    from services.export_service import build_test_combined_workbook, workbook_to_bytes
    try:
        wb = build_test_combined_workbook(test_id)
        data = workbook_to_bytes(wb)
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception:
        log.exception("[export] combined Excel failed for test %s", test_id)
        return jsonify({"error": "Export failed. Check the server logs."}), 500
    return Response(
        data,
        mimetype=_XLSX_MIME,
        headers={
            "Content-Disposition": f'attachment; filename="BizCheck_test_{test_id}_combined.xlsx"',
        },
    )


def _send_temp_zip(path, download_name):
    """Stream a freshly built temp archive and delete it, always.

    The unlink is registered with ``after_this_request``, which runs while the
    response is being finalized — i.e. AFTER ``send_file`` has already opened the
    file, and BEFORE the body is handed to the WSGI server. On POSIX the open
    descriptor keeps streaming from the now-unlinked inode, so the transfer still
    completes and the bytes are reclaimed even if the client aborts halfway (an
    end-of-stream hook would never fire in that case).
    """
    import os
    from flask import after_this_request, send_file

    @after_this_request
    def _cleanup(resp):
        try:
            os.remove(path)
        except OSError:
            # Temp file already gone / unlink raced — the OS reaps /tmp anyway.
            log.warning("[export] could not remove temp zip %s", path, exc_info=True)
        return resp

    return send_file(
        path,
        mimetype="application/zip",
        as_attachment=True,
        download_name=download_name,
    )


@submissions_bp.route("/tests/<int:test_id>/export/excels-zip", methods=["GET"])
@admin_required
def export_test_excels_zip(test_id):
    """ZIP of per-user Excel files for a test, streamed from a temp file.

    Built on disk rather than in a BytesIO: the archive never sits whole in the
    worker's heap, so N concurrent exports cost N open files instead of N copies
    of the archive. Still synchronous — the build is well under a second.
    """
    from services.export_service import build_excels_zip_for_test
    try:
        path = build_excels_zip_for_test(test_id)
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception:
        log.exception("[export] Excel ZIP failed for test %s", test_id)
        return jsonify({"error": "Export failed. Check the server logs."}), 500

    return _send_temp_zip(path, f"BizCheck_test_{test_id}_excels.zip")


@submissions_bp.route("/tests/<int:test_id>/export/pdfs-zip", methods=["GET"])
@admin_required
def export_test_pdfs_zip(test_id):
    """ZIP of per-user PDF files for a test, streamed from disk (no size cap).

    LEGACY / synchronous. Kept working so the current admin SPA does not break,
    but it pins a gunicorn worker for the whole build (~32 s at 500 submissions).
    New callers should use the job trio below:
        POST .../export/pdfs-zip/jobs  →  GET /exports/jobs/{token}
                                       →  GET /exports/jobs/{token}/download
    """
    from services.export_service import build_pdfs_zip_for_test

    # No cap for admin (max_bytes=None) — streaming from disk avoids OOM.
    try:
        path = build_pdfs_zip_for_test(test_id)
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception:
        log.exception("[export] PDF ZIP failed for test %s", test_id)
        return jsonify({"error": "Export failed. Check the server logs."}), 500

    return _send_temp_zip(path, f"BizCheck_test_{test_id}_pdfs.zip")


# ─────────────────────────────────────────────────────────────
#  Asynchronous PDF-ZIP export (job + status + download)
# ─────────────────────────────────────────────────────────────
# The synchronous route above blocks one of the 4 gunicorn workers for the whole
# build. These three endpoints move that work to a background thread and let the
# admin poll. State + artifact live in a shared spool directory so the polling
# request can land on ANY worker — see services/export_jobs.py for the rationale.
#
# Auth is identical to the synchronous export: @admin_required on all three.
# The job token is a 256-bit secrets.token_urlsafe value, never a counter, so
# job ids cannot be enumerated even by another authenticated admin.


@submissions_bp.route("/tests/<int:test_id>/export/pdfs-zip/jobs", methods=["POST"])
@admin_required
def start_test_pdfs_zip_job(test_id):
    """Start (or join) an async PDF-ZIP export for a test. 202 + job record."""
    from services import export_jobs

    try:
        job = export_jobs.create_job(
            test_id,
            kind=export_jobs.KIND_PDFS_ZIP,
            filename=f"BizCheck_test_{test_id}_pdfs.zip",
        )
    except export_jobs.JobQueueFull:
        return jsonify({"error": "Export queue is full. Try again in a few minutes."}), 503
    except Exception:
        log.exception("[export] could not start PDF ZIP job for test %s", test_id)
        return jsonify({"error": "Export failed. Check the server logs."}), 500

    return jsonify({"job": export_jobs.public_job(job)}), 202


@submissions_bp.route("/exports/jobs/<token>", methods=["GET"])
@admin_required
def export_job_status(token):
    """Poll an export job. 404 once it is unknown, expired or swept."""
    from services import export_jobs

    job = export_jobs.get_job(token)
    if job is None:
        return jsonify({"error": "Export job not found or expired"}), 404
    return jsonify({"job": export_jobs.public_job(job)})


@submissions_bp.route("/exports/jobs/<token>/download", methods=["GET"])
@admin_required
def export_job_download(token):
    """Stream a finished export archive from the spool directory."""
    from flask import send_file
    from services import export_jobs

    job = export_jobs.get_job(token)
    if job is None:
        return jsonify({"error": "Export job not found or expired"}), 404

    state = job.get("state")
    if state != export_jobs.STATE_READY:
        # 409, not 404: the job exists, it is just not downloadable yet.
        return jsonify({
            "error": "Export is not ready",
            "state": state,
            "job_error": job.get("error"),
        }), 409

    path = export_jobs.artifact_path(token)
    if not path:
        log.error("[export] job %s is 'ready' but the archive is gone", token)
        return jsonify({"error": "Export archive is no longer available"}), 410

    # Marked BEFORE streaming: an after_this_request hook would not fire if the
    # client aborts mid-transfer, and a job that is never marked would sit on the
    # long "ready" TTL holding gigabytes.
    export_jobs.mark_downloaded(token)

    return send_file(
        path,
        mimetype="application/zip",
        as_attachment=True,
        download_name=job.get("filename") or "BizCheck_export.zip",
        conditional=True,          # keeps Range requests / resume working
    )
