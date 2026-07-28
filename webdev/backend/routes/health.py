"""Health / readiness endpoint.

Lives outside the obscured `/api_crowe_bizcheck/` prefix on purpose: it is the
probe target for Docker's HEALTHCHECK and for nginx, both of which are internal
callers. It exposes no data — only whether this worker can reach Postgres.

Kept in its own blueprint (rather than inline in server.py) so it can be unit
tested without importing server.py, which runs migrate() at import time.
"""

import logging

from flask import Blueprint, jsonify

log = logging.getLogger(__name__)

health_bp = Blueprint("health", __name__)

# Hard ceiling on the DB probe. Without it a wedged / failing-over database
# turns this endpoint into a hanging request — worse than an honest 503, because
# the orchestrator's own probe timeout fires and the container reads as
# "healthy but slow" instead of unhealthy.
DB_PROBE_TIMEOUT_SEC = 3


def db_ping(timeout_sec: int = DB_PROBE_TIMEOUT_SEC):
    """Run `SELECT 1` under a statement timeout.

    Returns (True, None) on success, (False, "<ExceptionClassName>") otherwise.
    Never raises and never returns the exception MESSAGE — psycopg2 messages
    carry hostnames, ports and usernames that must not reach an HTTP response.
    """
    from database.db import get_conn, put_conn

    conn = None
    try:
        conn = get_conn()
        with conn.cursor() as cur:
            cur.execute("SET LOCAL statement_timeout = %s", (int(timeout_sec) * 1000,))
            cur.execute("SELECT 1")
            cur.fetchone()
        conn.rollback()   # read-only probe — never leave a transaction open
        return True, None
    except Exception as exc:
        if conn is not None:
            try:
                conn.rollback()
            except Exception:
                log.warning("[health] rollback after a failed DB probe also failed",
                            exc_info=True)
        return False, type(exc).__name__
    finally:
        if conn is not None:
            try:
                put_conn(conn)
            except Exception:
                log.warning("[health] could not return the probe connection to the pool",
                            exc_info=True)


@health_bp.route("/api/health")
def health():
    """200 only when Postgres actually answers; 503 otherwise.

    A worker that cannot reach the database cannot serve a single real request,
    so reporting "ok" would keep nginx / Docker routing traffic into a black
    hole. `database` is "up"/"down" and `error` is the exception TYPE only.
    """
    ok, err = db_ping()
    if ok:
        return jsonify({"status": "ok", "version": "1.0.0", "database": "up"})
    log.error("[health] database probe failed: %s", err)
    return jsonify({
        "status": "degraded",
        "version": "1.0.0",
        "database": "down",
        "error": err or "unknown",
    }), 503
