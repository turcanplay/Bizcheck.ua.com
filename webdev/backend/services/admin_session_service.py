"""Admin-session revocation policy (audit INFO-3).

WHY THIS EXISTS
---------------
The admin JWT lives in the httpOnly `admin_session` cookie and is valid for 8h.
Until now nothing could cut that short: POST /admin/logout only deleted the
cookie from the BROWSER. A token copied off a shared machine, or lifted from a
proxy log, stayed usable for the rest of its TTL and "log out" was cosmetic.
This module makes revocation real.

TWO REVOCATION AXES
-------------------
1. Per-token. Every admin JWT now carries a random `jti`
   (services/auth_service.generate_admin_token). Logout writes that `jti` to
   the deny-list; the middleware refuses any token whose `jti` is listed.
2. Global kill switch. `revoke_all()` stamps `not_before = now`; every token
   with `iat < not_before` is refused. This is the "the admin password may be
   compromised" button — it kills sessions we never saw a `jti` for, including
   ones an attacker holds and will obviously never log out of.

WHY POSTGRES AND NOT A PYTHON set()
-----------------------------------
gunicorn runs several worker PROCESSES (4 in this deployment). A module-level
set lives inside ONE of them, so a logout handled by worker 2 would be
invisible to workers 1/3/4: the very next request could land on a worker that
still considers the token good, and revocation would appear to work "sometimes"
— the worst possible security property, because it looks like it works.

Postgres is the only state every worker already shares, and the only one that
also survives a container restart and would keep working if the backend were
ever scaled to a second replica. The stack has no Redis and no broker;
introducing one to hold a handful of rows that live at most 8 hours is not a
trade worth making (a new service to run, monitor, secure and back up, plus a
new failure mode on the login path).

Cost: one indexed round trip per authenticated ADMIN request, on a table that
is effectively always under a hundred rows. Public traffic never pays it —
`_is_valid_admin_jwt()` returns early when there is no admin cookie at all, so
the public submission path is untouched.

WHY THE DENY-LIST DOES NOT GROW FOREVER
---------------------------------------
A revoked `jti` only has to outlive the token it belongs to. Once `exp` has
passed, the middleware rejects that token on expiry alone and the row is dead
weight. `purge_expired()` deletes exactly those rows (`expires_at <= NOW()`)
and runs after every revocation — and revoking is the ONLY thing that inserts.
So the table is self-limiting without a cron job or a background thread, and
the purge can never drop a row for a token that is still within its TTL.

FAILURE MODE: CLOSED
--------------------
If the store cannot be read, the session is treated as REVOKED (401). Failing
open would mean a database blip silently re-enables every revoked session,
which is precisely the property this module exists to remove. The trade is
acceptable because the admin panel cannot do anything useful without Postgres
anyway — every endpoint behind it reads or writes the database.
"""

import logging
from datetime import datetime, timedelta, timezone

from models.admin_session import AdminSession

logger = logging.getLogger(__name__)


# Fallback TTL for a token whose payload has no `exp` (only possible for a
# legacy token minted before this feature). Matches the 8h admin token TTL, so
# the deny-list row is guaranteed to outlive whatever it is denying.
_FALLBACK_TTL = timedelta(hours=8)

# Swappable so the DB-less unit suite can install an in-memory double; see
# tests/conftest.py. Production never calls set_store().
_store = AdminSession


def set_store(store):
    """Replace the backing store (tests only). Returns the previous one."""
    global _store
    previous = _store
    _store = store
    return previous


def get_store():
    return _store


def is_revoked(payload):
    """True when this decoded admin JWT must no longer be accepted.

    Checks both axes in a single store round trip. Fails CLOSED on any store
    error (see module docstring).
    """
    if not payload:
        return True

    jti = payload.get("jti")
    try:
        state = _store.state(jti)
    except Exception:
        logger.exception("admin session revocation check failed — denying request")
        return True

    if state.get("revoked"):
        return True

    not_before = state.get("not_before")
    if not_before is None:
        # No global revocation has ever been issued.
        return False

    iat = payload.get("iat")
    if iat is None:
        # A token minted before this feature carries no `iat`, so we cannot
        # prove it was issued AFTER the kill switch. Deny — the whole point of
        # the kill switch is that nothing survives it.
        return True

    if not_before.tzinfo is None:
        not_before = not_before.replace(tzinfo=timezone.utc)
    return datetime.fromtimestamp(int(iat), tz=timezone.utc) < not_before


def revoke(payload):
    """Deny-list the token described by `payload` (called on logout).

    Returns True when a jti was actually recorded. A legacy token without a
    `jti` cannot be revoked individually — it is still bounded by its own 8h
    `exp`, and `revoke_all()` covers it. Never raises: logout must stay
    idempotent and must always clear the browser cookie.
    """
    if not payload:
        return False

    jti = payload.get("jti")
    if not jti:
        return False

    exp = payload.get("exp")
    if exp:
        expires_at = datetime.fromtimestamp(int(exp), tz=timezone.utc)
    else:
        expires_at = datetime.now(timezone.utc) + _FALLBACK_TTL

    try:
        _store.revoke(jti, expires_at)
        return True
    except Exception:
        logger.exception("failed to record admin token revocation for jti=%s", jti)
        return False


def revoke_all():
    """Kill every admin session that currently exists. Returns the new epoch.

    Also logs out the caller (their own token was issued before `now`), which
    is intended: this is the response to a suspected credential compromise.
    """
    return _store.revoke_all()


def purge_expired():
    """Ops helper — drop deny-list rows whose token already expired."""
    return _store.purge_expired()
