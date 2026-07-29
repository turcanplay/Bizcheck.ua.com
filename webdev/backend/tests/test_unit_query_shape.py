"""SQL-shape guards for the read-path optimizations.

No database: `database.db.query` is replaced by a spy that records the SQL each
model method issues. These assert the SHAPE of the query (which columns are
touched, how many round-trips), which is exactly what the optimization changed
and what a well-meaning refactor would silently undo.
"""
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


class SQLSpy:
    """Records every statement and returns a canned row."""

    def __init__(self, result=None):
        self.statements = []
        self.result = result

    def __call__(self, sql, params=None, **kwargs):
        self.statements.append(" ".join(sql.split()))
        return self.result

    @property
    def only(self):
        assert len(self.statements) == 1, f"expected 1 query, got {self.statements}"
        return self.statements[0]


# ---------------------------------------------------------------------------
# Submission.exists — must not read or decrypt PII
# ---------------------------------------------------------------------------
PII_COLUMNS = ("first_name", "last_name", "email", "phone")


class TestSubmissionExists:
    def test_selects_no_columns_and_no_pii(self, monkeypatch):
        import models.submission as ms
        spy = SQLSpy(result={"ok": 1})
        monkeypatch.setattr(ms, "query", spy)

        assert ms.Submission.exists(7) is True

        sql = spy.only
        assert sql.startswith("SELECT 1"), sql
        assert "WHERE id = %s" in sql
        for col in PII_COLUMNS:
            assert col not in sql, f"exists() must not read PII column {col}"
        # The BYTEA blob must never be dragged either.
        assert "pdf_data" not in sql

    def test_missing_row_is_false(self, monkeypatch):
        import models.submission as ms
        monkeypatch.setattr(ms, "query", SQLSpy(result=None))
        assert ms.Submission.exists(7) is False

    def test_uses_exactly_one_round_trip(self, monkeypatch):
        import models.submission as ms
        spy = SQLSpy(result={"ok": 1})
        monkeypatch.setattr(ms, "query", spy)
        ms.Submission.exists(1)
        assert len(spy.statements) == 1

    def test_never_calls_the_fernet_layer(self, monkeypatch):
        """The whole point: zero decryptions on an existence check."""
        import models.submission as ms
        import utils.crypto as crypto

        monkeypatch.setattr(ms, "query", SQLSpy(result={"ok": 1}))
        monkeypatch.setattr(
            crypto, "decrypt_value",
            lambda v: pytest.fail("exists() must not decrypt anything"))
        ms.Submission.exists(1)


# ---------------------------------------------------------------------------
# Submission.find_by_id — still the full, decrypted row (unchanged contract)
# ---------------------------------------------------------------------------
class TestSubmissionFindByIdUnchanged:
    def test_still_returns_decrypted_pii(self, monkeypatch):
        import models.submission as ms
        from utils.crypto import encrypt_value

        row = {c: encrypt_value(f"secret-{c}") for c in PII_COLUMNS}
        row["id"] = 1
        monkeypatch.setattr(ms, "query", SQLSpy(result=row))

        out = ms.Submission.find_by_id(1)
        for col in PII_COLUMNS:
            assert out[col] == f"secret-{col}"

    def test_never_selects_the_pdf_blob(self, monkeypatch):
        import models.submission as ms
        spy = SQLSpy(result=None)
        monkeypatch.setattr(ms, "query", spy)
        ms.Submission.find_by_id(1)
        # has_pdf is a boolean projection, the blob itself is not transferred.
        assert "pdf_data IS NOT NULL" in spy.only
        assert "SELECT pdf_data" not in spy.only


# ---------------------------------------------------------------------------
# TemplateFile — metadata lookup must not drag the BYTEA
# ---------------------------------------------------------------------------
class TestTemplateFileMetaLookup:
    def test_meta_lookup_excludes_pdf_data(self, monkeypatch):
        import models.template_file as mtf
        spy = SQLSpy(result={"id": 3})
        monkeypatch.setattr(mtf, "query", spy)

        mtf.TemplateFile.find_meta_by_id(3)
        assert "pdf_data" not in spy.only
        for col in ("id", "template_id", "filename", "file_size"):
            assert col in spy.only

    def test_raw_lookup_still_includes_pdf_data(self, monkeypatch):
        """get_file_raw genuinely needs the bytes — don't optimize that away."""
        import models.template_file as mtf
        spy = SQLSpy(result={"id": 3, "pdf_data": b"%PDF"})
        monkeypatch.setattr(mtf, "query", spy)

        mtf.TemplateFile.find_by_id(3)
        assert "SELECT *" in spy.only

    def test_delete_file_uses_the_metadata_lookup(self, monkeypatch):
        import services.template_service as ts

        used = {}
        monkeypatch.setattr(
            "models.template_file.TemplateFile.find_meta_by_id",
            staticmethod(lambda fid: used.setdefault("meta", fid) or {"id": fid}))
        monkeypatch.setattr(
            "models.template_file.TemplateFile.find_by_id",
            staticmethod(lambda fid: pytest.fail("delete_file must not fetch the blob")))
        monkeypatch.setattr(
            "models.template_file.TemplateFile.delete", staticmethod(lambda fid: True))

        assert ts.delete_file(3) is True
        assert used["meta"] == 3


# ---------------------------------------------------------------------------
# Answer.find_by_questions — the batch query behind the N+1 fix
# ---------------------------------------------------------------------------
class TestAnswerBatchQuery:
    def test_uses_one_any_query_for_many_ids(self, monkeypatch):
        import models.answer as ma
        spy = SQLSpy(result=[])
        monkeypatch.setattr(ma, "query", spy)

        ma.Answer.find_by_questions([1, 2, 3, 4, 5])

        sql = spy.only
        assert "= ANY(%s)" in sql
        # Ordering must stay stable so grouping preserves per-question order.
        assert "ORDER BY question_id ASC, id ASC" in sql

    def test_empty_id_list_short_circuits_without_a_query(self, monkeypatch):
        import models.answer as ma
        spy = SQLSpy(result=[])
        monkeypatch.setattr(ma, "query", spy)
        assert ma.Answer.find_by_questions([]) == []
        assert spy.statements == []


# ---------------------------------------------------------------------------
# Connection pool sizing
# ---------------------------------------------------------------------------
class TestPoolSizing:
    def test_ceiling_stays_under_postgres_default_max_connections(self):
        """4 gunicorn workers x DB_POOL_MAX must leave room for admin tooling.

        postgres:16-alpine defaults to max_connections=100 (3 reserved for
        superusers). Going above ~40 total means a rolling deploy — which
        briefly runs old and new workers at once — can exhaust the server.
        """
        import importlib
        import database.db as db
        importlib.reload(db)

        GUNICORN_WORKERS = 4          # backend/Dockerfile --workers 4
        assert db._POOL_MAX * GUNICORN_WORKERS <= 40
        # Both request threads (--threads 2) must be servable without waiting.
        assert db._POOL_MIN >= 2
        assert db._POOL_MIN <= db._POOL_MAX

    def test_headroom_over_the_background_threads(self):
        """Per worker: 2 request threads + feedback + export + sales + email."""
        import database.db as db
        REALISTIC_PEAK = 6
        assert db._POOL_MAX >= REALISTIC_PEAK
