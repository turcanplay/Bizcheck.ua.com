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

templates_bp = Blueprint("templates", __name__, url_prefix="/api_crowe_bizcheck/templates")
admin_templates_bp = Blueprint("admin_templates", __name__, url_prefix="/api_crowe_bizcheck/admin/templates")


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
                "title_ru": t["title_ru"],
                "description_uk": t["description_uk"],
                "description_ru": t["description_ru"],
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
        t = create_template(
            slug=data.get("slug"),
            title_uk=data.get("title_uk"),
            title_ru=data.get("title_ru"),
            description_uk=data.get("description_uk", ""),
            description_ru=data.get("description_ru", ""),
            is_active=data.get("is_active", True),
            is_coming_soon=data.get("is_coming_soon", False),
            is_paid=data.get("is_paid", False),
            price=data.get("price"),
            currency=data.get("currency", "MDL"),
            category=data.get("category"),
            features=data.get("features"),
        )
        return jsonify({"template": t}), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@admin_templates_bp.route("/<int:template_id>", methods=["PUT"])
@admin_required
def admin_update(template_id):
    data = request.get_json(silent=True) or {}
    try:
        t = update_template(template_id, data)
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
    filename = (data.get("filename") or "").strip() or "document.pdf"
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
