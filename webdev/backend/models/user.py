"""User model — handles all user-related database queries."""

from database.db import query, execute


class User:
    @staticmethod
    def create(username, email, password_hash):
        """Create a new user and return it (without password_hash)."""
        return execute(
            """INSERT INTO users (username, email, password_hash)
               VALUES (%s, %s, %s)
               RETURNING id, username, email, created_at""",
            (username, email, password_hash),
        )

    @staticmethod
    def find_by_id(user_id):
        """Find user by primary key (safe fields only)."""
        return query(
            "SELECT id, username, email, created_at FROM users WHERE id = %s",
            (user_id,),
            fetch_one=True,
        )

    @staticmethod
    def find_by_username(username):
        """Find user by username (includes password_hash for auth)."""
        return query(
            "SELECT * FROM users WHERE username = %s",
            (username,),
            fetch_one=True,
        )

    @staticmethod
    def find_by_email(email):
        """Find user by email (includes password_hash for auth)."""
        return query(
            "SELECT * FROM users WHERE email = %s",
            (email,),
            fetch_one=True,
        )

    @staticmethod
    def find_all():
        """Return all users (without password hashes)."""
        return query(
            "SELECT id, username, email, created_at FROM users ORDER BY created_at DESC",
            fetch_all=True,
        )

    @staticmethod
    def count():
        """Count total registered users."""
        row = query("SELECT COUNT(*) as count FROM users", fetch_one=True)
        return row["count"] if row else 0
