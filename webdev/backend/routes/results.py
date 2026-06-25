"""Result routes — save and retrieve quiz results."""

from flask import Blueprint, request, jsonify

from services.result_service import save_result, get_user_results, get_all_results
from middleware.auth_middleware import auth_required
from middleware.admin_middleware import admin_required

results_bp = Blueprint("results", __name__, url_prefix="/api_crowe_bizcheck/results")


@results_bp.route("", methods=["POST"])
@auth_required
def create():
    """POST /api/results — Save a user's block result (protected)."""
    data = request.get_json(silent=True) or {}

    block_id = data.get("block_id")
    score = data.get("score")
    total_questions = data.get("total_questions")

    errors = []
    if block_id is None:
        errors.append("block_id is required")
    if score is None:
        errors.append("score is required")
    if total_questions is None:
        errors.append("total_questions is required")
    if errors:
        return jsonify({"errors": errors}), 400

    try:
        result = save_result(request.user_id, block_id, score, total_questions)
        return jsonify({"result": result}), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@results_bp.route("/me", methods=["GET"])
@auth_required
def get_mine():
    """GET /api/results/me — Get the current user's results per block."""
    results = get_user_results(request.user_id)
    return jsonify({"results": results})


@results_bp.route("", methods=["GET"])
@admin_required
def get_all():
    """GET /api/results — Get all results (admin only)."""
    results = get_all_results()
    return jsonify({"results": results, "count": len(results)})
