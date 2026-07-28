"""Template routes — public list + admin CRUD + file upload + ZIP download."""

import io
import base64
import zipfile
import re

from flask import Blueprint, jsonify, request, Response

from services.template_service import (
    list_active_templates, list_all_templates,
    get_template_with_files, create_template, update_template, delete_template,
    add_file, delete_file, get_file_raw, iter_template_files_raw,
)
from models.template import Template
from middleware.admin_middleware import admin_required
from utils.validators import (
    clean_content, clean_content_optional, clean_slug, clean_bool, clean_text,
    MAX_TITLE, MAX_LONG,
)

templates_bp = Blueprint("templates", __name__, url_prefix="/api_crowe_bizcheck/templates")
admin_templates_bp = Blueprint("admin_templates", __name__, url_prefix="/api_crowe_bizcheck/admin/templates")

# Same column widths as tests: title_* VARCHAR(255), description_* TEXT,
# category VARCHAR(50), filename VARCHAR(255).
MAX_CATEGORY = 50
MAX_FEATURE = 200
MAX_CURRENCY = 8
MAX_FILENAME = 255


def _clean_features(value):
    if value is None:
        return None
    if isinstance(value, str):
        return clean_content(value, MAX_LONG)
    if isinstance(value, (list, tuple)):
        return [clean_content(v, MAX_FEATURE) for v in value]
    return []


def _clean_template_payload(data):
    """Sanitize a PUT body, preserving which keys were present (see tests.py)."""
    out = dict(data)
    if (out.get("slug") or "").strip():
        out["slug"] = clean_slug(out["slug"])
    elif "slug" in out:
        out["slug"] = ""
    for key, cap in (("title_uk", MAX_TITLE), ("title_en", MAX_TITLE),
                     ("description_uk", MAX_LONG), ("description_en", MAX_LONG)):
        if key in out:
            out[key] = clean_content(out[key], cap)
    if "category" in out:
        out["category"] = clean_content_optional(out["category"], MAX_CATEGORY)
    if "currency" in out:
        out["currency"] = clean_content(out["currency"] or "MDL", MAX_CURRENCY)
    if "features" in out:
        out["features"] = _clean_features(out["features"])
    for key in ("is_active", "is_coming_soon", "is_paid"):
        if key in out:
            out[key] = clean_bool(out[key])
    return out


def _slugify_filename(s):
    s = re.sub(r"[^\w\-]+", "_", (s or "").strip())
    return s[:60] or "templates"


# ---------------------------------------------------------------------------
# Public
# ---------------------------------------------------------------------------

@templates_bp.route("", methods=["GET"])
def public_list():
    """All templates.

    Inactive templates (is_active=False) are filtered out completely.
    Templates with is_coming_soon=True are returned but rendered as 'coming soon' on the client.
    """
    rows = [t for t in list_all_templates() if bool(t.get("is_active", True))]
    return jsonify({
        "templates": [
            {
                "id": t["id"],
                "slug": t["slug"],
                "title_uk": t["title_uk"],
                "title_en": t["title_en"],
                "description_uk": t["description_uk"],
                "description_en": t["description_en"],
                "is_paid": bool(t.get("is_paid", False)),
                "is_active": bool(t.get("is_active", True)),
                "is_coming_soon": bool(t.get("is_coming_soon", False)),
                "price": t["price"] if t.get("price") is not None else None,
                "currency": t.get("currency") or "MDL",
                "category": t.get("category"),
                "features": t.get("features") or [],
            }
            for t in rows
        ]
    })


# ---------------------------------------------------------------------------
# Admin CRUD
# ---------------------------------------------------------------------------

@admin_templates_bp.route("", methods=["GET"])
@admin_required
def admin_list():
    return jsonify({"templates": list_all_templates()})


@admin_templates_bp.route("/<int:template_id>", methods=["GET"])
@admin_required
def admin_detail(template_id):
    data = get_template_with_files(template_id)
    if not data:
        return jsonify({"error": "Template not found"}), 404
    return jsonify({"template": data})


@admin_templates_bp.route("", methods=["POST"])
@admin_required
def admin_create():
    data = request.get_json(silent=True) or {}
    try:
        raw_slug = data.get("slug")
        slug = clean_slug(raw_slug) if (raw_slug or "").strip() else ""
        t = create_template(
            slug=slug,
            title_uk=clean_content(data.get("title_uk"), MAX_TITLE),
            title_en=clean_content(data.get("title_en"), MAX_TITLE),
            description_uk=clean_content(data.get("description_uk", ""), MAX_LONG),
            description_en=clean_content(data.get("description_en", ""), MAX_LONG),
            is_active=clean_bool(data.get("is_active", True)),
            is_coming_soon=clean_bool(data.get("is_coming_soon", False)),
            is_paid=clean_bool(data.get("is_paid", False)),
            price=data.get("price"),                      # validated by _norm_price
            currency=clean_content(data.get("currency") or "MDL", MAX_CURRENCY),
            category=clean_content_optional(data.get("category"), MAX_CATEGORY),
            features=_clean_features(data.get("features")),
        )
        return jsonify({"template": t}), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@admin_templates_bp.route("/<int:template_id>", methods=["PUT"])
@admin_required
def admin_update(template_id):
    data = request.get_json(silent=True) or {}
    try:
        t = update_template(template_id, _clean_template_payload(data))
        return jsonify({"template": t})
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@admin_templates_bp.route("/<int:template_id>", methods=["DELETE"])
@admin_required
def admin_delete(template_id):
    try:
        delete_template(template_id)
        return jsonify({"message": "Template deleted"})
    except ValueError as e:
        return jsonify({"error": str(e)}), 404


# ---------------------------------------------------------------------------
# Admin file management
# ---------------------------------------------------------------------------

@admin_templates_bp.route("/<int:template_id>/files", methods=["POST"])
@admin_required
def admin_upload_file(template_id):
    """Accept base64-encoded PDF in JSON body: { filename, pdf }."""
    data = request.get_json(silent=True) or {}
    # The service re-runs a strict [^\w\-. ()] filename allow-list on top of
    # this; clean_text here only guarantees we hand it a control-char-free str
    # (a non-string filename used to reach .strip() and 500).
    filename = clean_text(data.get("filename"), MAX_FILENAME) or "document.pdf"
    pdf_b64 = data.get("pdf") or ""
    if not pdf_b64:
        return jsonify({"error": "PDF data is required"}), 400
    if len(pdf_b64) > 28_000_000:
        return jsonify({"error": "PDF too large (max ~20 MB)"}), 413
    try:
        pdf_bytes = base64.b64decode(pdf_b64, validate=True)
    except Exception:
        return jsonify({"error": "Invalid base64 PDF"}), 400
    try:
        f = add_file(template_id, filename, pdf_bytes)
        return jsonify({"file": f}), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@admin_templates_bp.route("/<int:template_id>/files/<int:file_id>", methods=["DELETE"])
@admin_required
def admin_delete_file(template_id, file_id):
    try:
        delete_file(file_id)
        return jsonify({"message": "File deleted"})
    except ValueError as e:
        return jsonify({"error": str(e)}), 404


@admin_templates_bp.route("/<int:template_id>/files/<int:file_id>/download", methods=["GET"])
@admin_required
def admin_download_single(template_id, file_id):
    result = get_file_raw(file_id)
    if not result:
        return jsonify({"error": "File not found"}), 404
    filename, data = result
    safe = re.sub(r'[^\w\-. ()]+', '_', filename)[:100] or "document.pdf"
    return Response(
        data,
        mimetype="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{safe}"'},
    )


@admin_templates_bp.route("/<int:template_id>/download", methods=["GET"])
@admin_required
def admin_download_zip(template_id):
    """Return all attached PDFs zipped together."""
    t = Template.find_by_slug(str(template_id)) if not str(template_id).isdigit() else Template.find_by_id(template_id)
    if not t:
        return jsonify({"error": "Template not found"}), 404

    buf = io.BytesIO()
    count = 0
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for filename, data in iter_template_files_raw(t["id"]):
            zf.writestr(filename, data)
            count += 1

    if count == 0:
        return jsonify({"error": "Template has no files"}), 404

    zip_name = f"{_slugify_filename(t['slug'])}.zip"
    buf.seek(0)
    return Response(
        buf.getvalue(),
        mimetype="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{zip_name}"'},
    )
