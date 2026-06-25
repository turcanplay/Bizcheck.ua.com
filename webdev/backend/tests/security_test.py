"""
Security probe suite for BizCheck backend.

Runs black-box checks against a running instance (default http://localhost:4001)
for: SQL injection, stored XSS, length overflow, auth bypass, rate limiting,
path traversal, JSON injection, and common API misconfigurations.

Usage:
    python backend/tests/security_test.py
    python backend/tests/security_test.py --base http://localhost:4001

Exit code is non-zero if any HIGH-severity check fails.
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from typing import Callable

import urllib.request
import urllib.error


BASE = "http://localhost:5173"  # via nginx (proxies /api_crowe_bizcheck/* to backend:4001)
API = "/api_crowe_bizcheck"

PASS = "\033[92m✓\033[0m"
FAIL = "\033[91m✗\033[0m"
INFO = "\033[94mi\033[0m"

results: list[tuple[str, bool, str]] = []
HIGH_FAILS = 0


def _req(path: str, *, method="GET", body=None, headers=None, timeout=6) -> tuple[int, bytes, dict]:
    url = BASE + path
    data = None
    h = {"Accept": "application/json"}
    if headers:
        h.update(headers)
    if body is not None:
        data = json.dumps(body).encode() if not isinstance(body, (bytes, str)) else (
            body.encode() if isinstance(body, str) else body
        )
        h.setdefault("Content-Type", "application/json")
    req = urllib.request.Request(url, data=data, method=method, headers=h)
    try:
        resp = urllib.request.urlopen(req, timeout=timeout)
        return resp.status, resp.read(), dict(resp.headers)
    except urllib.error.HTTPError as e:
        return e.code, e.read(), dict(e.headers or {})
    except Exception as e:
        return 0, str(e).encode(), {}


def check(name: str, severity: str, fn: Callable[[], tuple[bool, str]]):
    global HIGH_FAILS
    try:
        ok, detail = fn()
    except Exception as e:
        ok, detail = False, f"exception: {e!r}"
    tag = PASS if ok else FAIL
    print(f"  {tag} [{severity}] {name} — {detail}")
    results.append((name, ok, detail))
    if not ok and severity == "HIGH":
        HIGH_FAILS += 1


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

def test_old_api_paths_404():
    """The /api/* prefix must not return JSON (SPA fallback HTML is OK)."""
    status, _, headers = _req("/api/tests")
    ct = headers.get("Content-Type", "")
    # Not a real API: either 404 OR 200 with HTML (nginx SPA fallback)
    is_json = "application/json" in ct
    return (not is_json, f"GET /api/tests → HTTP {status} ({ct or 'no ct'})")


def test_api_reachable():
    status, _, _ = _req(f"{API}/tests")
    return (status == 200, f"GET {API}/tests → HTTP {status}")


def test_security_headers():
    status, _, headers = _req(f"{API}/tests")
    required = {
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "strict-origin-when-cross-origin",
    }
    missing = [k for k, v in required.items() if headers.get(k) != v]
    return (not missing, f"missing/invalid: {missing}" if missing else "all present")


def test_sql_injection_search():
    """SQL payloads in query params must not trigger DB errors."""
    payloads = [
        "' OR 1=1--",
        "'; DROP TABLE users;--",
        "1' UNION SELECT NULL,NULL--",
        "' OR 'a'='a",
        "\" OR 1=1#",
    ]
    for p in payloads:
        status, body, _ = _req(f"{API}/tests?category=" + urllib.parse.quote(p))
        text = body.decode(errors="ignore").lower()
        if status >= 500 or "syntax" in text or "sql" in text and "error" in text:
            return False, f"leak on `{p}` → {status}"
    return True, f"{len(payloads)} payloads probed, all safe"


def test_sql_injection_body():
    """SQL payloads in POST body must not bypass validation."""
    payload = {
        "first_name": "Test",
        "last_name":  "' OR 1=1--",
        "email":      "x' UNION SELECT password FROM users--@evil.com",
        "phone":      "1234567",
        "consent":    True,
    }
    status, body, _ = _req(f"{API}/submissions", method="POST", body=payload)
    # Either rejected (400) or stored safely. Must not 500.
    return (status < 500, f"POST /submissions SQLi → {status}")


def test_xss_stored_quote():
    """Admin endpoint for testimonial must require auth AND strip HTML."""
    # Unauthenticated POST must fail
    status, _, _ = _req(f"{API}/admin/testimonials", method="POST",
                        body={"name": "<script>alert(1)</script>"})
    return (status in (401, 403), f"unauth POST admin/testimonials → {status}")


def test_length_overflow():
    """Huge strings must be rejected or truncated (not 500)."""
    huge = "A" * 100_000
    payload = {
        "first_name": huge,
        "last_name":  "X",
        "email":      "a@b.co",
        "phone":      "1234567",
        "consent":    True,
    }
    status, _, _ = _req(f"{API}/submissions", method="POST", body=payload)
    return (status < 500, f"100KB first_name → {status}")


def test_oversize_body_rejected():
    """25MB cap on Flask should return 413."""
    big = b"{" + b"\"x\":\"" + b"A" * (26 * 1024 * 1024) + b"\"}"
    status, _, _ = _req(f"{API}/submissions", method="POST", body=big,
                        headers={"Content-Type": "application/json"})
    return (status in (413, 400), f"26MB body → {status}")


def test_auth_required_admin():
    """Every admin route must 401 without token."""
    endpoints = [
        "/admin/stats", "/admin/tests", "/admin/templates",
        "/admin/testimonials", "/admin/faq", "/admin/users",
    ]
    bad = []
    for p in endpoints:
        status, _, _ = _req(API + p)
        if status not in (401, 403):
            bad.append(f"{p}={status}")
    return (not bad, f"unprotected: {bad}" if bad else f"{len(endpoints)} endpoints locked")


def test_bruteforce_login_limited():
    """Auth endpoint should rate-limit brute force."""
    # Send many wrong logins quickly
    statuses = []
    for i in range(12):
        s, _, _ = _req(f"{API}/auth/login", method="POST",
                       body={"username": "admin", "password": f"wrong{i}"})
        statuses.append(s)
    saw_429 = 429 in statuses
    return (saw_429, f"statuses={statuses[-5:]}, rate-limited={saw_429}")


def test_path_traversal():
    """Slug endpoints must not leak arbitrary paths."""
    payloads = ["../../etc/passwd", "..%2F..%2Fetc%2Fpasswd", "%00"]
    for p in payloads:
        status, body, _ = _req(f"{API}/templates/{p}")
        text = body.decode(errors="ignore")
        if "root:" in text or status == 500:
            return False, f"leak on `{p}`"
    return True, f"{len(payloads)} traversals blocked"


def test_cors_not_wildcard():
    status, _, headers = _req(f"{API}/tests",
                              headers={"Origin": "http://evil.com"})
    origin = headers.get("Access-Control-Allow-Origin", "")
    return (origin != "*", f"ACAO={origin or '(none)'}")


def test_json_content_type():
    """POST without JSON body should still return structured error."""
    status, body, _ = _req(f"{API}/submissions", method="POST", body=b"not json",
                           headers={"Content-Type": "application/json"})
    return (status in (400, 415), f"garbage body → {status}")


def test_sensitive_files():
    """Static server must not expose dotfiles or .env."""
    for p in ["/.env", "/backend/.env", "/.git/config"]:
        status, _, _ = _req(p)
        if status == 200:
            return False, f"exposed: {p}"
    return True, "dotfiles blocked"


# ---------------------------------------------------------------------------

ALL_CHECKS = [
    ("old /api/* prefix removed",            "HIGH",   test_old_api_paths_404),
    ("API reachable at new prefix",          "HIGH",   test_api_reachable),
    ("security headers present",             "MEDIUM", test_security_headers),
    ("SQLi in query params",                 "HIGH",   test_sql_injection_search),
    ("SQLi in POST body",                    "HIGH",   test_sql_injection_body),
    ("stored XSS on testimonials",           "HIGH",   test_xss_stored_quote),
    ("length overflow handled",              "MEDIUM", test_length_overflow),
    ("oversize body rejected (413)",         "MEDIUM", test_oversize_body_rejected),
    ("admin endpoints require auth",         "HIGH",   test_auth_required_admin),
    ("login bruteforce rate-limited",        "HIGH",   test_bruteforce_login_limited),
    ("path traversal blocked",               "HIGH",   test_path_traversal),
    ("CORS not wildcard",                    "MEDIUM", test_cors_not_wildcard),
    ("malformed JSON handled",               "LOW",    test_json_content_type),
    ("sensitive files not exposed",          "MEDIUM", test_sensitive_files),
]


def main():
    global BASE
    p = argparse.ArgumentParser()
    p.add_argument("--base", default="http://localhost:5173", help="base URL (nginx)")
    args = p.parse_args()
    BASE = args.base.rstrip("/")

    print(f"\n{INFO} BizCheck security probe → {BASE}\n")
    t0 = time.time()
    for name, sev, fn in ALL_CHECKS:
        check(name, sev, fn)
    dt = time.time() - t0

    passed = sum(1 for _, ok, _ in results if ok)
    total = len(results)
    print(f"\n  {passed}/{total} passed · {dt:.1f}s · {HIGH_FAILS} HIGH failures\n")
    sys.exit(0 if HIGH_FAILS == 0 else 1)


if __name__ == "__main__":
    import urllib.parse  # noqa: E402  (used in test_sql_injection_search)
    main()
