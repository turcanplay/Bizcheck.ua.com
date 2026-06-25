"""Question service — business logic for question CRUD (bilingual)."""

from models.question import Question
from models.answer import Answer


def _serialize(questions):
    for q in questions:
        q["answers"] = Answer.find_by_question(q["id"])
        q["created_at"] = str(q["created_at"])
        for a in q["answers"]:
            a["created_at"] = str(a["created_at"])
    return questions


def get_questions_by_block(block_id):
    return _serialize(Question.find_by_block(block_id))


def get_all_questions():
    return _serialize(Question.find_all())


def create_question(block_id, text_ro, text_ru, note_ro, note_ru, order_index, answers_list, parent_question_id=None):
    if not answers_list or len(answers_list) < 2:
        raise ValueError("At least 2 answer options are required")

    question = Question.create(block_id, text_ro, text_ru, note_ro, note_ru, order_index, parent_question_id)
    answers = Answer.create_many(question["id"], answers_list)
    question["answers"] = answers
    question["created_at"] = str(question["created_at"])
    return question


def update_question(question_id, block_id, text_ro, text_ru, note_ro, note_ru, order_index, answers_list, parent_question_id=None):
    existing = Question.find_by_id(question_id)
    if not existing:
        raise ValueError("Question not found")

    if answers_list is not None and len(answers_list) < 2:
        raise ValueError("At least 2 answer options are required")

    question = Question.update(
        question_id,
        block_id or existing["block_id"],
        text_ro or existing["text_ro"],
        text_ru or existing["text_ru"],
        note_ro if note_ro is not None else existing["note_ro"],
        note_ru if note_ru is not None else existing["note_ru"],
        order_index if order_index is not None else existing["order_index"],
        parent_question_id,
    )

    if answers_list is not None:
        Answer.delete_by_question(question_id)
        answers = Answer.create_many(question_id, answers_list)
        question["answers"] = answers
    else:
        question["answers"] = Answer.find_by_question(question_id)

    question["created_at"] = str(question["created_at"])
    return question


def delete_question(question_id):
    existing = Question.find_by_id(question_id)
    if not existing:
        raise ValueError("Question not found")
    Question.delete(question_id)
    return True


def delete_all_questions():
    Question.delete_all()
    return True
