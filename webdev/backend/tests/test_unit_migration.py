"""RO -> UK column migration. No database: a fake cursor records the SQL issued.

The migration runs on EVERY backend boot (and once per gunicorn worker), so the
thing that actually matters is that it is a no-op the second time. A rename that
is not guarded raises `column "title_ro" does not exist` and takes the boot down.
"""
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from psycopg2 import sql  # noqa: E402

from database.db import RO_TO_UK_COLUMNS, migrate_ro_to_uk  # noqa: E402


def _render(query):
    """Flatten a psycopg2 sql.Composed without a live connection.

    `Composed.as_string()` needs a real connection for quote_ident, so walk the
    public parts instead: SQL fragments carry `.string`, identifiers `.strings`.
    """
    if isinstance(query, sql.Composed):
        return ''.join(_render(part) for part in query.seq)
    if isinstance(query, sql.Identifier):
        return '.'.join('"%s"' % s for s in query.strings)
    if isinstance(query, sql.SQL):
        return query.string
    return str(query)


class FakeCursor:
    """Answers the information_schema probe from a set of existing columns."""

    def __init__(self, columns):
        # columns: {table: {col, ...}}
        self.columns = columns
        self.executed = []
        self._last = None

    def execute(self, query, params=None):
        text = _render(query)
        self.executed.append(text)
        if "information_schema.columns" in text and params:
            cols = self.columns.get(params["t"], set())
            self._last = (params["old"] in cols, params["new"] in cols)
        else:
            self._last = None

    def fetchone(self):
        return self._last


def _renames(cur):
    return [q for q in cur.executed if "RENAME COLUMN" in q]


def _legacy_db():
    """A database as it exists today: every bilingual column is still `_ro`."""
    return {t: {f"{c}_ro" for c in cols} | {f"{c}_ru" for c in cols}
            for t, cols in RO_TO_UK_COLUMNS}


def _fresh_db():
    """A database created by the current CREATE TABLE block: already `_uk`."""
    return {t: {f"{c}_uk" for c in cols} | {f"{c}_ru" for c in cols}
            for t, cols in RO_TO_UK_COLUMNS}


class TestRoToUkMigration:
    def test_legacy_db_renames_every_ro_column(self):
        cur = FakeCursor(_legacy_db())
        migrate_ro_to_uk(cur)

        expected = sum(len(cols) for _, cols in RO_TO_UK_COLUMNS)
        renames = _renames(cur)
        assert len(renames) == expected

        for table, cols in RO_TO_UK_COLUMNS:
            for col in cols:
                assert any(
                    f'"{table}"' in q and f'"{col}_ro"' in q and f'"{col}_uk"' in q
                    for q in renames
                ), f"{table}.{col}_ro was not renamed"

    def test_second_run_is_a_noop(self):
        """The guard that keeps a re-boot (or a 2nd worker) from crashing."""
        cur = FakeCursor(_fresh_db())
        migrate_ro_to_uk(cur)
        assert _renames(cur) == []

    def test_half_migrated_column_is_not_renamed_twice(self):
        """If _uk already exists, leave it alone even when a stale _ro lingers."""
        cols = {t: {f"{c}_ro" for c in cs} | {f"{c}_uk" for c in cs}
                for t, cs in RO_TO_UK_COLUMNS}
        cur = FakeCursor(cols)
        migrate_ro_to_uk(cur)
        assert _renames(cur) == []

    def test_missing_table_is_skipped(self):
        cur = FakeCursor({})
        migrate_ro_to_uk(cur)
        assert _renames(cur) == []

    @pytest.mark.parametrize("table,col", [
        ("submissions", "language"),
        ("testimonials", "lang"),
        ("tg_outreach", "lang"),
    ])
    def test_stored_ro_values_are_relabelled(self, table, col):
        cur = FakeCursor(_fresh_db())
        migrate_ro_to_uk(cur)
        assert any(
            f"UPDATE {table}" in q and "'uk'" in q and "'ro'" in q
            for q in cur.executed
        ), f"{table}.{col} rows still say 'ro'"

    def test_feedback_prompt_key_is_renamed(self):
        cur = FakeCursor(_fresh_db())
        migrate_ro_to_uk(cur)
        assert any(
            "feedback_prompt_uk" in q and "feedback_prompt_ro" in q
            for q in cur.executed
        )
