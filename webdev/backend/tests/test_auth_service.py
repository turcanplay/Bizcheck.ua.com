"""Unit tests for services.auth_service — password hashing, JWT, admin login.

User-model DB access is monkeypatched. JWT secrets & admin creds come from
conftest env defaults.
"""
import os

import jwt
import pytest

from services import auth_service as a


class TestPasswordHashing:
    def test_hash_is_not_plaintext(self):
        h = a.hash_password("s3cret")
        assert h != "s3cret"
        assert h.startswith("$2")            # bcrypt marker

    def test_verify_roundtrip(self):
        h = a.hash_password("s3cret")
        assert a.verify_password("s3cret", h) is True
        assert a.verify_password("wrong", h) is False

    def test_two_hashes_of_same_password_differ(self):
        assert a.hash_password("x") != a.hash_password("x")   # per-hash salt


class TestTokens:
    def test_access_token_decodes_with_user_id(self):
        tok = a.generate_access_token(7)
        payload = jwt.decode(tok, os.getenv("JWT_SECRET"), algorithms=["HS256"])
        assert payload["user_id"] == 7

    def test_refresh_token_is_typed(self):
        tok = a.generate_refresh_token(7)
        payload = jwt.decode(tok, os.getenv("JWT_REFRESH_SECRET"), algorithms=["HS256"])
        assert payload["type"] == "refresh"

    def test_admin_token_has_admin_role(self):
        tok = a.generate_admin_token()
        payload = jwt.decode(tok, os.getenv("JWT_SECRET"), algorithms=["HS256"])
        assert payload["role"] == "admin"

    def test_refresh_access_token_issues_new_access(self):
        refresh = a.generate_refresh_token(11)
        access = a.refresh_access_token(refresh)
        payload = jwt.decode(access, os.getenv("JWT_SECRET"), algorithms=["HS256"])
        assert payload["user_id"] == 11

    def test_refresh_rejects_access_token(self):
        # Passing an access token (no type=refresh) must be rejected.
        access = a.generate_access_token(11)
        with pytest.raises(ValueError):
            a.refresh_access_token(access)

    def test_refresh_rejects_garbage(self):
        with pytest.raises(ValueError):
            a.refresh_access_token("not.a.jwt")


class TestRegisterUser:
    def test_rejects_duplicate_username(self, monkeypatch):
        monkeypatch.setattr("models.user.User.find_by_username", staticmethod(lambda u: {"id": 1}))
        with pytest.raises(ValueError, match="Username"):
            a.register_user("taken", "e@x.md", "pw")

    def test_rejects_duplicate_email(self, monkeypatch):
        monkeypatch.setattr("models.user.User.find_by_username", staticmethod(lambda u: None))
        monkeypatch.setattr("models.user.User.find_by_email", staticmethod(lambda e: {"id": 1}))
        with pytest.raises(ValueError, match="Email"):
            a.register_user("new", "taken@x.md", "pw")

    def test_success_returns_user_and_tokens(self, monkeypatch):
        monkeypatch.setattr("models.user.User.find_by_username", staticmethod(lambda u: None))
        monkeypatch.setattr("models.user.User.find_by_email", staticmethod(lambda e: None))
        monkeypatch.setattr("models.user.User.create",
                            staticmethod(lambda u, e, h: {"id": 42, "username": u, "email": e}))
        user, access, refresh = a.register_user("new", "e@x.md", "pw")
        assert user["id"] == 42
        assert access and refresh


class TestLoginUser:
    def test_invalid_when_user_missing(self, monkeypatch):
        monkeypatch.setattr("models.user.User.find_by_username", staticmethod(lambda u: None))
        with pytest.raises(ValueError):
            a.login_user("ghost", "pw")

    def test_invalid_when_password_wrong(self, monkeypatch):
        h = a.hash_password("right")
        monkeypatch.setattr("models.user.User.find_by_username",
                            staticmethod(lambda u: {"id": 1, "username": u, "email": "e",
                                                    "password_hash": h, "created_at": "t"}))
        with pytest.raises(ValueError):
            a.login_user("bob", "wrong")

    def test_success_omits_password_hash(self, monkeypatch):
        h = a.hash_password("right")
        monkeypatch.setattr("models.user.User.find_by_username",
                            staticmethod(lambda u: {"id": 1, "username": u, "email": "e@x.md",
                                                    "password_hash": h, "created_at": "t"}))
        safe_user, access, refresh = a.login_user("bob", "right")
        assert "password_hash" not in safe_user
        assert safe_user["id"] == 1
        assert access and refresh


class TestLoginAdmin:
    def test_correct_creds_returns_token(self):
        tok = a.login_admin("admin", "admin")
        payload = jwt.decode(tok, os.getenv("JWT_SECRET"), algorithms=["HS256"])
        assert payload["role"] == "admin"

    def test_wrong_password_rejected(self):
        with pytest.raises(ValueError):
            a.login_admin("admin", "nope")

    def test_empty_creds_rejected_even_if_env_empty(self, monkeypatch):
        # Fail-closed: unset admin creds must NOT let "" == "" authenticate.
        monkeypatch.delenv("ADMIN_USERNAME", raising=False)
        monkeypatch.delenv("ADMIN_PASSWORD", raising=False)
        with pytest.raises(ValueError):
            a.login_admin("", "")
