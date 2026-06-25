"""Submission model — quiz submission with personal info and PDF.

PII columns (first_name, last_name, email, phone) are encrypted at rest with
Fernet. This module transparently encrypts on write and decrypts on read so
callers work with plaintext.
"""
import secrets
from database.db import query, execute
from utils.crypto import (
    encrypt_value, encrypt_fields, decrypt_row, decrypt_rows, PII_FIELDS,
)


_SELECT_COLS = """
    id, test_id, first_name, last_name, email, phone, sector, company_size,
    company_age, company_revenue, total_score, answers_json, block_scores_json,
    selected_answers_json, consent, status, created_at, language,
    tg_chat_id, tg_username, tg_first_name, tg_last_name,
    (pdf_data IS NOT NULL) AS has_pdf
"""

# Same as _SELECT_COLS but also returns submission_token. ONLY used at create time
# so the client can store it. Never include in admin-list responses.
_SELECT_COLS_WITH_TOKEN = _SELECT_COLS + ", submission_token"


def _new_submission_token():
    return secrets.token_urlsafe(32)


class Submission:
    @staticmethod
    def create(first_name, last_name, email, phone, consent, test_id=None):
        """Create a partial submission with personal info only (status='started').

        Returns the row WITH `submission_token` — callers must surface it to the
        client exactly once. Subsequent reads via find_by_id never expose it.
        """
        token = _new_submission_token()
        row = execute(
            f"""INSERT INTO submissions
                    (test_id, first_name, last_name, email, phone, consent, status, submission_token)
                VALUES (%s, %s, %s, %s, %s, %s, 'started', %s)
                RETURNING {_SELECT_COLS_WITH_TOKEN}""",
            (
                test_id,
                encrypt_value(first_name),
                encrypt_value(last_name),
                encrypt_value(email),
                encrypt_value(phone),
                consent,
                token,
            ),
        )
        return decrypt_row(row)

    @staticmethod
    def get_token(submission_id):
        """Return the opaque submission_token for building the email download link."""
        row = query(
            "SELECT submission_token FROM submissions WHERE id = %s",
            (submission_id,), fetch_one=True,
        )
        return row["submission_token"] if row and row.get("submission_token") else None

    @staticmethod
    def claim_sales_notification(submission_id):
        """Atomically claim the right to send the sales notification for this
        submission. Returns the id if THIS call won (and flipped the flag), or
        None if it was already notified. Safe under concurrent PATCH requests.
        """
        row = execute(
            """UPDATE submissions SET sales_notified = TRUE
               WHERE id = %s AND sales_notified = FALSE
               RETURNING id""",
            (submission_id,),
        )
        return row["id"] if row else None

    @staticmethod
    def set_sales_message(submission_id, msg_id, is_doc):
        """Remember the Telegram message_id of the sales notification so later
        contact updates can EDIT the same message instead of sending a new one."""
        execute(
            "UPDATE submissions SET sales_msg_id = %s, sales_msg_is_doc = %s WHERE id = %s",
            (msg_id, bool(is_doc), submission_id),
        )

    @staticmethod
    def get_sales_message(submission_id):
        """Return (message_id, is_doc) for the sales notification, or None if
        none was sent yet."""
        row = query(
            "SELECT sales_msg_id, sales_msg_is_doc FROM submissions WHERE id = %s",
            (submission_id,), fetch_one=True,
        )
        if not row or not row.get("sales_msg_id"):
            return None
        return row["sales_msg_id"], bool(row.get("sales_msg_is_doc"))

    @staticmethod
    def find_id_by_token(submission_id, token):
        """Constant-time-ish check: return id if token matches the submission, else None.

        Postgres equality on the indexed token column is fine for this — the
        attacker cannot probe per-row timing differences across the network.
        """
        if not token or not submission_id:
            return None
        row = query(
            "SELECT id FROM submissions WHERE id = %s AND submission_token = %s",
            (submission_id, token), fetch_one=True,
        )
        return row["id"] if row else None

    @staticmethod
    def update(submission_id, **fields):
        """Update submission with any combination of allowed fields."""
        allowed = {
            'test_id',
            'first_name', 'last_name', 'email', 'phone',
            'sector', 'company_size', 'company_age', 'company_revenue',
            'total_score', 'answers_json', 'block_scores_json',
            'selected_answers_json', 'consent', 'status', 'language',
        }
        filtered = {k: v for k, v in fields.items() if k in allowed and v is not None}
        if not filtered:
            return Submission.find_by_id(submission_id)

        # Encrypt PII fields before storing.
        filtered = encrypt_fields(filtered, fields=PII_FIELDS)

        set_parts = []
        values = []
        for col, val in filtered.items():
            set_parts.append(f"{col} = %s")
            values.append(val)
        values.append(submission_id)

        row = execute(
            f"""UPDATE submissions SET {', '.join(set_parts)}
                WHERE id = %s
                RETURNING {_SELECT_COLS}""",
            tuple(values),
        )
        return decrypt_row(row)

    @staticmethod
    def save_pdf(submission_id, pdf_bytes):
        """Save PDF binary data for a submission."""
        from psycopg2 import Binary
        execute(
            "UPDATE submissions SET pdf_data = %s WHERE id = %s",
            (Binary(pdf_bytes), submission_id),
        )

    @staticmethod
    def find_by_id(submission_id):
        row = query(
            f"SELECT {_SELECT_COLS} FROM submissions WHERE id = %s",
            (submission_id,), fetch_one=True,
        )
        return decrypt_row(row)

    @staticmethod
    def get_pdf(submission_id):
        """Get PDF binary data."""
        row = query(
            "SELECT pdf_data FROM submissions WHERE id = %s",
            (submission_id,), fetch_one=True,
        )
        if not row or not row["pdf_data"]:
            return None
        data = row["pdf_data"]
        return bytes(data) if isinstance(data, memoryview) else data

    @staticmethod
    def find_all(test_id=None):
        if test_id is not None:
            rows = query(
                f"SELECT {_SELECT_COLS} FROM submissions WHERE test_id = %s ORDER BY created_at DESC",
                (test_id,), fetch_all=True,
            )
        else:
            rows = query(
                f"SELECT {_SELECT_COLS} FROM submissions ORDER BY created_at DESC",
                fetch_all=True,
            )
        return decrypt_rows(rows)

    @staticmethod
    def delete(submission_id):
        """Delete a submission by ID."""
        execute("DELETE FROM submissions WHERE id = %s", (submission_id,))

    @staticmethod
    def delete_all():
        """Delete all submissions."""
        execute("DELETE FROM submissions")

    @staticmethod
    def count():
        row = query("SELECT COUNT(*) as count FROM submissions", fetch_one=True)
        return row["count"] if row else 0
