"""Answer model — handles all answer-related database queries."""

from database.db import query, execute, execute_many


class Answer:
    @staticmethod
    def create(question_id, text_uk, text_en, score=0, next_question_id=None):
        return execute(
            """INSERT INTO answers (question_id, text_uk, text_en, score, next_question_id)
               VALUES (%s, %s, %s, %s, %s)
               RETURNING *""",
            (question_id, text_uk, text_en, score, next_question_id),
        )

    @staticmethod
    def create_many(question_id, answers_list):
        """Bulk-create. Each item: {text_uk, text_en, score, next_question_id?}."""
        params = [
            (question_id, a["text_uk"], a["text_en"], float(a.get("score", 0)), a.get("next_question_id"))
            for a in answers_list
        ]
        return execute_many(
            """INSERT INTO answers (question_id, text_uk, text_en, score, next_question_id)
               VALUES (%s, %s, %s, %s, %s)
               RETURNING *""",
            params,
        )

    @staticmethod
    def find_by_id(answer_id):
        return query("SELECT * FROM answers WHERE id = %s", (answer_id,), fetch_one=True)

    @staticmethod
    def find_by_question(question_id):
        return query(
            "SELECT * FROM answers WHERE question_id = %s ORDER BY id ASC",
            (question_id,), fetch_all=True,
        )

    @staticmethod
    def find_by_questions(question_ids):
        """Batch fetch: all answers for a list of question ids in one query.
        Callers can group client-side by `question_id`."""
        if not question_ids:
            return []
        return query(
            "SELECT * FROM answers WHERE question_id = ANY(%s) ORDER BY question_id ASC, id ASC",
            (list(question_ids),), fetch_all=True,
        )

    @staticmethod
    def delete_by_question(question_id):
        execute("DELETE FROM answers WHERE question_id = %s", (question_id,))

    @staticmethod
    def delete(answer_id):
        execute("DELETE FROM answers WHERE id = %s", (answer_id,))
