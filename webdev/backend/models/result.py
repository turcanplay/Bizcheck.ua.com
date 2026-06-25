"""Result model — handles all quiz-result database queries."""

from database.db import query, execute


class Result:
    @staticmethod
    def create(user_id, block_id, score, total_questions):
        """Save a quiz result for a user + block."""
        return execute(
            """INSERT INTO results (user_id, block_id, score, total_questions)
               VALUES (%s, %s, %s, %s)
               RETURNING *""",
            (user_id, block_id, score, total_questions),
        )

    @staticmethod
    def find_by_id(result_id):
        """Find a result by ID."""
        return query(
            "SELECT * FROM results WHERE id = %s",
            (result_id,),
            fetch_one=True,
        )

    @staticmethod
    def find_by_user(user_id):
        """Get all results for a specific user."""
        return query(
            "SELECT * FROM results WHERE user_id = %s ORDER BY completed_at DESC",
            (user_id,),
            fetch_all=True,
        )

    @staticmethod
    def find_all():
        """Get all results with user info."""
        return query(
            """SELECT r.*, u.username, u.email
               FROM results r
               JOIN users u ON u.id = r.user_id
               ORDER BY r.completed_at DESC""",
            fetch_all=True,
        )

    @staticmethod
    def count():
        """Count total quiz attempts."""
        row = query("SELECT COUNT(*) as count FROM results", fetch_one=True)
        return row["count"] if row else 0

    @staticmethod
    def avg_score_per_block():
        """Get average score per block."""
        return query(
            """SELECT block_id,
                      ROUND(AVG(score)::numeric, 2) as avg_score,
                      COUNT(*) as attempts
               FROM results
               GROUP BY block_id
               ORDER BY block_id ASC""",
            fetch_all=True,
        )

    @staticmethod
    def users_with_scores():
        """Get all users with their aggregated scores."""
        return query(
            """SELECT u.id, u.username, u.email, u.created_at,
                      COUNT(r.id) as total_attempts,
                      ROUND(COALESCE(AVG(r.score), 0)::numeric, 2) as avg_score
               FROM users u
               LEFT JOIN results r ON r.user_id = u.id
               GROUP BY u.id
               ORDER BY u.created_at DESC""",
            fetch_all=True,
        )
