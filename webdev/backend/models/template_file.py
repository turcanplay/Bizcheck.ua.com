"""TemplateFile model — PDFs attached to a template (stored as BYTEA)."""

from psycopg2 import Binary
from database.db import query, execute


class TemplateFile:
    @staticmethod
    def create(template_id, filename, pdf_bytes, order_index=0):
        return execute(
            """INSERT INTO template_files (template_id, filename, pdf_data, file_size, order_index)
               VALUES (%s, %s, %s, %s, %s)
               RETURNING id, template_id, filename, file_size, order_index, created_at""",
            (template_id, filename, Binary(pdf_bytes), len(pdf_bytes), order_index),
        )

    @staticmethod
    def find_by_template(template_id):
        return query(
            """SELECT id, template_id, filename, file_size, order_index, created_at
               FROM template_files
               WHERE template_id = %s
               ORDER BY order_index ASC, id ASC""",
            (template_id,), fetch_all=True,
        )

    @staticmethod
    def find_by_id(file_id):
        """Full row INCLUDING the pdf_data BYTEA. Only for callers that need the
        bytes (template_service.get_file_raw) — use find_meta_by_id otherwise."""
        return query(
            "SELECT * FROM template_files WHERE id = %s",
            (file_id,), fetch_one=True,
        )

    @staticmethod
    def find_meta_by_id(file_id):
        """Metadata only — same row WITHOUT the pdf_data blob.

        delete_file() used find_by_id purely to test existence, which
        transferred the entire PDF (a few MB) from Postgres just to discard it.
        """
        return query(
            """SELECT id, template_id, filename, file_size, order_index, created_at
               FROM template_files WHERE id = %s""",
            (file_id,), fetch_one=True,
        )

    @staticmethod
    def delete(file_id):
        execute("DELETE FROM template_files WHERE id = %s", (file_id,))
        return True

    @staticmethod
    def delete_by_template(template_id):
        execute("DELETE FROM template_files WHERE template_id = %s", (template_id,))
