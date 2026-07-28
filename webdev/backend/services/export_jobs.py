"""Asynchronous, disk-spooled export jobs — currently the per-test PDF ZIP.

WHY THIS EXISTS
---------------
``build_pdfs_zip_for_test`` reads every submission's PDF out of BYTEA and streams
it into a ZIP. Measured on the real corpus (~3.2 MB per PDF):

    100 submissions →  6.6 s (323 MB)
    250 submissions → 16.2 s (807 MB)
    500 submissions → ~32 s  (1.6 GB)

Done on the request thread that pins one of the 4 gunicorn workers for the whole
run (Dockerfile: ``--workers 4 --threads 2``), i.e. 25% of the request capacity
for half a minute, per click. The Excel exports stay synchronous — they are
under 1 s up to 500 submissions and are not worth the extra moving parts.

WHERE THE STATE LIVES (and why)
-------------------------------
Both the job STATE and the produced ARTIFACT live in ONE spool directory on the
container filesystem — ``EXPORT_SPOOL_DIR`` (default ``<tmp>/bizcheck_exports``):

    <spool>/<token>/state.json    the job record
    <spool>/<token>/archive.zip   the finished archive

gunicorn runs 4 worker PROCESSES in a SINGLE backend container, so a
module-level dict is NOT shared: worker B would answer "unknown job" for a job
started in worker A. The filesystem IS shared between those processes, and it is
the only place a 1.6 GB artifact can reasonably live — storing it in Postgres
would duplicate bytes the DB already holds as `submissions.pdf_data`.

Given that the artifact MUST sit on shared storage, keeping the state in
Postgres instead would buy nothing and would ADD a failure mode: a row saying
"ready" while the file is on a filesystem the answering process cannot reach.
State and artifact in the same directory are consistent by construction — if the
directory is gone, the job is gone, from every worker's point of view.

Operational consequence: if the backend is ever scaled to more than one
CONTAINER, ``EXPORT_SPOOL_DIR`` must point at a shared volume mounted in every
replica. No compose change is needed for the current single-container shape.

AUTHORIZATION
-------------
The job id IS the capability: ``secrets.token_urlsafe(32)`` (256 bits), never a
counter, so an id cannot be guessed or enumerated. It is NOT a substitute for
auth — every route that touches a job is still ``@admin_required``. The token
only guarantees that one admin's job cannot be reached by walking ids.

FAILURE / CLEANUP
-----------------
* A job that raises ends in state ``failed`` with a short reason — never stuck
  in "running".
* A worker that dies mid-run (gunicorn recycle, OOM kill, deploy) leaves a job
  whose heartbeat stops. Any reader older than ``EXPORT_JOB_STALE_AFTER``
  reports it as ``failed`` instead of "running forever".
* ``sweep()`` runs opportunistically on create / status / download and after
  every worker job. It deletes ready archives after
  ``EXPORT_JOB_DOWNLOADED_TTL`` (once downloaded) or ``EXPORT_JOB_READY_TTL``
  (never downloaded), failed jobs after ``EXPORT_JOB_FAILED_TTL``, and abandoned
  running jobs once they are stale beyond both.

No new infrastructure: stdlib ``queue`` + one daemon thread per process, the
same shape already used by services/sales_notify.py.
"""
from __future__ import annotations

import json
import logging
import os
import queue
import re
import secrets
import shutil
import tempfile
import threading
import time

log = logging.getLogger(__name__)


# ──────────────────────────────────────────────────────────────────
# Vocabulary
# ──────────────────────────────────────────────────────────────────

KIND_PDFS_ZIP = "pdfs_zip"

STATE_QUEUED = "queued"
STATE_RUNNING = "running"
STATE_READY = "ready"
STATE_FAILED = "failed"

ACTIVE_STATES = (STATE_QUEUED, STATE_RUNNING)
TERMINAL_STATES = (STATE_READY, STATE_FAILED)

_STATE_FILE = "state.json"
_ARTIFACT_FILE = "archive.zip"

# secrets.token_urlsafe(32) yields 43 chars from [A-Za-z0-9_-]. The bounds are
# generous but the CHARSET is the point: this regex is the path-traversal guard
# for every token that reaches the filesystem ("..", "/", NUL can never match).
_TOKEN_RE = re.compile(r"^[A-Za-z0-9_-]{22,128}$")

# Bounded backlog. One worker thread per process drains it, so heavy archives are
# built one at a time instead of N concurrent 1.6 GB writes filling the disk.
_QUEUE_MAXSIZE = 16


class JobQueueFull(Exception):
    """Raised by create_job when the backlog is saturated (→ HTTP 503)."""


# ──────────────────────────────────────────────────────────────────
# Configuration (env-overridable, read at call time so tests can patch)
# ──────────────────────────────────────────────────────────────────

def _env_int(name: str, default: int) -> int:
    raw = (os.getenv(name) or "").strip()
    if not raw:
        return default
    try:
        val = int(raw)
    except ValueError:
        log.warning("[export-jobs] %s=%r is not an integer — using %s", name, raw, default)
        return default
    return val if val > 0 else default


def spool_root() -> str:
    """The spool directory, created on demand with owner-only permissions."""
    root = (os.getenv("EXPORT_SPOOL_DIR") or "").strip()
    if not root:
        root = os.path.join(tempfile.gettempdir(), "bizcheck_exports")
    os.makedirs(root, mode=0o700, exist_ok=True)
    return root


def ready_ttl() -> int:
    """How long a finished, NEVER downloaded archive is kept."""
    return _env_int("EXPORT_JOB_READY_TTL", 3600)


def downloaded_ttl() -> int:
    """Grace period after a download — long enough to retry a broken transfer,
    short enough that gigabytes do not linger."""
    return _env_int("EXPORT_JOB_DOWNLOADED_TTL", 600)


def failed_ttl() -> int:
    """How long a failed job is kept so the admin can still read the reason."""
    return _env_int("EXPORT_JOB_FAILED_TTL", 1800)


def stale_after() -> int:
    """No heartbeat for this long while queued/running → the job is declared dead."""
    return _env_int("EXPORT_JOB_STALE_AFTER", 900)


# ──────────────────────────────────────────────────────────────────
# State file I/O
# ──────────────────────────────────────────────────────────────────

def job_dir(token) -> str | None:
    """Absolute directory for ``token``, or None when the token is malformed.

    The only place a caller-supplied token is turned into a path. Anything that
    is not a token_urlsafe alphabet string is rejected before touching the FS.
    """
    if not isinstance(token, str) or not _TOKEN_RE.match(token):
        return None
    return os.path.join(spool_root(), token)


def _read_state(token) -> dict | None:
    d = job_dir(token)
    if not d:
        return None
    try:
        with open(os.path.join(d, _STATE_FILE), "r", encoding="utf-8") as fh:
            data = json.load(fh)
    except (OSError, ValueError):
        return None
    return data if isinstance(data, dict) else None


def _write_state(token, state: dict) -> bool:
    """Atomically replace the job's state file. Returns False if the job dir is
    gone (swept while the worker was running) — never raises."""
    d = job_dir(token)
    if not d:
        return False
    tmp = os.path.join(d, f".{_STATE_FILE}.tmp")
    try:
        with open(tmp, "w", encoding="utf-8") as fh:
            json.dump(state, fh)
        os.replace(tmp, os.path.join(d, _STATE_FILE))
        return True
    except OSError:
        log.warning("[export-jobs] could not persist state for %s", token, exc_info=True)
        try:
            os.remove(tmp)
        except OSError:
            pass
        return False


def _now() -> float:
    return time.time()


def _rm_job(token) -> None:
    d = job_dir(token)
    if d:
        shutil.rmtree(d, ignore_errors=True)


# ──────────────────────────────────────────────────────────────────
# Public shape
# ──────────────────────────────────────────────────────────────────

# Where the job endpoints live. Kept next to public_job() so the URLs it hands
# back can never drift from the routes in routes/submissions.py.
_API_PREFIX = "/api_crowe_bizcheck"
_JOBS_PATH = "/submissions/exports/jobs"


def public_job(state: dict) -> dict:
    """API projection of a job record. Never exposes filesystem paths.

    Both URL forms are provided on purpose: ``status_url`` / ``download_url``
    are absolute API paths (usable in a plain link), while ``status_path`` /
    ``download_path`` are relative to the SPA's API_BASE, which is what
    ``adminFetch()`` expects — passing the absolute one to adminFetch would
    double the /api_crowe_bizcheck prefix.
    """
    token = state.get("token")
    out = {
        "token": state.get("token"),
        "kind": state.get("kind"),
        "test_id": state.get("test_id"),
        "state": state.get("state"),
        "created_at": state.get("created_at"),
        "updated_at": state.get("updated_at"),
        "progress": state.get("progress") or {"done": 0, "total": None},
        "size_bytes": state.get("size_bytes"),
        "filename": state.get("filename"),
        "error": state.get("error"),
        "status_path": f"{_JOBS_PATH}/{token}",
        "status_url": f"{_API_PREFIX}{_JOBS_PATH}/{token}",
    }
    if state.get("state") == STATE_READY:
        out["download_path"] = f"{_JOBS_PATH}/{token}/download"
        out["download_url"] = f"{_API_PREFIX}{_JOBS_PATH}/{token}/download"
    return out


def _apply_staleness(token, state: dict) -> dict:
    """Flip an abandoned queued/running job to ``failed``.

    Without this a worker killed mid-export (gunicorn --max-requests recycle,
    OOM, redeploy) would leave the admin polling "running" forever.
    """
    if state.get("state") not in ACTIVE_STATES:
        return state
    if _now() - float(state.get("updated_at") or 0) <= stale_after():
        return state
    state = dict(state)
    state["state"] = STATE_FAILED
    state["error"] = "export worker stopped responding"
    state["updated_at"] = _now()
    _write_state(token, state)          # best effort: make the verdict stick
    return state


def get_job(token, *, do_sweep: bool = True) -> dict | None:
    """Job record for ``token``, or None when unknown/expired/malformed."""
    if do_sweep:
        sweep()
    state = _read_state(token)
    if state is None:
        return None
    return _apply_staleness(token, state)


def artifact_path(token) -> str | None:
    """Path of the finished archive, or None when it is not (yet) on disk."""
    d = job_dir(token)
    if not d:
        return None
    path = os.path.join(d, _ARTIFACT_FILE)
    return path if os.path.isfile(path) else None


def mark_downloaded(token) -> None:
    """Stamp the job as delivered so the sweeper reclaims it on the short TTL.

    Deliberately NOT an immediate delete: a 1.6 GB transfer that drops halfway
    would otherwise force the admin to rebuild the whole archive. The grace
    period (EXPORT_JOB_DOWNLOADED_TTL, 10 min) allows a retry.
    """
    state = _read_state(token)
    if not state:
        return
    state["downloaded_at"] = _now()
    state["updated_at"] = _now()
    _write_state(token, state)


# ──────────────────────────────────────────────────────────────────
# Creation
# ──────────────────────────────────────────────────────────────────

def _iter_jobs():
    try:
        names = os.listdir(spool_root())
    except OSError:
        return
    for name in names:
        if not _TOKEN_RE.match(name):
            continue
        state = _read_state(name)
        if state is not None:
            yield name, state


def _find_active(kind, test_id) -> dict | None:
    """An already queued/running job for the same export, if any.

    Guards against the obvious double-click: two clicks would otherwise build
    two multi-gigabyte archives of identical content.
    """
    for token, state in _iter_jobs():
        if state.get("kind") != kind or state.get("test_id") != test_id:
            continue
        state = _apply_staleness(token, state)
        if state.get("state") in ACTIVE_STATES:
            return state
    return None


def create_job(test_id: int, *, kind: str = KIND_PDFS_ZIP, filename: str | None = None) -> dict:
    """Register a job, hand it to the background worker and return its record.

    Returns an EXISTING queued/running job for the same (kind, test_id) instead
    of starting a duplicate. Raises JobQueueFull when the backlog is saturated.
    """
    sweep()

    existing = _find_active(kind, test_id)
    if existing is not None:
        return existing

    token = secrets.token_urlsafe(32)
    d = job_dir(token)
    if d is None:                                   # unreachable; belt & braces
        raise RuntimeError("generated an invalid job token")
    os.makedirs(d, mode=0o700, exist_ok=True)

    now = _now()
    state = {
        "token": token,
        "kind": kind,
        "test_id": test_id,
        "state": STATE_QUEUED,
        "created_at": now,
        "updated_at": now,
        "progress": {"done": 0, "total": None},
        "size_bytes": None,
        "filename": filename or f"BizCheck_test_{test_id}_pdfs.zip",
        "error": None,
        "downloaded_at": None,
    }
    _write_state(token, state)

    _ensure_worker()
    try:
        _QUEUE.put_nowait(token)
    except queue.Full:
        _rm_job(token)
        log.error("[export-jobs] backlog full — refused a %s job for test %s", kind, test_id)
        raise JobQueueFull("export backlog is full")

    return state


# ──────────────────────────────────────────────────────────────────
# Worker
# ──────────────────────────────────────────────────────────────────

_QUEUE: "queue.Queue[str]" = queue.Queue(maxsize=_QUEUE_MAXSIZE)
_worker_started = False
_worker_lock = threading.Lock()


def _safe_error(exc: BaseException) -> str:
    """A reason the admin can act on, without leaking internals into the UI."""
    from services.export_service import ExportTooLarge
    if isinstance(exc, ExportTooLarge):
        return "archive exceeds the configured size limit"
    if isinstance(exc, OSError):
        return "could not write the archive to disk (out of space?)"
    return f"export failed ({type(exc).__name__})"


def run_job(token) -> dict | None:
    """Build one job to completion. Synchronous — the worker thread calls it.

    Exported (not underscore-private) so tests can drive the whole lifecycle
    deterministically without depending on thread scheduling.
    """
    state = _read_state(token)
    if state is None:
        return None

    state["state"] = STATE_RUNNING
    state["updated_at"] = _now()
    if not _write_state(token, state):
        return None                       # job dir vanished — nothing to build

    def _progress(done, total):
        state["progress"] = {"done": done, "total": total}
        state["updated_at"] = _now()
        _write_state(token, state)

    d = job_dir(token)
    try:
        from services.export_service import build_pdfs_zip_for_test
        tmp_path = build_pdfs_zip_for_test(
            state.get("test_id"), dest_dir=d, on_progress=_progress,
        )
        final = os.path.join(d, _ARTIFACT_FILE)
        # Same directory → same filesystem → atomic rename, no multi-GB copy.
        os.replace(tmp_path, final)
        state["state"] = STATE_READY
        state["size_bytes"] = os.path.getsize(final)
    except Exception as exc:
        log.exception("[export-jobs] %s job %s failed", state.get("kind"), token)
        state["state"] = STATE_FAILED
        state["error"] = _safe_error(exc)
    state["updated_at"] = _now()
    _write_state(token, state)
    return state


def _worker_loop() -> None:
    while True:
        token = _QUEUE.get()
        try:
            run_job(token)
        except Exception:                              # pragma: no cover
            log.exception("[export-jobs] worker crashed on %s", token)
        finally:
            # Sweep BEFORE task_done() so that _QUEUE.join() is a complete
            # barrier: "the job is built AND the spool has been reclaimed".
            try:
                sweep()
            except Exception:                          # pragma: no cover
                log.exception("[export-jobs] sweep failed")
            _QUEUE.task_done()


def _ensure_worker() -> None:
    global _worker_started
    if _worker_started:
        return
    with _worker_lock:
        if _worker_started:
            return
        threading.Thread(target=_worker_loop, daemon=True, name="export-jobs").start()
        _worker_started = True


# ──────────────────────────────────────────────────────────────────
# Cleanup
# ──────────────────────────────────────────────────────────────────

def sweep(now: float | None = None) -> int:
    """Delete expired job directories. Returns how many were removed.

    Cheap (one listdir + a small JSON read per job) so it can run inline on
    every create / status / download instead of needing a cron or a scheduler.
    """
    now = _now() if now is None else now
    removed = 0

    try:
        names = os.listdir(spool_root())
    except OSError:
        return 0

    for name in names:
        d = os.path.join(spool_root(), name)
        if not os.path.isdir(d):
            continue
        if not _TOKEN_RE.match(name):
            # Not something we created — leave it alone rather than rm -rf a
            # directory that happens to share the spool root.
            continue

        state = _read_state(name)
        if state is None:
            # Half-created or corrupted: reclaim once it is clearly not in use.
            try:
                age = now - os.path.getmtime(d)
            except OSError:
                continue
            if age > failed_ttl():
                shutil.rmtree(d, ignore_errors=True)
                removed += 1
            continue

        job_state = state.get("state")
        updated = float(state.get("updated_at") or 0)

        if job_state in ACTIVE_STATES:
            # Abandoned run: already reported as failed by _apply_staleness;
            # reclaim the bytes only well after that, so a slow-but-alive job is
            # never deleted from under itself.
            if now - updated > stale_after() + failed_ttl():
                shutil.rmtree(d, ignore_errors=True)
                removed += 1
            continue

        if job_state == STATE_READY:
            downloaded = state.get("downloaded_at")
            if downloaded:
                expired = now - float(downloaded) > downloaded_ttl()
            else:
                expired = now - updated > ready_ttl()
            if expired:
                shutil.rmtree(d, ignore_errors=True)
                removed += 1
            continue

        if job_state == STATE_FAILED and now - updated > failed_ttl():
            shutil.rmtree(d, ignore_errors=True)
            removed += 1

    return removed
