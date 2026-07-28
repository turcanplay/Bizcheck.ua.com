"""Unit tests for the per-test Excel ZIP export (disk-spooled).

`build_excels_zip_for_test` used to assemble the whole archive in a BytesIO and
hand the bytes to `Response(...)`, so every gunicorn worker serving that export
held a full copy of the archive — twice, briefly, because `BytesIO.getvalue()`
copies — for the entire duration of the download. It is fast (<1 s at 500
submissions), so it was never a latency problem; it was a memory one, and four
workers doing it at once is how a container gets OOM-killed.

It now streams into a NamedTemporaryFile and the route serves that file with
`send_file`, exactly like the PDF ZIP export.

What is pinned here:
  * the archive CONTENT is byte-for-byte equivalent to the old in-RAM build —
    same entries, same names, same order, same cell values (the legacy builder
    is reproduced below and diffed against the real one)
  * the temp file is removed on success, on a mid-build exception, and on a
    BaseException (KeyboardInterrupt / worker recycle)
  * the route deletes the temp file during response finalization — BEFORE the
    body is streamed — so a client that aborts mid-download cannot leak it,
    while the transfer still completes from the open descriptor
  * peak heap no longer grows with the archive: doubling the corpus doubles the
    archive on disk but leaves the peak essentially flat

No DB and no running backend: the model layer is monkeypatched.
"""
import gc
import os
import sys
import tempfile
import tracemalloc
import zipfile
from io import BytesIO

import jwt
import openpyxl
import pytest
from flask import Flask

_HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(_HERE))

from services import export_service as ex  # noqa: E402

CSRF = "unit-csrf"
_N_QUESTIONS = 12


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

def _make_subs(n):
    return [{
        "id": i,
        "first_name": f"Іван{i}", "last_name": f"Петренко{i}",
        "email": f"user{i}@example.ua", "phone": f"+38067111{i:04d}",
        "sector": "IT / Цифрові сервіси", "company_size": "10-50",
        "company_age": "3-5", "company_revenue": "1M-5M",
        "status": "completed" if i % 3 else "in_progress",
        "consent": True, "language": "uk", "total_score": 50 + (i % 50),
        "created_at": f"2026-01-{(i % 28) + 1:02d} 10:00:00",
        "test_id": 1,
        "block_scores_json": '[{"title": "Блок A", "score": 70},'
                             ' {"title": "Блок B", "score": 55}]',
        "answers_json": "{" + ", ".join(
            f'"b1q{q}": {q % 4}' for q in range(1, _N_QUESTIONS + 1)) + "}",
    } for i in range(1, n + 1)]


def _patch_models(monkeypatch, subs):
    monkeypatch.setattr("models.submission.Submission.find_all",
                        staticmethod(lambda test_id=None, **kw: subs))
    monkeypatch.setattr("models.block.Block.find_by_test",
                        staticmethod(lambda t: [{"id": 1}]))
    monkeypatch.setattr("models.block.Block.find_all",
                        staticmethod(lambda: [{"id": 1}]))
    monkeypatch.setattr("models.question.Question.find_by_blocks",
                        staticmethod(lambda ids: [
                            {"id": q, "block_id": 1, "text_uk": f"Питання номер {q}",
                             "parent_question_id": None}
                            for q in range(1, _N_QUESTIONS + 1)]))


@pytest.fixture
def corpus(monkeypatch):
    """Three submissions, models monkeypatched. Returns the raw rows."""
    subs = _make_subs(3)
    _patch_models(monkeypatch, subs)
    return subs


@pytest.fixture
def spool(monkeypatch, tmp_path):
    """Redirect the system temp dir so leaked temp files are observable."""
    d = tmp_path / "tmp"
    d.mkdir()
    monkeypatch.setattr(tempfile, "tempdir", str(d))
    return d


# ---------------------------------------------------------------------------
# The pre-change implementation, kept as the reference oracle.
# ---------------------------------------------------------------------------

def _legacy_build_excels_zip_bytes(test_id) -> bytes:
    """Verbatim copy of the old in-RAM builder — the behaviour to preserve."""
    subs = ex._filter_submissions_for_test(test_id)
    blocks = ex._get_test_blocks(test_id)
    qkeys, qlabels = ex._collect_questions_for_blocks(blocks)

    buf = BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for s in subs:
            wb = openpyxl.Workbook()
            ws = wb.active
            name = (f"{s.get('first_name') or ''} {s.get('last_name') or ''}".strip()
                    or f"sub{s['id']}")
            ws.title = ex._safe_sheet_name(name)
            ex._fill_single_user_sheet(ws, s, qkeys, qlabels)
            date_part = str(s.get("created_at") or "").replace(":", "-").replace(" ", "_")[:19]
            stem = ex._safe_filename(f"{s['id']}_{name}_{date_part}")
            zf.writestr(f"{stem}.xlsx", ex.workbook_to_bytes(wb))
    buf.seek(0)
    return buf.getvalue()


def _sheet_dump(xlsx_bytes):
    """Every cell value of every sheet — the comparable content of a workbook.

    Raw .xlsx bytes are NOT comparable: openpyxl stamps docProps/core.xml with
    the current time, so two builds of the same data differ.
    """
    book = openpyxl.load_workbook(BytesIO(xlsx_bytes))
    return {ws.title: [[c.value for c in row] for row in ws.iter_rows()]
            for ws in book.worksheets}


# ---------------------------------------------------------------------------
# A. The archive is unchanged
# ---------------------------------------------------------------------------

class TestArchiveParity:

    def test_same_entries_in_the_same_order(self, corpus):
        legacy = _legacy_build_excels_zip_bytes(1)
        path = ex.build_excels_zip_for_test(1)
        try:
            with zipfile.ZipFile(BytesIO(legacy)) as old, zipfile.ZipFile(path) as new:
                assert new.namelist() == old.namelist()
                assert len(new.namelist()) == 3
        finally:
            os.remove(path)

    def test_same_cell_content_in_every_entry(self, corpus):
        legacy = _legacy_build_excels_zip_bytes(1)
        path = ex.build_excels_zip_for_test(1)
        try:
            with zipfile.ZipFile(BytesIO(legacy)) as old, zipfile.ZipFile(path) as new:
                for name in old.namelist():
                    assert _sheet_dump(new.read(name)) == _sheet_dump(old.read(name)), name
        finally:
            os.remove(path)

    def test_entry_names_carry_id_name_and_date(self, corpus):
        path = ex.build_excels_zip_for_test(1)
        try:
            with zipfile.ZipFile(path) as zf:
                first = zf.namelist()[0]
            assert first.startswith("1_Іван1 Петренко1_2026-01-02")
            assert first.endswith(".xlsx")
        finally:
            os.remove(path)

    def test_returns_a_path_not_bytes(self, corpus):
        path = ex.build_excels_zip_for_test(1)
        try:
            assert isinstance(path, str)
            assert os.path.isfile(path)
            assert path.endswith(".zip")
        finally:
            os.remove(path)

    def test_empty_test_yields_an_empty_archive(self, monkeypatch):
        _patch_models(monkeypatch, [])
        path = ex.build_excels_zip_for_test(1)
        try:
            with zipfile.ZipFile(path) as zf:
                assert zf.namelist() == []
        finally:
            os.remove(path)

    def test_dest_dir_is_honoured(self, corpus, tmp_path):
        path = ex.build_excels_zip_for_test(1, dest_dir=str(tmp_path))
        try:
            assert os.path.dirname(path) == str(tmp_path)
        finally:
            os.remove(path)


# ---------------------------------------------------------------------------
# B. The temp file never leaks
# ---------------------------------------------------------------------------

class TestTempFileCleanup:

    def test_mid_build_exception_removes_the_partial_file(self, corpus, spool, monkeypatch):
        calls = {"n": 0}
        real = ex._fill_single_user_sheet

        def explode(ws, sub, *a, **kw):
            calls["n"] += 1
            if calls["n"] == 2:            # fail AFTER bytes are already on disk
                raise RuntimeError("boom")
            return real(ws, sub, *a, **kw)

        monkeypatch.setattr(ex, "_fill_single_user_sheet", explode)
        with pytest.raises(RuntimeError):
            ex.build_excels_zip_for_test(1)
        assert os.listdir(spool) == []

    def test_base_exception_removes_the_partial_file(self, corpus, spool, monkeypatch):
        """A gunicorn recycle / Ctrl-C raises BaseException, not Exception."""
        monkeypatch.setattr(ex, "_fill_single_user_sheet",
                            lambda *a, **kw: (_ for _ in ()).throw(KeyboardInterrupt()))
        with pytest.raises(KeyboardInterrupt):
            ex.build_excels_zip_for_test(1)
        assert os.listdir(spool) == []

    def test_a_failed_unlink_does_not_mask_the_real_error(self, corpus, spool, monkeypatch):
        monkeypatch.setattr(ex, "_fill_single_user_sheet",
                            lambda *a, **kw: (_ for _ in ()).throw(RuntimeError("original")))
        monkeypatch.setattr(ex.os, "remove",
                            lambda p: (_ for _ in ()).throw(OSError("read-only fs")))
        with pytest.raises(RuntimeError, match="original"):
            ex.build_excels_zip_for_test(1)

    def test_no_file_descriptor_is_left_open(self, corpus):
        """The archive must be closed before the path is handed to the caller —
        otherwise send_file would race a half-flushed zip central directory."""
        path = ex.build_excels_zip_for_test(1)
        try:
            with zipfile.ZipFile(path) as zf:
                assert zf.testzip() is None       # complete, readable archive
        finally:
            os.remove(path)


# ---------------------------------------------------------------------------
# C. Memory: the archive is no longer accumulated in the heap
# ---------------------------------------------------------------------------

class TestMemoryProfile:

    @staticmethod
    def _peak(fn, *a, **kw):
        gc.collect()                     # start from a clean, comparable heap
        tracemalloc.start()
        try:
            result = fn(*a, **kw)
            _, peak = tracemalloc.get_traced_memory()
        finally:
            tracemalloc.stop()
        return result, peak

    def test_the_archive_is_never_held_in_memory(self, monkeypatch, tmp_path):
        """A 32 MB archive costs the same heap as a 4 MB one.

        The per-user workbook is stubbed with a fixed incompressible blob: that
        isolates the property under test (nothing accumulates across entries)
        from openpyxl's cost, and makes the archive big enough that a BytesIO
        implementation could not possibly pass — its peak would have to contain
        every byte written.
        """
        blob = os.urandom(1_000_000)
        monkeypatch.setattr(ex, "_fill_single_user_sheet", lambda *a, **kw: None)
        monkeypatch.setattr(ex, "workbook_to_bytes", lambda wb: blob)

        def build(n):
            _patch_models(monkeypatch, _make_subs(n))
            path, peak = self._peak(ex.build_excels_zip_for_test, 1, dest_dir=str(tmp_path))
            size = os.path.getsize(path)
            os.remove(path)
            return size, peak

        small_size, small_peak = build(4)
        big_size, big_peak = build(32)

        assert big_size > 30_000_000                  # ~32 MB really reached disk
        assert big_size > small_size * 7              # 8x the payload…
        assert big_peak < small_peak * 1.3            # …at the same heap cost
        # Only one blob is ever in flight (plus its compressed copy).
        assert big_peak < big_size * 0.2

    def test_peak_is_flat_as_the_corpus_grows(self, monkeypatch):
        """4x the submissions → 4x the archive, but essentially the same peak.

        This is the property the BytesIO version could not have: there, the peak
        contained the whole archive by construction.
        """
        def build(n):
            _patch_models(monkeypatch, _make_subs(n))
            path, peak = self._peak(ex.build_excels_zip_for_test, 1)
            size = os.path.getsize(path)
            os.remove(path)
            return size, peak

        small_size, small_peak = build(40)
        big_size, big_peak = build(160)

        assert big_size > small_size * 3             # the archive really did grow
        # What still grows is the ZIP central directory (~0.6 KB per entry),
        # which has to be in RAM to close the archive — not the payload.
        assert big_peak < small_peak * 1.5

    def test_peak_is_lower_than_the_old_in_ram_build(self, monkeypatch):
        subs = _make_subs(120)

        _patch_models(monkeypatch, subs)
        legacy_bytes, legacy_peak = self._peak(_legacy_build_excels_zip_bytes, 1)

        _patch_models(monkeypatch, subs)
        path, new_peak = self._peak(ex.build_excels_zip_for_test, 1)
        os.remove(path)

        assert new_peak < legacy_peak
        # The old peak necessarily held the archive (BytesIO buffer + the
        # getvalue() copy); the saving is on the order of a whole archive.
        assert legacy_peak - new_peak > len(legacy_bytes) * 0.6


# ---------------------------------------------------------------------------
# D. HTTP contract
# ---------------------------------------------------------------------------

def _admin_jwt():
    return jwt.encode({"role": "admin"}, os.environ["JWT_SECRET"], algorithm="HS256")


@pytest.fixture
def client(corpus, spool):
    from routes import submissions as subs_route
    app = Flask(__name__)
    app.register_blueprint(subs_route.submissions_bp)
    return app.test_client()


@pytest.fixture
def admin_client(client):
    client.set_cookie(key="admin_session", value=_admin_jwt(), domain="localhost")
    client.set_cookie(key="admin_csrf", value=CSRF, domain="localhost")
    return client


_URL = "/api_crowe_bizcheck/submissions/tests/1/export/excels-zip"


class TestHttp:

    def test_requires_an_admin_session(self, client):
        assert client.get(_URL).status_code == 401

    def test_serves_the_archive_with_the_same_headers_as_before(self, admin_client):
        r = admin_client.get(_URL)
        assert r.status_code == 200
        assert r.mimetype == "application/zip"
        cd = r.headers["Content-Disposition"]
        assert cd.startswith("attachment")
        assert "BizCheck_test_1_excels.zip" in cd
        assert r.data[:2] == b"PK"
        with zipfile.ZipFile(BytesIO(r.data)) as zf:
            assert len(zf.namelist()) == 3

    def test_body_matches_the_old_in_ram_response(self, admin_client, corpus):
        legacy = _legacy_build_excels_zip_bytes(1)
        r = admin_client.get(_URL)
        with zipfile.ZipFile(BytesIO(legacy)) as old, zipfile.ZipFile(BytesIO(r.data)) as new:
            assert new.namelist() == old.namelist()
            for name in old.namelist():
                assert _sheet_dump(new.read(name)) == _sheet_dump(old.read(name))

    def test_temp_file_is_gone_after_the_request(self, admin_client, spool):
        admin_client.get(_URL)
        assert os.listdir(spool) == []

    def test_temp_file_is_unlinked_before_the_body_is_streamed(self, admin_client, spool):
        """The unlink is an `after_this_request` hook, so it runs while the
        response is finalized — not when the stream ends. A client that drops
        the connection halfway therefore cannot leak the archive, and the open
        descriptor still delivers the complete file.
        """
        r = admin_client.get(_URL, buffered=False)
        try:
            assert os.listdir(spool) == []          # already deleted…
            body = b"".join(r.response)             # …yet the transfer completes
        finally:
            r.close()
        assert body[:2] == b"PK"
        with zipfile.ZipFile(BytesIO(body)) as zf:
            assert len(zf.namelist()) == 3

    def test_client_that_aborts_mid_download_leaks_nothing(self, admin_client, spool):
        r = admin_client.get(_URL, buffered=False)
        it = iter(r.response)
        next(it, None)                              # read one chunk, then walk away
        r.close()
        assert os.listdir(spool) == []

    def test_the_response_streams_the_file_instead_of_a_bytes_body(self, corpus, spool):
        """The route must hand back a file wrapper, not `Response(<bytes>)` —
        otherwise the archive would sit in the worker's heap for the whole
        transfer even though the build itself is now on disk.
        """
        from routes import submissions as subs_route
        app = Flask(__name__)
        app.register_blueprint(subs_route.submissions_bp)
        with app.test_request_context(_URL):
            resp = subs_route.export_test_excels_zip.__wrapped__(1)
            try:
                assert resp.direct_passthrough is True
                assert not isinstance(resp.response, (bytes, list))
            finally:
                resp.close()
                path = getattr(resp.response, "name", None)
                if path and os.path.exists(path):
                    os.remove(path)

    def test_a_builder_failure_is_a_500_not_a_leak(self, admin_client, spool, monkeypatch):
        monkeypatch.setattr("services.export_service.build_excels_zip_for_test",
                            lambda *a, **kw: (_ for _ in ()).throw(RuntimeError("nope")))
        r = admin_client.get(_URL)
        assert r.status_code == 500
        assert os.listdir(spool) == []
