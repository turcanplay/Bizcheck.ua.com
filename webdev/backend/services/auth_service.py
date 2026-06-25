"""Authentication service — handles register, login, token generation."""

import os
import hmac
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from models.user import User


def hash_password(password):
    """Hash a plain-text password with bcrypt (salt rounds: 12)."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(12)).decode("utf-8")


def verify_password(password, password_hash):
    """Verify a plain-text password against a bcrypt hash."""
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def generate_access_token(user_id):
    """
    Generate a short-lived JWT access token (15 minutes).

    Args:
        user_id: The authenticated user's ID.

    Returns:
        Encoded JWT string.
    """
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=15),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, os.getenv("JWT_SECRET"), algorithm="HS256")


def generate_refresh_token(user_id):
    """
    Generate a long-lived JWT refresh token (7 days).

    Args:
        user_id: The authenticated user's ID.

    Returns:
        Encoded JWT string.
    """
    payload = {
        "user_id": user_id,
        "type": "refresh",
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, os.getenv("JWT_REFRESH_SECRET"), algorithm="HS256")


def generate_admin_token():
    """
    Generate an admin JWT token (8 hours).

    Returns:
        Encoded JWT string with role='admin'.
    """
    payload = {
        "role": "admin",
        "exp": datetime.now(timezone.utc) + timedelta(hours=8),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, os.getenv("JWT_SECRET"), algorithm="HS256")


def register_user(username, email, password):
    """
    Register a new user.

    Args:
        username: Unique username.
        email: Unique email address.
        password: Plain-text password.

    Returns:
        Tuple of (user_dict, access_token, refresh_token) on success.

    Raises:
        ValueError: If username or email already exists.
    """
    if User.find_by_username(username):
        raise ValueError("Username already exists")
    if User.find_by_email(email):
        raise ValueError("Email already exists")

    pw_hash = hash_password(password)
    user = User.create(username, email, pw_hash)

    access_token = generate_access_token(user["id"])
    refresh_token = generate_refresh_token(user["id"])

    return user, access_token, refresh_token


def login_user(username, password):
    """
    Authenticate a user by username and password.

    Args:
        username: The user's username.
        password: Plain-text password to verify.

    Returns:
        Tuple of (user_dict, access_token, refresh_token) on success.

    Raises:
        ValueError: If credentials are invalid.
    """
    user = User.find_by_username(username)
    if not user or not verify_password(password, user["password_hash"]):
        raise ValueError("Invalid username or password")

    access_token = generate_access_token(user["id"])
    refresh_token = generate_refresh_token(user["id"])

    safe_user = {
        "id": user["id"],
        "username": user["username"],
        "email": user["email"],
        "created_at": str(user["created_at"]),
    }
    return safe_user, access_token, refresh_token


def refresh_access_token(refresh_token_str):
    """
    Generate a new access token from a valid refresh token.

    Args:
        refresh_token_str: The refresh JWT string.

    Returns:
        New access token string.

    Raises:
        ValueError: If the refresh token is invalid or expired.
    """
    try:
        payload = jwt.decode(
            refresh_token_str,
            os.getenv("JWT_REFRESH_SECRET"),
            algorithms=["HS256"],
        )
        if payload.get("type") != "refresh":
            raise ValueError("Invalid token type")
        return generate_access_token(payload["user_id"])
    except jwt.ExpiredSignatureError:
        raise ValueError("Refresh token has expired")
    except jwt.InvalidTokenError:
        raise ValueError("Invalid refresh token")


def login_admin(username, password):
    """
    Authenticate admin using credentials from .env.

    Args:
        username: Admin username.
        password: Admin password.

    Returns:
        Admin JWT token string.

    Raises:
        ValueError: If credentials don't match .env values.
    """
    admin_user = os.getenv("ADMIN_USERNAME")
    admin_pass = os.getenv("ADMIN_PASSWORD")

    # Fail closed: if the admin credentials are not configured, NO login is
    # possible — otherwise empty username/password would authenticate via the
    # `"" == ""` path below.
    if not admin_user or not admin_pass:
        raise ValueError("Invalid admin credentials")

    creds_ok = hmac.compare_digest(username or "", admin_user) and hmac.compare_digest(password or "", admin_pass)
    if not creds_ok:
        raise ValueError("Invalid admin credentials")

    return generate_admin_token()
