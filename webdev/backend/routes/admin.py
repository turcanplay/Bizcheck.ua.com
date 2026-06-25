"""Admin routes — login, session check, logout, stats, users list.

Auth model:
  - On login, the admin JWT is set as a httpOnly Secure SameSite=Strict cookie
    (`admin_session`). It is invisible to JavaScript, so a stored XSS payload
    cannot exfiltrate it.
  - A separate non-httpOnly cookie (`admin_csrf`) carries a random CSRF token.
    JS reads it and echoes it as the `X-CSRF-Token` header on every mutating
    request. Server compares header vs cookie (double-submit pattern). Without
    a matching pair, the request is rejected — defeats CSRF even if SameSite
    is not honored by some browser.
"""
import os
import secrets
from flask import Blueprint, request, jsonify, make_response

from services.auth_service import login_admin
from services.admin_service import get_stats, get_users_with_scores
from middleware.admin_middleware import admin_required

admin_bp = Blueprint("admin", __name__, url_prefix="/api_crowe_bizcheck/admin")


SESSION_COOKIE = "admin_session"
CSRF_COOKIE = "admin_csrf"
# Matches the 8h JWT TTL from generate_admin_token (services/auth_service.py).
# Keeping them equal means the cookie and the token expire together.
COOKIE_MAX_AGE = 8 * 60 * 60


def _is_prod():
    return os.getenv("NODE_ENV") == "production"


def _set_admin_cookies(resp, jwt_token, csrf_token):
    secure = _is_prod()
    resp.set_cookie(
        SESSION_COOKIE, jwt_token,
        max_age=COOKIE_MAX_AGE, httponly=True, secure=secure,
        samesite="Strict", path="/",
    )
    # Non-httpOnly so the SPA can read it and echo back as X-CSRF-Token.
    # SameSite=Strict prevents it from being sent on cross-site requests at all.
    resp.set_cookie(
        CSRF_COOKIE, csrf_token,
        max_age=COOKIE_MAX_AGE, httponly=False, secure=secure,
        samesite="Strict", path="/",
    )


def _clear_admin_cookies(resp):
    resp.delete_cookie(SESSION_COOKIE, path="/")
    resp.delete_cookie(CSRF_COOKIE, path="/")


@admin_bp.route("/login", methods=["POST"])
def admin_login():
    """POST /api/admin/login — Authenticate; set httpOnly session + CSRF cookies."""
    data = request.get_json(silent=True) or {}

    username = (data.get("username") or "").strip()
    password = data.get("password") or ""

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    try:
        token = login_admin(username, password)
    except ValueError as e:
        return jsonify({"error": str(e)}), 401

    csrf_token = secrets.token_urlsafe(32)
    # csrf_token is also returned in the body so the SPA can store it in
    # memory immediately (the cookie may not be readable in some test envs).
    resp = make_response(jsonify({"ok": True, "csrf_token": csrf_token}))
    _set_admin_cookies(resp, token, csrf_token)
    return resp


@admin_bp.route("/session", methods=["GET"])
@admin_required
def session():
    """GET /api/admin/session — Probe used by SPA on mount to verify auth."""
    csrf = request.cookies.get(CSRF_COOKIE) or ""
    return jsonify({"ok": True, "csrf_token": csrf})


@admin_bp.route("/logout", methods=["POST"])
def admin_logout():
    """POST /api/admin/logout — Clear session cookies. Always 200 (idempotent)."""
    resp = make_response(jsonify({"ok": True}))
    _clear_admin_cookies(resp)
    return resp


@admin_bp.route("/stats", methods=["GET"])
@admin_required
def stats():
    """GET /api/admin/stats — Dashboard statistics."""
    return jsonify(get_stats())


@admin_bp.route("/users", methods=["GET"])
@admin_required
def users():
    """GET /api/admin/users — All users with their scores."""
    return jsonify({"users": get_users_with_scores()})
