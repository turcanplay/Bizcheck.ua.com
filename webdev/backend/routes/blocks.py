"""Block routes — admin CRUD for blocks + public quiz data endpoint."""

from flask import Blueprint, request, jsonify
from services.block_service import (
    get_all_blocks, create_block, update_block, delete_block, get_quiz_data,
)
from middleware.admin_middleware import admin_required
from utils.validators import clean_content, clean_int, MAX_TITLE

blocks_bp = Blueprint("blocks", __name__, url_prefix="/api_crowe_bizcheck/blocks")

# blocks.title_uk / title_en are VARCHAR(255) — cap at the column width so a long
# authored title is truncated here instead of blowing up in Postgres.
MAX_ORDER = 100_000


@blocks_bp.route("/quiz", methods=["GET"])
def quiz_data():
    """GET /api/blocks/quiz?test=<slug> — Public. Bilingual quiz data for one test."""
    test_slug = (request.args.get("test") or "").strip().lower()
    if not test_slug:
        return jsonify({"error": "Missing required query param: test"}), 400
    return jsonify(get_quiz_data(test_slug=test_slug))


@blocks_bp.route("", methods=["GET"])
@admin_required
def get_all():
    test_id = request.args.get("test_id", type=int)
    return jsonify({"blocks": get_all_blocks(test_id=test_id)})


@blocks_bp.route("", methods=["POST"])
@admin_required
def create():
    data = request.get_json(silent=True) or {}
    # Block titles are free text authored in the admin panel and re-emitted by
    # the PDF report / Excel export / Telegram messages → sanitize before store.
    title_uk = clean_content(data.get("title_uk"), MAX_TITLE)
    title_en = clean_content(data.get("title_en"), MAX_TITLE)

    errors = []
    test_id = data.get("test_id")
    if not test_id:
        errors.append("test_id is required")
    else:
        try:
            test_id = clean_int(test_id, min_value=1)
        except ValueError:
            errors.append("Invalid test_id")
    try:
        order_index = clean_int(data.get("order_index", 0), min_value=0, max_value=MAX_ORDER)
    except ValueError:
        errors.append("Invalid order_index")
    if not title_uk and not title_en:
        errors.append("At least one title (RO or RU) is required")
    if errors:
        return jsonify({"errors": errors}), 400

    try:
        block = create_block(test_id, title_uk, title_en, order_index)
        return jsonify({"block": block}), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@blocks_bp.route("/<int:block_id>", methods=["PUT"])
@admin_required
def update(block_id):
    data = request.get_json(silent=True) or {}
    # None ⇒ "leave as is" for update_block, so only touch keys actually sent.
    title_uk = clean_content(data["title_uk"], MAX_TITLE) if "title_uk" in data else None
    title_en = clean_content(data["title_en"], MAX_TITLE) if "title_en" in data else None
    try:
        order_index = (
            clean_int(data["order_index"], min_value=0, max_value=MAX_ORDER)
            if data.get("order_index") is not None else None
        )
        test_id = clean_int(data["test_id"], min_value=1) if data.get("test_id") is not None else None
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    try:
        block = update_block(block_id, title_uk, title_en, order_index, test_id=test_id)
        return jsonify({"block": block})
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@blocks_bp.route("/<int:block_id>", methods=["DELETE"])
@admin_required
def delete(block_id):
    try:
        delete_block(block_id)
        return jsonify({"message": "Block deleted successfully"})
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
