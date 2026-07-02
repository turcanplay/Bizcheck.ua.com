"""Block model — handles all block-related database queries."""

from database.db import query, execute


class Block:
    @staticmethod
    def create(test_id, title_ro, title_ru, order_index=0):
        """Create a new block for a given test with bilingual title."""
        return execute(
            """INSERT INTO blocks (test_id, title_ro, title_ru, order_index)
               VALUES (%s, %s, %s, %s)
               RETURNING *""",
            (test_id, title_ro, title_ru, order_index),
        )

    @staticmethod
    def find_by_id(block_id):
        return query("SELECT * FROM blocks WHERE id = %s", (block_id,), fetch_one=True)

    @staticmethod
    def find_all():
        return query(
            "SELECT * FROM blocks ORDER BY order_index ASC, id ASC",
            fetch_all=True,
        )

    @staticmethod
    def find_by_test(test_id):
        return query(
            "SELECT * FROM blocks WHERE test_id = %s ORDER BY order_index ASC, id ASC",
            (test_id,), fetch_all=True,
        )

    @staticmethod
    def update(block_id, title_ro, title_ru, order_index, test_id=None):
        if test_id is not None:
            return execute(
                """UPDATE blocks
                   SET test_id = %s, title_ro = %s, title_ru = %s, order_index = %s
                   WHERE id = %s RETURNING *""",
                (test_id, title_ro, title_ru, order_index, block_id),
            )
        return execute(
            """UPDATE blocks SET title_ro = %s, title_ru = %s, order_index = %s
               WHERE id = %s RETURNING *""",
            (title_ro, title_ru, order_index, block_id),
        )

    @staticmethod
    def delete(block_id):
        execute("DELETE FROM blocks WHERE id = %s", (block_id,))
        return True

    @staticmethod
    def count():
        row = query("SELECT COUNT(*) as count FROM blocks", fetch_one=True)
        return row["count"] if row else 0
