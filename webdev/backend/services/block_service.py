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


def create_block(test_id, title_ro, title_ru, order_index=0):
    if not test_id:
        raise ValueError("test_id is required")
    if not Test.find_by_id(test_id):
        raise ValueError("Test not found")
    if not title_ro or not title_ro.strip():
        raise ValueError("Block title (RO) is required")
    if not title_ru or not title_ru.strip():
        raise ValueError("Block title (RU) is required")
    return _serialize_block(
        Block.create(test_id, title_ro.strip(), title_ru.strip(), order_index)
    )


def update_block(block_id, title_ro, title_ru, order_index, test_id=None):
    existing = Block.find_by_id(block_id)
    if not existing:
        raise ValueError("Block not found")
    if test_id is not None and not Test.find_by_id(test_id):
        raise ValueError("Test not found")
    return _serialize_block(Block.update(
        block_id,
        title_ro or existing["title_ro"],
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

    for b in blocks:
        questions_raw = Question.find_by_block(b["id"])
        questions = []

        for q in questions_raw:
            answers_raw = Answer.find_by_question(q["id"])
            options = [
                {
                    "label_ro": a["text_ro"],
                    "label_ru": a["text_ru"],
                    "key": f"a{a['id']}",
                    "score": float(a["score"]),
                    "next_question_id": a.get("next_question_id"),
                }
                for a in answers_raw
            ]

            questions.append({
                "id": f"b{b['id']}q{q['id']}",
                "db_id": q["id"],
                "parent_question_id": q.get("parent_question_id"),
                "text_ro": q["text_ro"],
                "text_ru": q["text_ru"],
                "note_ro": q["note_ro"],
                "note_ru": q["note_ru"],
                "options": options,
            })

        result.append({
            "id": b["id"],
            "title_ro": b["title_ro"],
            "title_ru": b["title_ru"],
            "questions": questions,
        })

    return {
        "blocks": result,
        "test": {
            "id": test["id"],
            "slug": test["slug"],
            "name_ro": test["name_ro"],
            "name_ru": test["name_ru"],
        },
    }
