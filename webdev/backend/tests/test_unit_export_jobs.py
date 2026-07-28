"""Unit tests for the ASYNC PDF-ZIP export (services/export_jobs.py + routes).

No database and no running backend: the model layer is monkeypatched and the
spool directory is redirected into pytest's tmp_path.

The background thread is deliberately NOT started in these tests. `create_job`
only registers the job and enqueues the token; `run_job` is called explicitly so
the whole lifecycle (queued → running → ready → downloaded) is deterministic
instead of depending on thread scheduling.

Covered:
  * lifecycle: start → poll → ready → download → cleanup
  * a job that raises ends in `failed` with a reason (never stuck "running")
  * a worker that dies mid-run stops the job going stale-forever
  * TTL sweeping: ready / downloaded / failed / abandoned
  * authorization on status + download (admin cookie, CSRF on the POST)
  * job tokens are unguessable and can never escape the spool directory
"""
import json
import os
import queue
import sys
import time
import zipfile

import jwt
import pytest
from flask import Flask

_HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(_HERE))

CSRF = "unit-csrf"


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

_SUB = {
    "id": 7,
    "first_name": "Іван", "last_name": "Петренко",
    "phone": "+380671112233", "email": "i@example.ua",
    "created_at": "2026-01-02 03:04:05",
}


@pytest.fixture
def jobs(monkeypatch, tmp_path):
    """services.export_jobs wired to an isolated spool dir, worker suppressed."""
    from services import export_jobs as ej

    monkeypatch.setenv("EXPORT_SPOOL_DIR", str(tmp_path / "spool"))
    # No background thread: tests drive run_job() themselves.
    monkeypatch.setattr(ej, "_ensure_worker", lambda: None)
    monkeypatch.setattr(ej, "_QUEUE", queue.Queue(maxsize=ej._QUEUE_MAXSIZE))
    return ej


@pytest.fixture
def one_pdf(monkeypatch):
    """One submission with a small stored PDF."""
    monkeypatch.setattr("models.submission.Submission.find_all",
                        staticmethod(lambda test_id=None: [_SUB]))
    monkeypatch.setattr("models.submission.Submission.get_pdf",
                        staticmethod(lambda i: b"%PDF-1.4 fake"))


def _state_path(jobs, token):
    return os.path.join(jobs.job_dir(token), "state.json")


def _patch_state(jobs, token, **fields):
    """Rewrite fields of a job's state file (used to simulate aged jobs)."""
    with open(_state_path(jobs, token), encoding="utf-8") as fh:
        st = json.load(fh)
    st.update(fields)
    with open(_state_path(jobs, token), "w", encoding="utf-8") as fh:
        json.dump(st, fh)
    return st


# ---------------------------------------------------------------------------
# A. Happy-path lifecycle
# ---------------------------------------------------------------------------

class TestLifecycle:

    def test_create_returns_queued_job_with_unguessable_token(self, jobs, one_pdf):
        job = jobs.create_job(3)
        assert job["state"] == jobs.STATE_QUEUED
        assert job["test_id"] == 3
        # token_urlsafe(32) → 43 chars of [A-Za-z0-9_-]; never a counter.
        assert len(job["token"]) >= 40
        assert job["token"] not in ("1", "0", str(3))

    def test_create_enqueues_the_token_for_the_worker(self, jobs, one_pdf):
        job = jobs.create_job(3)
        assert jobs._QUEUE.get_nowait() == job["token"]

    def test_two_distinct_jobs_get_distinct_tokens(self, jobs, one_pdf):
        a = jobs.create_job(1)
        # Finish the first so it is no longer "active" and cannot be re-joined.
        jobs.run_job(a["token"])
        b = jobs.create_job(1)
        assert a["token"] != b["token"]

    def test_run_job_produces_a_ready_archive(self, jobs, one_pdf):
        token = jobs.create_job(3)["token"]
        jobs.run_job(token)

        job = jobs.get_job(token)
        assert job["state"] == jobs.STATE_READY
        assert job["error"] is None
        assert job["size_bytes"] > 0

        path = jobs.artifact_path(token)
        with zipfile.ZipFile(path) as zf:
            assert len(zf.namelist()) == 1
            assert zf.namelist()[0].endswith(".pdf")

    def test_public_job_exposes_a_download_url_only_when_ready(self, jobs, one_pdf):
        token = jobs.create_job(3)["token"]
        assert "download_url" not in jobs.public_job(jobs.get_job(token))
        jobs.run_job(token)
        pub = jobs.public_job(jobs.get_job(token))
        assert pub["download_url"].endswith(f"/exports/jobs/{token}/download")

    def test_progress_is_reported_while_running(self, jobs, monkeypatch):
        many = [dict(_SUB, id=i) for i in range(25)]
        monkeypatch.setattr("models.submission.Submission.find_all",
                            staticmethod(lambda test_id=None: many))
        monkeypatch.setattr("models.submission.Submission.get_pdf",
                            staticmethod(lambda i: b"%PDF-1.4 x"))
        token = jobs.create_job(3)["token"]
        jobs.run_job(token)
        assert jobs.get_job(token)["progress"] == {"done": 25, "total": 25}

    def test_concurrent_start_joins_the_running_job_instead_of_duplicating(
            self, jobs, one_pdf):
        """A double-click must not build two multi-gigabyte archives."""
        first = jobs.create_job(3)
        second = jobs.create_job(3)
        assert second["token"] == first["token"]

    def test_a_different_test_gets_its_own_job(self, jobs, one_pdf):
        assert jobs.create_job(3)["token"] != jobs.create_job(4)["token"]


# ---------------------------------------------------------------------------
# B. Failure paths — a job must never be stuck "in progress"
# ---------------------------------------------------------------------------

class TestFailure:

    def test_build_error_ends_in_failed_with_a_reason(self, jobs, monkeypatch):
        def boom(*a, **kw):
            raise RuntimeError("BYTEA read exploded")
        monkeypatch.setattr("services.export_service.build_pdfs_zip_for_test", boom)

        token = jobs.create_job(3)["token"]
        jobs.run_job(token)

        job = jobs.get_job(token)
        assert job["state"] == jobs.STATE_FAILED
        assert job["error"]
        # The internal message must not leak into an admin-facing field.
        assert "BYTEA read exploded" not in job["error"]
        assert jobs.artifact_path(token) is None

    def test_too_large_gets_a_specific_reason(self, jobs, monkeypatch):
        from services.export_service import ExportTooLarge

        def boom(*a, **kw):
            raise ExportTooLarge()
        monkeypatch.setattr("services.export_service.build_pdfs_zip_for_test", boom)

        token = jobs.create_job(3)["token"]
        jobs.run_job(token)
        assert "size limit" in jobs.get_job(token)["error"]

    def test_dead_worker_is_reported_as_failed_not_running_forever(self, jobs, one_pdf):
        """gunicorn recycle / OOM kill mid-export: the heartbeat stops."""
        token = jobs.create_job(3)["token"]
        _patch_state(jobs, token,
                     state=jobs.STATE_RUNNING,
                     updated_at=time.time() - jobs.stale_after() - 60)

        job = jobs.get_job(token)
        assert job["state"] == jobs.STATE_FAILED
        assert "stopped responding" in job["error"]

    def test_the_stale_verdict_is_persisted(self, jobs, one_pdf):
        token = jobs.create_job(3)["token"]
        _patch_state(jobs, token,
                     state=jobs.STATE_RUNNING,
                     updated_at=time.time() - jobs.stale_after() - 60)
        jobs.get_job(token)
        with open(_state_path(jobs, token), encoding="utf-8") as fh:
            assert json.load(fh)["state"] == jobs.STATE_FAILED

    def test_a_still_fresh_running_job_is_left_alone(self, jobs, one_pdf):
        token = jobs.create_job(3)["token"]
        _patch_state(jobs, token, state=jobs.STATE_RUNNING, updated_at=time.time())
        assert jobs.get_job(token)["state"] == jobs.STATE_RUNNING

    def test_backlog_full_is_refused_and_leaves_no_directory(self, jobs, one_pdf):
        for i in range(jobs._QUEUE_MAXSIZE):
            jobs._QUEUE.put_nowait(f"filler-{i}")
        before = os.listdir(jobs.spool_root())
        with pytest.raises(jobs.JobQueueFull):
            jobs.create_job(99)
        assert os.listdir(jobs.spool_root()) == before


# ---------------------------------------------------------------------------
# C. Cleanup / TTL — the spool must not grow forever
# ---------------------------------------------------------------------------

class TestSweep:

    def test_downloaded_archive_is_reclaimed_after_the_short_ttl(self, jobs, one_pdf):
        token = jobs.create_job(3)["token"]
        jobs.run_job(token)
        jobs.mark_downloaded(token)
        assert jobs.artifact_path(token) is not None

        _patch_state(jobs, token, downloaded_at=time.time() - jobs.downloaded_ttl() - 10)
        assert jobs.sweep() == 1
        assert jobs.get_job(token, do_sweep=False) is None
        assert jobs.artifact_path(token) is None

    def test_downloaded_archive_survives_inside_the_grace_period(self, jobs, one_pdf):
        """A dropped 1.6 GB transfer must be retryable, not rebuilt."""
        token = jobs.create_job(3)["token"]
        jobs.run_job(token)
        jobs.mark_downloaded(token)
        assert jobs.sweep() == 0
        assert jobs.artifact_path(token) is not None

    def test_never_downloaded_archive_expires_on_the_long_ttl(self, jobs, one_pdf):
        token = jobs.create_job(3)["token"]
        jobs.run_job(token)
        _patch_state(jobs, token, updated_at=time.time() - jobs.ready_ttl() - 10)
        assert jobs.sweep() == 1
        assert jobs.get_job(token, do_sweep=False) is None

    def test_fresh_ready_archive_is_kept(self, jobs, one_pdf):
        token = jobs.create_job(3)["token"]
        jobs.run_job(token)
        assert jobs.sweep() == 0
        assert jobs.get_job(token)["state"] == jobs.STATE_READY

    def test_failed_job_is_reclaimed_after_its_ttl(self, jobs, one_pdf):
        token = jobs.create_job(3)["token"]
        _patch_state(jobs, token, state=jobs.STATE_FAILED, error="x",
                     updated_at=time.time() - jobs.failed_ttl() - 10)
        assert jobs.sweep() == 1
        assert jobs.get_job(token, do_sweep=False) is None

    def test_abandoned_running_job_is_reclaimed_but_only_well_after_stale(
            self, jobs, one_pdf):
        token = jobs.create_job(3)["token"]
        # Stale (reported failed) but not yet reclaimable — a slow job must never
        # have its directory deleted from under it.
        _patch_state(jobs, token, state=jobs.STATE_RUNNING,
                     updated_at=time.time() - jobs.stale_after() - 10)
        assert jobs.sweep() == 0

        _patch_state(jobs, token, state=jobs.STATE_RUNNING,
                     updated_at=time.time() - jobs.stale_after() - jobs.failed_ttl() - 10)
        assert jobs.sweep() == 1

    def test_ttls_are_env_overridable(self, jobs, monkeypatch):
        monkeypatch.setenv("EXPORT_JOB_READY_TTL", "42")
        assert jobs.ready_ttl() == 42
        monkeypatch.setenv("EXPORT_JOB_READY_TTL", "not-a-number")
        assert jobs.ready_ttl() == 3600          # falls back, does not crash

    def test_foreign_directories_in_the_spool_are_never_deleted(self, jobs):
        # Dots are outside the token alphabet → sweep must not touch this.
        keep = os.path.join(jobs.spool_root(), "some.other.thing")
        os.makedirs(keep, exist_ok=True)
        jobs.sweep()
        assert os.path.isdir(keep)


# ---------------------------------------------------------------------------
# D. Token safety — no traversal, no enumeration
# ---------------------------------------------------------------------------

class TestTokenSafety:

    @pytest.mark.parametrize("bad", [
        "..", "../..", "../../etc/passwd", "a/b", "a\\b", "", "  ", "short",
        "tok\x00en", "1", None, 7, "x" * 200,
    ])
    def test_malformed_tokens_never_become_a_path(self, jobs, bad):
        assert jobs.job_dir(bad) is None
        assert jobs.get_job(bad) is None
        assert jobs.artifact_path(bad) is None

    def test_unknown_but_well_formed_token_is_simply_missing(self, jobs):
        assert jobs.get_job("A" * 43) is None


# ---------------------------------------------------------------------------
# E. HTTP contract + authorization
# ---------------------------------------------------------------------------

def _admin_jwt():
    return jwt.encode({"role": "admin"}, os.environ["JWT_SECRET"], algorithm="HS256")


@pytest.fixture
def client(jobs, one_pdf):
    from routes import submissions as subs_route
    app = Flask(__name__)
    app.register_blueprint(subs_route.submissions_bp)
    return app.test_client()


@pytest.fixture
def admin_client(client):
    client.set_cookie(key="admin_session", value=_admin_jwt(), domain="localhost")
    client.set_cookie(key="admin_csrf", value=CSRF, domain="localhost")
    return client


_START = "/api_crowe_bizcheck/submissions/tests/3/export/pdfs-zip/jobs"
_JOBS = "/api_crowe_bizcheck/submissions/exports/jobs"


class TestHttpAuthorization:

    def test_start_requires_an_admin_session(self, client):
        assert client.post(_START).status_code == 401

    def test_start_requires_the_csrf_double_submit(self, admin_client):
        assert admin_client.post(_START).status_code == 403

    def test_status_requires_an_admin_session(self, client):
        assert client.get(f"{_JOBS}/{'A' * 43}").status_code == 401

    def test_download_requires_an_admin_session(self, client):
        assert client.get(f"{_JOBS}/{'A' * 43}/download").status_code == 401

    def test_a_valid_token_alone_is_not_enough(self, admin_client, client, jobs):
        """The token is unguessable, but it is NOT an auth bypass."""
        token = admin_client.post(_START, headers={"X-CSRF-Token": CSRF}) \
                            .get_json()["job"]["token"]
        jobs.run_job(token)
        anonymous = client
        anonymous.delete_cookie("admin_session", domain="localhost")
        assert anonymous.get(f"{_JOBS}/{token}/download").status_code == 401


class TestHttpContract:

    def test_start_returns_202_and_a_queued_job(self, admin_client):
        r = admin_client.post(_START, headers={"X-CSRF-Token": CSRF})
        assert r.status_code == 202
        job = r.get_json()["job"]
        assert job["state"] == "queued"
        assert job["test_id"] == 3
        assert job["filename"] == "BizCheck_test_3_pdfs.zip"

    def test_job_carries_both_url_forms_the_spa_needs(self, admin_client, jobs):
        """`*_path` is API_BASE-relative (adminFetch), `*_url` is absolute.
        Mixing them up double-prefixes /api_crowe_bizcheck — pin both shapes."""
        job = admin_client.post(_START, headers={"X-CSRF-Token": CSRF}) \
                          .get_json()["job"]
        token = job["token"]
        assert job["status_path"] == f"/submissions/exports/jobs/{token}"
        assert job["status_url"] == f"/api_crowe_bizcheck{job['status_path']}"

        jobs.run_job(token)
        ready = admin_client.get(f"{_JOBS}/{token}").get_json()["job"]
        assert ready["download_path"] == f"/submissions/exports/jobs/{token}/download"
        assert ready["download_url"] == f"/api_crowe_bizcheck{ready['download_path']}"

    def test_status_of_an_unknown_job_is_404(self, admin_client):
        assert admin_client.get(f"{_JOBS}/{'A' * 43}").status_code == 404

    def test_status_of_a_malformed_token_is_404_not_500(self, admin_client):
        assert admin_client.get(f"{_JOBS}/..").status_code == 404

    def test_download_before_ready_is_409(self, admin_client):
        token = admin_client.post(_START, headers={"X-CSRF-Token": CSRF}) \
                            .get_json()["job"]["token"]
        r = admin_client.get(f"{_JOBS}/{token}/download")
        assert r.status_code == 409
        assert r.get_json()["state"] == "queued"

    def test_full_flow_start_poll_download(self, admin_client, jobs):
        token = admin_client.post(_START, headers={"X-CSRF-Token": CSRF}) \
                            .get_json()["job"]["token"]
        jobs.run_job(token)

        status = admin_client.get(f"{_JOBS}/{token}").get_json()["job"]
        assert status["state"] == "ready"
        assert status["download_url"].endswith(f"/exports/jobs/{token}/download")

        r = admin_client.get(status["download_url"])
        assert r.status_code == 200
        assert r.mimetype == "application/zip"
        assert "BizCheck_test_3_pdfs.zip" in r.headers["Content-Disposition"]
        assert r.data[:2] == b"PK"

    def test_download_marks_the_job_for_early_cleanup(self, admin_client, jobs):
        token = admin_client.post(_START, headers={"X-CSRF-Token": CSRF}) \
                            .get_json()["job"]["token"]
        jobs.run_job(token)
        admin_client.get(f"{_JOBS}/{token}/download")
        with open(_state_path(jobs, token), encoding="utf-8") as fh:
            assert json.load(fh)["downloaded_at"]

    def test_failed_job_status_reports_the_error(self, admin_client, jobs, monkeypatch):
        monkeypatch.setattr(
            "services.export_service.build_pdfs_zip_for_test",
            lambda *a, **kw: (_ for _ in ()).throw(RuntimeError("nope")))
        token = admin_client.post(_START, headers={"X-CSRF-Token": CSRF}) \
                            .get_json()["job"]["token"]
        jobs.run_job(token)
        job = admin_client.get(f"{_JOBS}/{token}").get_json()["job"]
        assert job["state"] == "failed"
        assert job["error"]
        assert "download_url" not in job

    def test_ready_job_whose_archive_vanished_is_410(self, admin_client, jobs):
        token = admin_client.post(_START, headers={"X-CSRF-Token": CSRF}) \
                            .get_json()["job"]["token"]
        jobs.run_job(token)
        os.remove(jobs.artifact_path(token))
        assert admin_client.get(f"{_JOBS}/{token}/download").status_code == 410

    def test_backlog_full_is_503(self, admin_client, jobs):
        for i in range(jobs._QUEUE_MAXSIZE):
            jobs._QUEUE.put_nowait(f"filler-{i}")
        r = admin_client.post(_START, headers={"X-CSRF-Token": CSRF})
        assert r.status_code == 503


# ---------------------------------------------------------------------------
# F. The real background thread (the part that actually takes the work off the
#    request thread). Everything above drives run_job() directly; this test
#    proves the queue → daemon-thread wiring is connected.
# ---------------------------------------------------------------------------

class TestRealWorkerThread:

    def test_job_completes_on_the_background_worker(self, monkeypatch, tmp_path, one_pdf):
        from services import export_jobs as ej

        monkeypatch.setenv("EXPORT_SPOOL_DIR", str(tmp_path / "spool"))
        # NOTE: neither _ensure_worker nor _QUEUE is patched here — the thread
        # blocks on the module-level queue object, so swapping it would orphan it.
        job = ej.create_job(3)
        ej._QUEUE.join()                     # worker ran the job AND swept

        done = ej.get_job(job["token"], do_sweep=False)
        assert done["state"] == ej.STATE_READY
        assert ej.artifact_path(job["token"])


# ---------------------------------------------------------------------------
# G. The legacy synchronous route must keep working (frontend compatibility)
# ---------------------------------------------------------------------------

class TestLegacySyncRouteStillWorks:

    def test_sync_pdfs_zip_still_returns_the_archive(self, admin_client):
        r = admin_client.get("/api_crowe_bizcheck/submissions/tests/3/export/pdfs-zip")
        assert r.status_code == 200
        assert r.mimetype == "application/zip"
        assert r.data[:2] == b"PK"
