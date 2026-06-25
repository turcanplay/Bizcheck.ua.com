"""Block routes — admin CRUD for blocks + public quiz data endpoint."""

from flask import Blueprint, request, jsonify
from services.block_service import (
    get_all_blocks, create_block, update_block, delete_block, get_quiz_data,
)
from middleware.admin_middleware import admin_required

blocks_bp = Blueprint("blocks", __name__, url_prefix="/api_crowe_bizcheck/blocks")


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
    title_ro = (data.get("title_ro") or "").strip()
    title_ru = (data.get("title_ru") or "").strip()
    order_index = data.get("order_index", 0)
    test_id = data.get("test_id")

    errors = []
    if not test_id:
        errors.append("test_id is required")
    if not title_ro and not title_ru:
        errors.append("At least one title (RO or RU) is required")
    if errors:
        return jsonify({"errors": errors}), 400

    try:
        block = create_block(test_id, title_ro, title_ru, order_index)
        return jsonify({"block": block}), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@blocks_bp.route("/<int:block_id>", methods=["PUT"])
@admin_required
def update(block_id):
    data = request.get_json(silent=True) or {}
    try:
        block = update_block(
            block_id,
            data.get("title_ro"),
            data.get("title_ru"),
            data.get("order_index"),
            test_id=data.get("test_id"),
        )
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
