"""Question routes — public block queries + admin CRUD (bilingual)."""

from flask import Blueprint, request, jsonify
from services.question_service import get_questions_by_block, get_all_questions, create_question, update_question, delete_question, delete_all_questions
from middleware.admin_middleware import admin_required

questions_bp = Blueprint("questions", __name__, url_prefix="/api_crowe_bizcheck/questions")


@questions_bp.route("/block/<int:block_id>", methods=["GET"])
def get_block_questions(block_id):
    questions = get_questions_by_block(block_id)
    return jsonify({"questions": questions, "count": len(questions)})


@questions_bp.route("", methods=["GET"])
@admin_required
def get_all():
    test_id = request.args.get("test_id", type=int)
    questions = get_all_questions()
    if test_id is not None:
        from models.block import Block
        block_ids = {b["id"] for b in Block.find_by_test(test_id)}
        questions = [q for q in questions if q["block_id"] in block_ids]
    return jsonify({"questions": questions, "count": len(questions)})


@questions_bp.route("", methods=["POST"])
@admin_required
def create():
    data = request.get_json(silent=True) or {}
    block_id = data.get("block_id")
    text_uk = (data.get("text_uk") or "").strip()
    text_en = (data.get("text_en") or "").strip()
    note_uk = (data.get("note_uk") or "").strip() or None
    note_en = (data.get("note_en") or "").strip() or None
    order_index = data.get("order_index", 0)
    answers_list = data.get("answers", [])
    parent_question_id = data.get("parent_question_id") or None

    errors = []
    if not block_id:
        errors.append("block_id is required")
    if not text_uk and not text_en:
        errors.append("At least one question text (RO or RU) is required")
    if errors:
        return jsonify({"errors": errors}), 400

    try:
        question = create_question(block_id, text_uk, text_en, note_uk, note_en, order_index, answers_list, parent_question_id)
        return jsonify({"question": question}), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@questions_bp.route("/<int:question_id>", methods=["PUT"])
@admin_required
def update(question_id):
    data = request.get_json(silent=True) or {}
    try:
        question = update_question(
            question_id, data.get("block_id"),
            data.get("text_uk"), data.get("text_en"),
            data.get("note_uk"), data.get("note_en"),
            data.get("order_index"), data.get("answers"),
            data.get("parent_question_id"),
        )
        return jsonify({"question": question})
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@questions_bp.route("/reorder", methods=["PUT"])
@admin_required
def reorder():
    """Batch update block_id, order_index, parent_question_id for multiple questions."""
    data = request.get_json(silent=True) or {}
    items = data.get("items", [])
    if not items:
        return jsonify({"error": "items is required"}), 400
    from database.db import get_conn, put_conn
    from psycopg2.extras import RealDictCursor
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            for item in items:
                qid = item.get("id")
                if not qid:
                    continue
                cur.execute(
                    """UPDATE questions SET block_id = %s, order_index = %s, parent_question_id = %s
                       WHERE id = %s""",
                    (item.get("block_id"), item.get("order_index", 0),
                     item.get("parent_question_id") or None, qid),
                )
            conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        put_conn(conn)
    return jsonify({"message": "Reorder saved", "count": len(items)})


@questions_bp.route("/all", methods=["DELETE"])
@admin_required
def delete_all():
    delete_all_questions()
    return jsonify({"message": "All questions deleted successfully"})


@questions_bp.route("/<int:question_id>", methods=["DELETE"])
@admin_required
def delete(question_id):
    try:
        delete_question(question_id)
        return jsonify({"message": "Question deleted successfully"})
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
