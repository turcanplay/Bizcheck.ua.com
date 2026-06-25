"""Admin authentication middleware for Flask routes.

JWT is read from the `admin_session` httpOnly cookie set by /admin/login.
For mutating methods (POST/PATCH/PUT/DELETE) we additionally require a
matching CSRF token (X-CSRF-Token header == admin_csrf cookie).
"""

import os
from functools import wraps
from flask import request, jsonify
import jwt


SESSION_COOKIE = "admin_session"
CSRF_COOKIE = "admin_csrf"
CSRF_HEADER = "X-CSRF-Token"
SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


def _extract_admin_jwt():
    """Return the JWT string for an admin session, else None.

    Reads from the httpOnly cookie. (No Authorization-header fallback — the
    cookie-only path eliminates the JS-readable token attack surface.)
    """
    return request.cookies.get(SESSION_COOKIE)


def _decode_admin_jwt(token):
    """Return decoded payload if it is a valid admin JWT, else None."""
    if not token:
        return None
    try:
        payload = jwt.decode(
            token,
            os.getenv("JWT_SECRET"),
            algorithms=["HS256"],
        )
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None
    if payload.get("role") != "admin":
        return None
    return payload


def _csrf_ok():
    """Double-submit check: header must equal cookie. Both must be non-empty."""
    cookie_val = request.cookies.get(CSRF_COOKIE) or ""
    header_val = request.headers.get(CSRF_HEADER) or ""
    return bool(cookie_val) and bool(header_val) and cookie_val == header_val


def _is_valid_admin_jwt():
    """Return True if request has a valid admin session, else False.

    Sets request.admin = True on success. Used as a quick check by other
    middlewares (e.g. submission_owner_or_admin) — does NOT enforce CSRF, so
    only call it on routes that don't perform state changes via this path.
    """
    payload = _decode_admin_jwt(_extract_admin_jwt())
    if not payload:
        return False
    request.admin = True
    return True


def admin_required(f):
    """
    Decorator that validates the admin JWT cookie and CSRF token.

    On unsafe HTTP methods (POST/PATCH/PUT/DELETE), also requires a valid
    CSRF double-submit pair. GET/HEAD/OPTIONS skip the CSRF check.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        token = _extract_admin_jwt()
        if not token:
            return jsonify({"error": "Admin token is missing"}), 401

        try:
            payload = jwt.decode(
                token,
                os.getenv("JWT_SECRET"),
                algorithms=["HS256"],
            )
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token has expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401

        if payload.get("role") != "admin":
            return jsonify({"error": "Admin access required"}), 403

        if request.method not in SAFE_METHODS and not _csrf_ok():
            return jsonify({"error": "CSRF token missing or invalid"}), 403

        request.admin = True
        return f(*args, **kwargs)

    return decorated


def submission_owner_or_admin(f):
    """
    Authorize a request that targets a specific submission.

    Accepts either:
      - a valid admin session (the `admin_session` httpOnly cookie), OR
      - the submission's opaque per-row token (X-Submission-Token: <token>)
        that matches the {sub_id} URL parameter.

    Without one of these, returns 401. Without a matching token (wrong
    submission), returns 403. This is the primary defense against IDOR /
    BOLA on per-submission mutations (PATCH, PDF upload, email dispatch).
    """
    from models.submission import Submission

    @wraps(f)
    def decorated(*args, **kwargs):
        # Admin path — full bypass, owns everything.
        if _is_valid_admin_jwt():
            return f(*args, **kwargs)

        sub_id = kwargs.get("sub_id")
        if sub_id is None:
            return jsonify({"error": "Missing submission id"}), 400

        token = request.headers.get("X-Submission-Token", "").strip()
        if not token:
            return jsonify({"error": "Submission token required"}), 401

        if Submission.find_id_by_token(sub_id, token) is None:
            # Same response for "wrong token" and "wrong sub_id" so attacker
            # can't enumerate which submission ids exist.
            return jsonify({"error": "Forbidden"}), 403

        request.submission_authorized = True
        return f(*args, **kwargs)

    return decorated
