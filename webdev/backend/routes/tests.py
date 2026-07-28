"""Test routes — public list of active tests + admin CRUD."""

from flask import Blueprint, request, jsonify

from services.test_service import (
    list_active_tests, list_all_tests,
    create_test, update_test, delete_test, reorder_tests,
)
from middleware.admin_middleware import admin_required
from utils.validators import (
    clean_content, clean_content_optional, clean_json_content, clean_slug,
    clean_bool, clean_float, MAX_TITLE, MAX_LONG,
)

tests_bp = Blueprint("tests", __name__, url_prefix="/api_crowe_bizcheck/tests")
admin_tests_bp = Blueprint("admin_tests", __name__, url_prefix="/api_crowe_bizcheck/admin/tests")

# Column widths / realistic caps for authored catalog copy.
#   name_*        VARCHAR(255)  → MAX_TITLE
#   description_* TEXT          → MAX_LONG (10 000); a catalog description can be
#                                 several paragraphs, MAX_TEXT would clip it
#   category      VARCHAR(50)
MAX_CATEGORY = 50
MAX_FEATURE = 200          # test_service._norm_features already clips at 200
MAX_REPORT_TYPE = 32       # tests.report_type VARCHAR(32); the enum is checked in the service
MAX_CURRENCY = 8           # 3-letter code; the service upper-cases and validates

_ZONE_KEYS = ("safe", "developing", "warn", "risk")


def _clean_features(value):
    """Feature bullets — free text, list or newline-separated string."""
    if value is None:
        return None
    if isinstance(value, str):
        return clean_content(value, MAX_LONG)
    if isinstance(value, (list, tuple)):
        return [clean_content(v, MAX_FEATURE) for v in value]
    return []


def _clean_scoring_zones(value):
    """Scoring thresholds are NUMBERS, not text — validate by type.

    Running these through a text cleaner would stringify them and break the
    report's zone selection. Unknown keys are dropped (closed allow-list).
    """
    if value is None:
        return None
    if not isinstance(value, dict):
        raise ValueError("scoring_zones must be an object")
    out = {}
    for k in _ZONE_KEYS:
        if k in value:
            out[k] = clean_float(value[k], min_value=0, max_value=100)
    return out or None


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
                "name_en": t["name_en"],
                "description_uk": t["description_uk"],
                "description_en": t["description_en"],
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
        # Slug: clean_slug (regex allow-list) when supplied; an empty slug is
        # left empty on purpose so the service can auto-derive it from the name.
        raw_slug = data.get("slug")
        slug = clean_slug(raw_slug) if (raw_slug or "").strip() else ""
        t = create_test(
            slug=slug,
            name_uk=clean_content(data.get("name_uk"), MAX_TITLE),
            name_en=clean_content(data.get("name_en"), MAX_TITLE),
            description_uk=clean_content(data.get("description_uk", ""), MAX_LONG),
            description_en=clean_content(data.get("description_en", ""), MAX_LONG),
            is_active=clean_bool(data.get("is_active", True)),
            is_coming_soon=clean_bool(data.get("is_coming_soon", False)),
            is_paid=clean_bool(data.get("is_paid", False)),
            price=data.get("price"),                      # validated by _norm_price
            currency=clean_content(data.get("currency") or "MDL", MAX_CURRENCY),
            category=clean_content_optional(data.get("category"), MAX_CATEGORY),
            features=_clean_features(data.get("features")),
            scoring_zones=_clean_scoring_zones(data.get("scoring_zones")),
            # Free-form JSON that reaches the report — sanitize every nested
            # string, leave the numbers/booleans alone.
            zone_recommendations=clean_json_content(data.get("zone_recommendations")),
            report_type=clean_content(data.get("report_type") or "bizcheck", MAX_REPORT_TYPE),
            order_index=data.get("order_index", 0),       # clamped by _norm_order
        )
        return jsonify({"test": t}), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@admin_tests_bp.route("/<int:test_id>", methods=["PUT"])
@admin_required
def admin_update(test_id):
    data = request.get_json(silent=True) or {}
    try:
        t = update_test(test_id, _clean_test_payload(data))
        return jsonify({"test": t})
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


def _clean_test_payload(data):
    """Sanitize a PUT body in place-of-key fashion.

    update_test() distinguishes "key absent" (keep the stored value) from "key
    present but empty" (clear it), so the cleaned copy must carry EXACTLY the
    same key set as the request body.
    """
    out = dict(data)
    if (out.get("slug") or "").strip():
        out["slug"] = clean_slug(out["slug"])
    elif "slug" in out:
        out["slug"] = ""                     # falls back to the stored slug
    for key, cap in (("name_uk", MAX_TITLE), ("name_en", MAX_TITLE),
                     ("description_uk", MAX_LONG), ("description_en", MAX_LONG)):
        if key in out:
            out[key] = clean_content(out[key], cap)
    if "category" in out:
        out["category"] = clean_content_optional(out["category"], MAX_CATEGORY)
    if "currency" in out:
        out["currency"] = clean_content(out["currency"] or "MDL", MAX_CURRENCY)
    if "report_type" in out:
        out["report_type"] = clean_content(out["report_type"] or "bizcheck", MAX_REPORT_TYPE)
    if "features" in out:
        out["features"] = _clean_features(out["features"])
    if "scoring_zones" in out:
        out["scoring_zones"] = _clean_scoring_zones(out["scoring_zones"])
    if "zone_recommendations" in out:
        out["zone_recommendations"] = clean_json_content(out["zone_recommendations"])
    for key in ("is_active", "is_coming_soon", "is_paid"):
        if key in out:
            out[key] = clean_bool(out[key])
    return out


@admin_tests_bp.route("/<int:test_id>", methods=["DELETE"])
@admin_required
def admin_delete(test_id):
    try:
        delete_test(test_id)
        return jsonify({"message": "Test deleted"})
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
