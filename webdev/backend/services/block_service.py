"""Block service — business logic for block CRUD and the public quiz API."""

from models.block import Block
from models.question import Question
from models.answer import Answer
from models.test import Test


def _serialize_block(b):
    b["created_at"] = str(b["created_at"])
    return b


def get_all_blocks(test_id=None):
    blocks = Block.find_by_test(test_id) if test_id else Block.find_all()
    return [_serialize_block(b) for b in blocks]


def create_block(test_id, title_uk, title_ru, order_index=0):
    if not test_id:
        raise ValueError("test_id is required")
    if not Test.find_by_id(test_id):
        raise ValueError("Test not found")
    if not title_uk or not title_uk.strip():
        raise ValueError("Block title (RO) is required")
    if not title_ru or not title_ru.strip():
        raise ValueError("Block title (RU) is required")
    return _serialize_block(
        Block.create(test_id, title_uk.strip(), title_ru.strip(), order_index)
    )


def update_block(block_id, title_uk, title_ru, order_index, test_id=None):
    existing = Block.find_by_id(block_id)
    if not existing:
        raise ValueError("Block not found")
    if test_id is not None and not Test.find_by_id(test_id):
        raise ValueError("Test not found")
    return _serialize_block(Block.update(
        block_id,
        title_uk or existing["title_uk"],
        title_ru or existing["title_ru"],
        order_index if order_index is not None else existing["order_index"],
        test_id=test_id,
    ))


def delete_block(block_id):
    existing = Block.find_by_id(block_id)
    if not existing:
        raise ValueError("Block not found")
    Block.delete(block_id)
    return True


def get_quiz_data(test_slug=None, test_id=None):
    """Build bilingual quiz data for the frontend.

    Filters by test when `test_slug` or `test_id` is given. Branching fields
    (db_id, parent_question_id, next_question_id) are included so the client
    can follow the chosen path.
    """
    if test_slug:
        test = Test.find_by_slug(test_slug)
        if not test:
            return {"blocks": [], "test": None}
        test_id = test["id"]
    elif test_id:
        test = Test.find_by_id(test_id)
        if not test:
            return {"blocks": [], "test": None}
    else:
        return {"blocks": [], "test": None}

    blocks = Block.find_by_test(test_id)
    result = []

    # Batch-fetch everything in 2 queries instead of 1-per-block + 1-per-question
    # (was ~50 DB round-trips for a typical test — the single hottest public
    # endpoint). Ordering is preserved: find_by_blocks / find_by_questions sort
    # the same way the per-row calls did, and grouping keeps that order.
    block_ids = [b["id"] for b in blocks]
    all_questions = Question.find_by_blocks(block_ids)
    question_ids = [q["id"] for q in all_questions]
    all_answers = Answer.find_by_questions(question_ids)

    questions_by_block: dict = {}
    for q in all_questions:
        questions_by_block.setdefault(q["block_id"], []).append(q)
    answers_by_question: dict = {}
    for a in all_answers:
        answers_by_question.setdefault(a["question_id"], []).append(a)

    for b in blocks:
        questions = []
        for q in questions_by_block.get(b["id"], []):
            options = [
                {
                    "label_uk": a["text_uk"],
                    "label_ru": a["text_ru"],
                    "key": f"a{a['id']}",
                    "score": float(a["score"]),
                    "next_question_id": a.get("next_question_id"),
                }
                for a in answers_by_question.get(q["id"], [])
            ]

            questions.append({
                "id": f"b{b['id']}q{q['id']}",
                "db_id": q["id"],
                "parent_question_id": q.get("parent_question_id"),
                "text_uk": q["text_uk"],
                "text_ru": q["text_ru"],
                "note_uk": q["note_uk"],
                "note_ru": q["note_ru"],
                "options": options,
            })

        result.append({
            "id": b["id"],
            "title_uk": b["title_uk"],
            "title_ru": b["title_ru"],
            "questions": questions,
        })

    return {
        "blocks": result,
        "test": {
            "id": test["id"],
            "slug": test["slug"],
            "name_uk": test["name_uk"],
            "name_ru": test["name_ru"],
        },
    }
