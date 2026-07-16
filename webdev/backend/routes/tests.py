"""Test routes — public list of active tests + admin CRUD."""

from flask import Blueprint, request, jsonify

from services.test_service import (
    list_active_tests, list_all_tests,
    create_test, update_test, delete_test, reorder_tests,
)
from middleware.admin_middleware import admin_required

tests_bp = Blueprint("tests", __name__, url_prefix="/api_crowe_bizcheck/tests")
admin_tests_bp = Blueprint("admin_tests", __name__, url_prefix="/api_crowe_bizcheck/admin/tests")


# ---------------------------------------------------------------------------
# Public
# ---------------------------------------------------------------------------

@tests_bp.route("", methods=["GET"])
def public_list():
    """GET — Public list of tests.

    Inactive tests (is_active=False) are filtered out completely.
    Tests with is_coming_soon=True are returned but rendered as 'coming soon' on the client.
    """
    tests = [t for t in list_all_tests() if bool(t.get("is_active", True))]
    return jsonify({
        "tests": [
            {
                "id": t["id"],
                "slug": t["slug"],
                "name_uk": t["name_uk"],
                "name_ru": t["name_ru"],
                "description_uk": t["description_uk"],
                "description_ru": t["description_ru"],
                "is_paid": bool(t.get("is_paid", False)),
                "is_active": bool(t.get("is_active", True)),
                "is_coming_soon": bool(t.get("is_coming_soon", False)),
                "price": float(t["price"]) if t.get("price") is not None else None,
                "currency": t.get("currency") or "MDL",
                "category": t.get("category"),
                "features": t.get("features") or [],
                "report_type": t.get("report_type") or "bizcheck",
                "order_index": t.get("order_index") or 0,
            }
            for t in tests
        ]
    })


# ---------------------------------------------------------------------------
# Admin CRUD
# ---------------------------------------------------------------------------

@admin_tests_bp.route("", methods=["GET"])
@admin_required
def admin_list():
    return jsonify({"tests": list_all_tests()})


@admin_tests_bp.route("/reorder", methods=["POST"])
@admin_required
def admin_reorder():
    """Persist the manual drag-and-drop order from the admin tests list.
    Body: { items: [{ id, order_index }, ...] }."""
    data = request.get_json(silent=True) or {}
    try:
        count = reorder_tests(data.get("items"))
        return jsonify({"message": "Reordered", "count": count})
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@admin_tests_bp.route("", methods=["POST"])
@admin_required
def admin_create():
    data = request.get_json(silent=True) or {}
    try:
        t = create_test(
            slug=data.get("slug"),
            name_uk=data.get("name_uk"),
            name_ru=data.get("name_ru"),
            description_uk=data.get("description_uk", ""),
            description_ru=data.get("description_ru", ""),
            is_active=data.get("is_active", True),
            is_coming_soon=data.get("is_coming_soon", False),
            is_paid=data.get("is_paid", False),
            price=data.get("price"),
            currency=data.get("currency", "MDL"),
            category=data.get("category"),
            features=data.get("features"),
            scoring_zones=data.get("scoring_zones"),
            zone_recommendations=data.get("zone_recommendations"),
            report_type=data.get("report_type", "bizcheck"),
            order_index=data.get("order_index", 0),
        )
        return jsonify({"test": t}), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@admin_tests_bp.route("/<int:test_id>", methods=["PUT"])
@admin_required
def admin_update(test_id):
    data = request.get_json(silent=True) or {}
    try:
        t = update_test(test_id, data)
        return jsonify({"test": t})
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@admin_tests_bp.route("/<int:test_id>", methods=["DELETE"])
@admin_required
def admin_delete(test_id):
    try:
        delete_test(test_id)
        return jsonify({"message": "Test deleted"})
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
