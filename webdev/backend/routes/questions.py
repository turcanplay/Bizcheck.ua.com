"""Question routes — public block queries + admin CRUD (bilingual)."""

from flask import Blueprint, request, jsonify
from services.question_service import get_questions_by_block, get_all_questions, create_question, update_question, delete_question, delete_all_questions
from middleware.admin_middleware import admin_required
from utils.validators import clean_content, clean_content_optional, clean_int, MAX_LONG

questions_bp = Blueprint("questions", __name__, url_prefix="/api_crowe_bizcheck/questions")

# questions.text_* / note_* and answers.text_* are TEXT columns holding authored
# quiz copy: a question plus its explanation can legitimately run long, so the
# generic MAX_TEXT (2 000) would silently truncate real content. MAX_LONG
# (10 000 chars ≈ 3-4 pages) is the cap — far above any real question, far below
# anything that could be used to bloat the DB.
MAX_QUESTION = MAX_LONG
MAX_ANSWER = MAX_LONG
MAX_ORDER = 100_000
# Answer scores are REAL in PG. Bound them but do NOT round: a weight like 3.33
# is legitimate, so clean_float (which snaps to 1 decimal) is the wrong tool.
_SCORE_LIMIT = 1_000_000.0


def _clean_score(value):
    try:
        n = float(0 if value is None else value)
    except (TypeError, ValueError):
        raise ValueError("Invalid answer score")
    if n != n or n in (float("inf"), float("-inf")):
        raise ValueError("Invalid answer score")
    return max(-_SCORE_LIMIT, min(_SCORE_LIMIT, n))


def _clean_answers(answers_list):
    """Normalize the nested answer objects of a question.

    Free text (`text_uk` / `text_en`) is sanitized; `score` and
    `next_question_id` are validated by TYPE, never pushed through a text
    cleaner. Also guarantees the keys models.answer.Answer.create_many indexes
    directly exist, so a malformed payload is a 400 instead of a 500.
    """
    if answers_list is None:
        return None
    if not isinstance(answers_list, (list, tuple)):
        raise ValueError("answers must be a list")
    out = []
    for a in answers_list:
        if not isinstance(a, dict):
            raise ValueError("Each answer must be an object")
        nxt = a.get("next_question_id")
        out.append({
            "text_uk": clean_content(a.get("text_uk"), MAX_ANSWER),
            "text_en": clean_content(a.get("text_en"), MAX_ANSWER),
            "score": _clean_score(a.get("score", 0)),
            "next_question_id": clean_int(nxt, min_value=1) if nxt not in (None, "") else None,
        })
    return out


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
    # Question text + notes are authored free text that flows into the PDF
    # report, the Excel export and Telegram → sanitize before store.
    text_uk = clean_content(data.get("text_uk"), MAX_QUESTION)
    text_en = clean_content(data.get("text_en"), MAX_QUESTION)
    note_uk = clean_content_optional(data.get("note_uk"), MAX_QUESTION)
    note_en = clean_content_optional(data.get("note_en"), MAX_QUESTION)

    errors = []
    block_id = data.get("block_id")
    if not block_id:
        errors.append("block_id is required")
    else:
        try:
            block_id = clean_int(block_id, min_value=1)
        except ValueError:
            errors.append("Invalid block_id")
    parent_raw = data.get("parent_question_id") or None
    parent_question_id = None
    try:
        if parent_raw is not None:
            parent_question_id = clean_int(parent_raw, min_value=1)
        order_index = clean_int(data.get("order_index", 0), min_value=0, max_value=MAX_ORDER)
        answers_list = _clean_answers(data.get("answers", []))
    except ValueError as e:
        errors.append(str(e))
        order_index, answers_list = 0, []
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
    # update_question treats None as "leave as is" → only touch keys we got.
    text_uk = clean_content(data["text_uk"], MAX_QUESTION) if "text_uk" in data else None
    text_en = clean_content(data["text_en"], MAX_QUESTION) if "text_en" in data else None
    note_uk = clean_content_optional(data["note_uk"], MAX_QUESTION) if "note_uk" in data else None
    note_en = clean_content_optional(data["note_en"], MAX_QUESTION) if "note_en" in data else None
    try:
        block_id = clean_int(data["block_id"], min_value=1) if data.get("block_id") is not None else None
        parent = data.get("parent_question_id")
        parent_question_id = clean_int(parent, min_value=1) if parent not in (None, "") else None
        order_index = (
            clean_int(data["order_index"], min_value=0, max_value=MAX_ORDER)
            if data.get("order_index") is not None else None
        )
        answers_list = _clean_answers(data["answers"]) if data.get("answers") is not None else None
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    try:
        question = update_question(
            question_id, block_id,
            text_uk, text_en, note_uk, note_en,
            order_index, answers_list, parent_question_id,
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
    # No free text here — every field is an id or an index. Coerce by TYPE so a
    # malformed value is rejected instead of reaching Postgres as a 500.
    norm = []
    for item in items:
        if not isinstance(item, dict):
            continue
        parent = item.get("parent_question_id") or None
        try:
            qid = clean_int(item.get("id"), min_value=1)
            block_id = clean_int(item.get("block_id"), min_value=1)
            order_index = clean_int(item.get("order_index", 0), min_value=0, max_value=MAX_ORDER)
            parent_id = clean_int(parent, min_value=1) if parent is not None else None
        except ValueError:
            return jsonify({"error": "Invalid reorder item"}), 400
        norm.append((block_id, order_index, parent_id, qid))

    from database.db import get_conn, put_conn
    from psycopg2.extras import RealDictCursor
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            for params in norm:
                cur.execute(
                    """UPDATE questions SET block_id = %s, order_index = %s, parent_question_id = %s
                       WHERE id = %s""",
                    params,
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
