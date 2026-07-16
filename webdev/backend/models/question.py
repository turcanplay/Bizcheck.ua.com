"""Question model — handles all question-related database queries."""

from database.db import query, execute


class Question:
    @staticmethod
    def create(block_id, text_uk, text_ru, note_uk=None, note_ru=None, order_index=0, parent_question_id=None):
        return execute(
            """INSERT INTO questions (block_id, text_uk, text_ru, note_uk, note_ru, order_index, parent_question_id)
               VALUES (%s, %s, %s, %s, %s, %s, %s)
               RETURNING *""",
            (block_id, text_uk, text_ru, note_uk, note_ru, order_index, parent_question_id),
        )

    @staticmethod
    def find_by_id(question_id):
        return query("SELECT * FROM questions WHERE id = %s", (question_id,), fetch_one=True)

    @staticmethod
    def find_by_block(block_id):
        return query(
            "SELECT * FROM questions WHERE block_id = %s ORDER BY order_index ASC",
            (block_id,), fetch_all=True,
        )

    @staticmethod
    def find_by_blocks(block_ids):
        """Batch fetch: all questions for a list of block ids in one query.
        Callers can group client-side by `block_id`."""
        if not block_ids:
            return []
        return query(
            "SELECT * FROM questions WHERE block_id = ANY(%s) ORDER BY block_id ASC, order_index ASC",
            (list(block_ids),), fetch_all=True,
        )

    @staticmethod
    def find_all():
        return query(
            "SELECT * FROM questions ORDER BY block_id ASC, order_index ASC",
            fetch_all=True,
        )

    @staticmethod
    def update(question_id, block_id, text_uk, text_ru, note_uk, note_ru, order_index, parent_question_id=None):
        return execute(
            """UPDATE questions
               SET block_id = %s, text_uk = %s, text_ru = %s,
                   note_uk = %s, note_ru = %s, order_index = %s, parent_question_id = %s
               WHERE id = %s RETURNING *""",
            (block_id, text_uk, text_ru, note_uk, note_ru, order_index, parent_question_id, question_id),
        )

    @staticmethod
    def delete(question_id):
        execute("DELETE FROM questions WHERE id = %s", (question_id,))
        return True

    @staticmethod
    def delete_all():
        execute("DELETE FROM questions")
        return True

    @staticmethod
    def delete_by_block(block_id):
        execute("DELETE FROM questions WHERE block_id = %s", (block_id,))
        return True

    @staticmethod
    def count():
        row = query("SELECT COUNT(*) as count FROM questions", fetch_one=True)
        return row["count"] if row else 0
