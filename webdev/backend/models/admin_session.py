"""Storage layer for admin-session revocation (JWT `jti` deny-list + kill switch).

Two tables, both created by `migrate()` in database/db.py:

  admin_revoked_tokens(jti, expires_at, revoked_at)
      One row per individually revoked admin JWT. Written by /admin/logout.

  admin_session_epoch(id=1, not_before)
      At most ONE row. Holds the "kill switch" timestamp: every admin token
      whose `iat` is strictly older than `not_before` is refused. The row does
      not exist until the first global revocation, so a normal install pays
      nothing for it.

Everything here is plain SQL against the shared Postgres — see
services/admin_session_service.py for WHY the state has to be shared (gunicorn
runs several worker processes) and for the failure-mode policy.

The SQL statements are module-level constants on purpose: the invariants that
keep this safe (purge only deletes ALREADY-EXPIRED rows; the kill switch never
moves backwards) are asserted directly against these strings in
tests/test_unit_admin_session_revocation.py.
"""

from database.db import query, execute


# A revoked jti only has to outlive the token it belongs to: once `exp` passes,
# the middleware rejects the token on expiry alone and the row is dead weight.
# `expires_at <= NOW()` is what makes this safe — a token that is still within
# its TTL is never dropped, so purging can never resurrect a revoked session.
PURGE_SQL = "DELETE FROM admin_revoked_tokens WHERE expires_at <= NOW()"

# Idempotent: logging out twice with the same cookie must not raise.
REVOKE_SQL = """
    INSERT INTO admin_revoked_tokens (jti, expires_at)
    VALUES (%s, %s)
    ON CONFLICT (jti) DO NOTHING
"""

# GREATEST(...) guarantees the kill switch is monotonic: a replayed or
# out-of-order write can never move `not_before` backwards and quietly
# re-validate sessions that were already killed.
#
# date_trunc('second', NOW()) matches the resolution of the JWT `iat` claim
# (integer seconds). Without it, a token minted in the same second as the
# revocation would have iat < not_before and the admin would be locked out of
# the login they just performed.
REVOKE_ALL_SQL = """
    INSERT INTO admin_session_epoch (id, not_before)
    VALUES (1, date_trunc('second', NOW()))
    ON CONFLICT (id) DO UPDATE
       SET not_before = GREATEST(admin_session_epoch.not_before, EXCLUDED.not_before)
    RETURNING not_before
"""

# One round trip answers both questions. `jti = NULL` matches nothing, so a
# legacy token minted before this feature simply skips the deny-list half.
STATE_SQL = """
    SELECT
        EXISTS (SELECT 1 FROM admin_revoked_tokens WHERE jti = %s) AS revoked,
        (SELECT not_before FROM admin_session_epoch WHERE id = 1) AS not_before
"""


class AdminSession:
    """Postgres-backed revocation store. Static methods = the store interface."""

    @staticmethod
    def state(jti):
        """Return {'revoked': bool, 'not_before': datetime|None} in one query.

        `not_before` is None until a global revocation has ever happened.
        """
        row = query(STATE_SQL, (jti,), fetch_one=True) or {}
        return {
            "revoked": bool(row.get("revoked")),
            "not_before": row.get("not_before"),
        }

    @staticmethod
    def revoke(jti, expires_at):
        """Add one jti to the deny-list until `expires_at`, then purge stale rows.

        Purging here (rather than on a cron) is what bounds the table: revoking
        is the ONLY operation that inserts, so sweeping on every insert means
        the row count can never exceed the number of logouts within one token
        TTL — a handful, in practice.
        """
        execute(REVOKE_SQL, (jti, expires_at))
        AdminSession.purge_expired()

    @staticmethod
    def revoke_all():
        """Move the kill switch to now. Invalidates every existing admin token."""
        row = execute(REVOKE_ALL_SQL) or {}
        AdminSession.purge_expired()
        return row.get("not_before")

    @staticmethod
    def purge_expired():
        """Drop deny-list rows whose token has already expired on its own."""
        execute(PURGE_SQL)
