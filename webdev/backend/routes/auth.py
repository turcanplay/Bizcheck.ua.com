"""Auth routes — register, login, refresh, me."""

from flask import Blueprint, request, jsonify

from services.auth_service import register_user, login_user, refresh_access_token
from middleware.auth_middleware import auth_required
from models.user import User

auth_bp = Blueprint("auth", __name__, url_prefix="/api_crowe_bizcheck/auth")


@auth_bp.route("/register", methods=["POST"])
def register():
    """POST /api/auth/register — Create a new user account."""
    data = request.get_json(silent=True) or {}

    username = (data.get("username") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    errors = []
    if not username or len(username) < 3:
        errors.append("Username must be at least 3 characters")
    if not email or "@" not in email:
        errors.append("A valid email is required")
    if not password or len(password) < 6:
        errors.append("Password must be at least 6 characters")
    if errors:
        return jsonify({"errors": errors}), 400

    try:
        user, access_token, refresh_token = register_user(username, email, password)
        user["created_at"] = str(user["created_at"])
        return jsonify({
            "user": user,
            "access_token": access_token,
            "refresh_token": refresh_token,
        }), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 409


@auth_bp.route("/login", methods=["POST"])
def login():
    """POST /api/auth/login — Authenticate and receive tokens."""
    data = request.get_json(silent=True) or {}

    username = (data.get("username") or "").strip()
    password = data.get("password") or ""

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    try:
        user, access_token, refresh_token = login_user(username, password)
        return jsonify({
            "user": user,
            "access_token": access_token,
            "refresh_token": refresh_token,
        })
    except ValueError as e:
        return jsonify({"error": str(e)}), 401


@auth_bp.route("/refresh", methods=["POST"])
def refresh():
    """POST /api/auth/refresh — Get a new access token using a refresh token."""
    data = request.get_json(silent=True) or {}
    refresh_token = data.get("refresh_token") or ""

    if not refresh_token:
        return jsonify({"error": "Refresh token is required"}), 400

    try:
        access_token = refresh_access_token(refresh_token)
        return jsonify({"access_token": access_token})
    except ValueError as e:
        return jsonify({"error": str(e)}), 401


@auth_bp.route("/me", methods=["GET"])
@auth_required
def me():
    """GET /api/auth/me — Get the authenticated user's profile."""
    user = User.find_by_id(request.user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    user["created_at"] = str(user["created_at"])
    return jsonify({"user": user})
