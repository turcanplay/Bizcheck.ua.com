"""
CRM pull API — the client's CRM fetches leads from bizcheck.com.ua with an API key.

Read-only. Every response is the canonical lead JSON from
services/crm_payload.build_lead (the same object the outbound webhook pushes),
so a CRM mapping written for one integration path works for the other.

Auth is a STRICT machine key, mirroring the X-Bot-Secret gates in
routes/tg_admin.py / routes/tg_group.py:
  * CRM_API_KEY unset/empty on the server → 403 always (feature disabled, never open);
  * key missing or wrong                  → 401 with a generic error;
  * key sent as `X-Api-Key: <key>` OR `Authorization: Bearer <key>`.

  GET /crm/ping              connection test for the CRM integrator
  GET /crm/leads             ?since_id=&since=&limit=&complete_only=  (id ASC)
  GET /crm/leads/<id>        one lead or 404
"""
import hmac
import os
from datetime import datetime, timezone

from flask import Blueprint, jsonify, request

from models.submission import Submission
from services.crm_payload import SCHEMA_VERSION, build_lead, _load_test

crm_bp = Blueprint("crm", __name__, url_prefix="/api_crowe_bizcheck/crm")

DEFAULT_LIMIT = 50
MAX_LIMIT = 200

# complete_only over-fetch bounds: rows are scanned in batches of _SCAN_BATCH
# (each row costs 4 Fernet decryptions) for at most _SCAN_ROUNDS rounds, so one
# request decrypts at most 1000 rows no matter how many abandoned quizzes sit
# between two real leads.
_SCAN_BATCH = 200
_SCAN_ROUNDS = 5

_TRUE = {"1", "true", "yes", "on"}
_FALSE = {"0", "false", "no", "off"}


def _presented_key(req) -> str:
    """The key from X-Api-Key, else from `Authorization: Bearer <key>`.

    The Bearer form exists only because many CRMs can't set custom headers.
    This is NOT admin auth — it is a separate machine key for this read-only
    blueprint. Admin auth stays cookie + CSRF only, no Bearer fallback there.
    """
    key = (req.headers.get("X-Api-Key") or "").strip()
    if key:
        return key
    auth = (req.headers.get("Authorization") or "").strip()
    scheme, _, value = auth.partition(" ")
    if scheme.lower() == "bearer":
        return value.strip()
    return ""


@crm_bp.before_request
def _guard():
    """STRICT: a configured key is mandatory. No key → feature off (403)."""
    expected = (os.getenv("CRM_API_KEY") or "").strip()
    if not expected:
        return jsonify({"error": "forbidden"}), 403
    presented = _presented_key(request)
    # bytes, so a non-ASCII header can't make compare_digest raise TypeError.
    if not presented or not hmac.compare_digest(
        presented.encode("utf-8"), expected.encode("utf-8")
    ):
        return jsonify({"error": "unauthorized"}), 401
    return None


@crm_bp.after_request
def _no_store(response):
    # Leads are PII. server.py also sets this for the whole API prefix; repeated
    # here so the blueprint is safe on its own (and in unit tests).
    response.headers["Cache-Control"] = "no-store"
    response.headers["Pragma"] = "no-cache"
    return response


def _bad(msg):
    return jsonify({"error": msg}), 400


def _parse_since(raw):
    """ISO-8601 → aware datetime (naive input is read as UTC). Raises ValueError."""
    raw = raw.strip()
    if raw.endswith(("Z", "z")):
        raw = raw[:-1] + "+00:00"
    dt = datetime.fromisoformat(raw)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def _is_complete(sub) -> bool:
    """Same rule as services/sales_notify.maybe_notify_sales: a name AND a
    contact channel (email, phone or Telegram chat)."""
    has_name = bool(sub.get("first_name") or sub.get("last_name"))
    has_contact = bool(sub.get("email") or sub.get("phone") or sub.get("tg_chat_id"))
    return has_name and has_contact


def _test_for(test_id, cache):
    """Each distinct test loaded once per request. `{}` (falsy) for a missing
    test so build_lead doesn't retry the lookup for every row."""
    if test_id not in cache:
        cache[test_id] = _load_test(test_id) or {}
    return cache[test_id]


@crm_bp.route("/ping", methods=["GET"])
def ping():
    return jsonify({"ok": True, "service": "bizcheck.com.ua",
                    "schema_version": SCHEMA_VERSION})


@crm_bp.route("/leads", methods=["GET"])
def list_leads():
    args = request.args

    raw_limit = args.get("limit")
    if raw_limit is None or raw_limit.strip() == "":
        limit = DEFAULT_LIMIT
    else:
        try:
            limit = int(raw_limit.strip())
        except ValueError:
            return _bad("limit must be an integer")
        if limit < 1:
            return _bad("limit must be >= 1")
        limit = min(limit, MAX_LIMIT)

    since_id = None
    raw_since_id = args.get("since_id")
    if raw_since_id is not None and raw_since_id.strip() != "":
        try:
            since_id = int(raw_since_id.strip())
        except ValueError:
            return _bad("since_id must be an integer")
        if since_id < 0:
            return _bad("since_id must be >= 0")

    since = None
    raw_since = args.get("since")
    if raw_since is not None and raw_since.strip() != "":
        try:
            since = _parse_since(raw_since)
        except ValueError:
            return _bad("since must be an ISO-8601 datetime")

    raw_complete = (args.get("complete_only") or "").strip().lower()
    if raw_complete == "" or raw_complete in _TRUE:
        complete_only = True
    elif raw_complete in _FALSE:
        complete_only = False
    else:
        return _bad("complete_only must be true or false")

    picked = []
    cursor = since_id
    truncated = False  # scan bound hit with more rows possibly left
    if not complete_only:
        picked = Submission.list_for_crm(since=since, since_id=since_id, limit=limit)
    else:
        for _ in range(_SCAN_ROUNDS):
            batch = Submission.list_for_crm(since=since, since_id=cursor, limit=_SCAN_BATCH)
            if not batch:
                break
            for sub in batch:
                if _is_complete(sub):
                    picked.append(sub)
                    if len(picked) >= limit:
                        break
            if len(picked) >= limit:
                break
            cursor = batch[-1]["id"]
            if len(batch) < _SCAN_BATCH:
                break
        else:
            truncated = True

    if picked:
        next_since_id = picked[-1]["id"]
    elif truncated:
        # A whole scan window of incomplete rows: move past it, or a CRM polling
        # with since_id would be stuck on the same window forever.
        next_since_id = cursor
    else:
        # Nothing new. Keep the caller's cursor so trailing incomplete rows (a
        # quiz still in progress) are re-checked on the next poll.
        next_since_id = since_id

    tests = {}
    leads = [build_lead(s, test=_test_for(s.get("test_id"), tests)) for s in picked]
    return jsonify({"leads": leads, "count": len(leads), "next_since_id": next_since_id})


@crm_bp.route("/leads/<int:submission_id>", methods=["GET"])
def get_lead(submission_id):
    sub = Submission.find_by_id(submission_id)
    if not sub:
        return jsonify({"error": "not found"}), 404
    return jsonify(build_lead(sub, test=_test_for(sub.get("test_id"), {})))
