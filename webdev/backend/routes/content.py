"""Public + admin routes for testimonials and FAQ."""

from flask import Blueprint, jsonify, request

from models.content import Testimonial, FaqItem
from middleware.admin_middleware import admin_required
from utils.validators import (
    clean_text, clean_optional, clean_int, clean_bool, clean_float, clean_lang,
    MAX_NAME, MAX_SHORT, MAX_URL, MAX_TEXT,
)

# Public reviews are short by design — keep the on-screen card readable and
# cap the abuse surface well below the generic MAX_TEXT.
MAX_REVIEW = 600
MIN_REVIEW = 3

content_bp = Blueprint("content", __name__, url_prefix="/api_crowe_bizcheck")
admin_content_bp = Blueprint("admin_content", __name__, url_prefix="/api_crowe_bizcheck/admin")


def _ser_testimonial(t):
    if not t:
        return t
    t = dict(t)
    t["created_at"] = str(t["created_at"])
    # rating is NUMERIC in PG → comes back as Decimal; JSON-encode as float.
    if t.get("rating") is not None:
        t["rating"] = float(t["rating"])
    return t


def _ser_faq(f):
    if not f:
        return f
    f = dict(f)
    f["created_at"] = str(f["created_at"])
    return f


# ---------------------------------------------------------------------------
# Public
# ---------------------------------------------------------------------------

@content_bp.route("/testimonials", methods=["GET"])
def public_testimonials():
    rows = Testimonial.find_active() or []
    return jsonify({"testimonials": [_ser_testimonial(r) for r in rows]})


@content_bp.route("/testimonials", methods=["POST"])
def public_submit_testimonial():
    """A review submitted by an end user from the public landing page.

    Fully sanitized + length-capped here (no trust in the client guard). Goes
    live immediately and is flagged is_user_submitted. Rate-limited in server.py.
    """
    d = request.get_json(silent=True) or {}

    name = clean_text(d.get("name"), MAX_NAME)
    if len(name) < 2:
        return jsonify({"error": "name_required"}), 400

    quote = clean_text(d.get("quote"), MAX_REVIEW)
    if len(quote) < MIN_REVIEW:
        return jsonify({"error": "review_too_short"}), 400

    role = clean_optional(d.get("role"), MAX_SHORT)
    lang = clean_lang(d.get("lang"))
    try:
        # Public users pick whole stars; clean to the 0.5 grid + clamp 1..5
        # so a forged decimal still lands on a valid value.
        rating = clean_float(d.get("rating", 5), min_value=1, max_value=5, step=0.5)
    except ValueError:
        return jsonify({"error": "invalid_rating"}), 400

    row = Testimonial.create_public(name, role, quote, rating, lang)
    return jsonify({"testimonial": _ser_testimonial(row)}), 201


@content_bp.route("/faq", methods=["GET"])
def public_faq():
    rows = FaqItem.find_active() or []
    return jsonify({"faq": [_ser_faq(r) for r in rows]})


# ---------------------------------------------------------------------------
# Admin — testimonials
# ---------------------------------------------------------------------------

@admin_content_bp.route("/testimonials", methods=["GET"])
@admin_required
def admin_list_testimonials():
    rows = Testimonial.find_all() or []
    return jsonify({"testimonials": [_ser_testimonial(r) for r in rows]})


@admin_content_bp.route("/testimonials", methods=["POST"])
@admin_required
def admin_create_testimonial():
    d = request.get_json(silent=True) or {}
    name = clean_text(d.get("name"), MAX_NAME)
    if not name:
        return jsonify({"error": "Name is required"}), 400
    try:
        # Admin may set half-stars (4.5); snap to the 0.5 grid, clamp 1..5.
        rating = clean_float(d.get("rating", 5), min_value=1, max_value=5, step=0.5)
        order_index = clean_int(d.get("order_index", 0), min_value=0, max_value=100_000)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    row = Testimonial.create(
        name,
        clean_optional(d.get("role"), MAX_SHORT),
        clean_text(d.get("quote_uk"), MAX_TEXT),
        clean_text(d.get("quote_en"), MAX_TEXT),
        rating,
        clean_optional(d.get("avatar_url"), MAX_URL),
        order_index,
        clean_bool(d.get("is_active", True)),
        lang=clean_lang(d.get("lang")),
    )
    return jsonify({"testimonial": _ser_testimonial(row)}), 201


@admin_content_bp.route("/testimonials/<int:tid>", methods=["PUT"])
@admin_required
def admin_update_testimonial(tid):
    existing = Testimonial.find_by_id(tid)
    if not existing:
        return jsonify({"error": "Not found"}), 404
    d = request.get_json(silent=True) or {}
    try:
        rating = clean_float(d.get("rating", existing["rating"]), min_value=1, max_value=5, step=0.5)
        order_index = clean_int(d.get("order_index", existing["order_index"]), min_value=0, max_value=100_000)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    row = Testimonial.update(
        tid,
        clean_text(d.get("name") or existing["name"], MAX_NAME) or existing["name"],
        clean_optional(d.get("role") if d.get("role") is not None else existing["role"], MAX_SHORT),
        clean_text(d.get("quote_uk") if d.get("quote_uk") is not None else existing["quote_uk"], MAX_TEXT),
        clean_text(d.get("quote_en") if d.get("quote_en") is not None else existing["quote_en"], MAX_TEXT),
        rating,
        clean_optional(d.get("avatar_url") if d.get("avatar_url") is not None else existing["avatar_url"], MAX_URL),
        order_index,
        clean_bool(d.get("is_active", existing["is_active"])),
        lang=clean_lang(d.get("lang")) if d.get("lang") is not None else None,
    )
    return jsonify({"testimonial": _ser_testimonial(row)})


@admin_content_bp.route("/testimonials/<int:tid>", methods=["DELETE"])
@admin_required
def admin_delete_testimonial(tid):
    if not Testimonial.find_by_id(tid):
        return jsonify({"error": "Not found"}), 404
    Testimonial.delete(tid)
    return jsonify({"message": "Deleted"})


# ---------------------------------------------------------------------------
# Admin — FAQ
# ---------------------------------------------------------------------------

@admin_content_bp.route("/faq", methods=["GET"])
@admin_required
def admin_list_faq():
    rows = FaqItem.find_all() or []
    return jsonify({"faq": [_ser_faq(r) for r in rows]})


@admin_content_bp.route("/faq", methods=["POST"])
@admin_required
def admin_create_faq():
    d = request.get_json(silent=True) or {}
    qro = clean_text(d.get("question_uk"), MAX_TEXT)
    qru = clean_text(d.get("question_en"), MAX_TEXT)
    if not qro and not qru:
        return jsonify({"error": "At least one question (RO or RU) is required"}), 400
    try:
        order_index = clean_int(d.get("order_index", 0), min_value=0, max_value=100_000)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    row = FaqItem.create(
        qro,
        qru,
        clean_text(d.get("answer_uk"), MAX_TEXT),
        clean_text(d.get("answer_en"), MAX_TEXT),
        order_index,
        clean_bool(d.get("is_active", True)),
    )
    return jsonify({"faq": _ser_faq(row)}), 201


@admin_content_bp.route("/faq/<int:fid>", methods=["PUT"])
@admin_required
def admin_update_faq(fid):
    existing = FaqItem.find_by_id(fid)
    if not existing:
        return jsonify({"error": "Not found"}), 404
    d = request.get_json(silent=True) or {}
    try:
        order_index = clean_int(d.get("order_index", existing["order_index"]), min_value=0, max_value=100_000)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    row = FaqItem.update(
        fid,
        clean_text(d.get("question_uk") if d.get("question_uk") is not None else existing["question_uk"], MAX_TEXT),
        clean_text(d.get("question_en") if d.get("question_en") is not None else existing["question_en"], MAX_TEXT),
        clean_text(d.get("answer_uk") if d.get("answer_uk") is not None else existing["answer_uk"], MAX_TEXT),
        clean_text(d.get("answer_en") if d.get("answer_en") is not None else existing["answer_en"], MAX_TEXT),
        order_index,
        clean_bool(d.get("is_active", existing["is_active"])),
    )
    return jsonify({"faq": _ser_faq(row)})


@admin_content_bp.route("/faq/<int:fid>", methods=["DELETE"])
@admin_required
def admin_delete_faq(fid):
    if not FaqItem.find_by_id(fid):
        return jsonify({"error": "Not found"}), 404
    FaqItem.delete(fid)
    return jsonify({"message": "Deleted"})
