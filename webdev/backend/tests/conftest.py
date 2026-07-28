"""Shared pytest configuration for the backend unit-test suite.

These unit tests run WITHOUT a live Postgres or a running backend. The model
layer is monkeypatched wherever a DB round-trip would otherwise happen, so no
psycopg2 connection is ever opened.

Environment defaults required by modules-under-test are set here BEFORE any of
them are imported (JWT secrets, the PII encryption key, admin creds).
"""
import os
import sys

# --- Secrets / config that modules read at import or first use --------------
os.environ.setdefault("JWT_SECRET", "unit-test-secret-do-not-use-in-prod")
os.environ.setdefault("JWT_REFRESH_SECRET", "unit-test-refresh-secret")
os.environ.setdefault("PII_ENCRYPTION_KEY", "unit-test-pii-key")
os.environ.setdefault("ADMIN_USERNAME", "admin")
os.environ.setdefault("ADMIN_PASSWORD", "admin")

# Make backend/ importable whether pytest is launched from repo root or backend/.
_HERE = os.path.dirname(os.path.abspath(__file__))
_BACKEND = os.path.dirname(_HERE)
if _BACKEND not in sys.path:
    sys.path.insert(0, _BACKEND)

import pytest  # noqa: E402


# ---------------------------------------------------------------------------
# Admin-session revocation store — in-memory double
# ---------------------------------------------------------------------------
# Every @admin_required request now consults the revocation store
# (services/admin_session_service). The real one talks to Postgres, which this
# suite does not have, so a double is installed for the WHOLE suite — same
# contract, same semantics, no connection.
#
# NOT production code: a dict per process is exactly the thing the real store
# exists to avoid (gunicorn workers would each keep their own copy). It is fine
# here because pytest is a single process and every test gets a clean instance.

class MemoryAdminSessionStore:
    """Reference implementation of the store contract, backed by a dict."""

    def __init__(self):
        self.revoked = {}       # jti -> expires_at (aware datetime)
        self.not_before = None  # global kill-switch epoch, or None

    def state(self, jti):
        return {
            "revoked": jti is not None and jti in self.revoked,
            "not_before": self.not_before,
        }

    def revoke(self, jti, expires_at):
        self.revoked[jti] = expires_at
        self.purge_expired()

    def revoke_all(self):
        from datetime import datetime, timezone
        # Truncated to the second, and monotonic — mirrors REVOKE_ALL_SQL.
        now = datetime.now(timezone.utc).replace(microsecond=0)
        if self.not_before is None or now > self.not_before:
            self.not_before = now
        self.purge_expired()
        return self.not_before

    def purge_expired(self):
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        dead = [j for j, exp in self.revoked.items() if exp <= now]
        for j in dead:
            self.revoked.pop(j, None)
        return len(dead)


@pytest.fixture(autouse=True)
def admin_session_store():
    """Give every test a fresh, empty revocation store and restore afterwards."""
    from services import admin_session_service

    store = MemoryAdminSessionStore()
    previous = admin_session_service.set_store(store)
    try:
        yield store
    finally:
        admin_session_service.set_store(previous)
