#!/usr/bin/env python3
"""Post-deploy smoke test against a RUNNING backend. Run inside the container:

    python scripts/e2e_check.py            # default: http://localhost:4001
    python scripts/e2e_check.py --strict   # skipped checks count as failures
    E2E_BASE_URL=http://backend:4001 python scripts/e2e_check.py

WHAT THIS IS FOR
----------------
It answers one question: "is the deployed stack wired up correctly?" — database
reachable, migrations applied, secrets present, auth model intact, the public
write path working end to end. It is NOT an integration suite; behaviour that
can be proven without a server belongs in tests/test_unit_*.py.

WHY IT NO LONGER HARDCODES CONTENT
----------------------------------
A fresh install starts EMPTY on purpose — `migrate()` never seeds, quiz content
is typed into the admin panel (see CLAUDE.md, "Don'ts"). The previous version
asserted the slugs `business` / `gdpr` / `hr` and "exactly one block with one
question", so it could only ever pass on one long-gone database.

The rule now:

  * checks that do not depend on content (health, schema, env, auth, CSRF,
    security headers, routing, the submission write path) ALWAYS run;
  * checks that need a test/block/question DISCOVER one from GET /tests and
    probe whatever is actually there;
  * with no content at all they report SKIP **with a reason** — never PASS.
    A false PASS on an empty database is worse than a failure, because it hides
    the fact that nothing was exercised.

EXIT CODE (contract — keep it, automation may depend on it)
-----------------------------------------------------------
  0  every check passed, or passed/legitimately skipped
  1  at least one real failure (or, with --strict, at least one skip)

Nothing in the repo invokes this file today (`deploy.sh` runs its own curl
smoke test over nginx), so it is safe to run by hand — but the code above is the
contract a future cron/deploy hook gets.

SIDE EFFECTS
------------
It creates one or two throwaway submissions to exercise the public write path,
then deletes them again (admin API first, direct SQL as fallback) and reports
whether the cleanup succeeded. It never writes quiz content, never revokes all
admin sessions, and the only session it kills is the one it opened itself.
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import secrets
import sys
import urllib.error
import urllib.parse
import urllib.request

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

DEFAULT_BASE_URL = "http://localhost:4001"
API = "/api_crowe_bizcheck"

PASS = "PASS"
FAIL = "FAIL"
SKIP = "SKIP"

# Tables created by migrate() in database/db.py. A missing one means the boot
# migration did not run (or ran against another database).
CORE_TABLES = (
    "users", "tests", "blocks", "questions", "answers", "results",
    "submissions", "templates", "template_files", "testimonials",
    "faq_items", "site_settings", "tg_outreach",
    "admin_revoked_tokens", "admin_session_epoch",
)

# Without these the backend either refuses to boot or fails on first use.
REQUIRED_ENV = (
    "JWT_SECRET", "JWT_REFRESH_SECRET", "PII_ENCRYPTION_KEY",
    "ADMIN_USERNAME", "ADMIN_PASSWORD",
)

# Optional integrations: unset means "feature deliberately off", not broken.
OPTIONAL_ENV = (
    "BOT_SHARED_SECRET", "TELEGRAM_BOT_TOKEN", "SALES_BOT_TOKEN",
    "SALES_CHAT_ID", "SMTP_PASSWORD", "PUBLIC_BASE_URL", "ALLOWED_HOSTS",
)

# Values shipped in .env.example / docker-compose defaults. Reaching production
# with one of these is a deploy accident, not a configuration choice.
PLACEHOLDER_VALUES = {
    "change_me_in_production", "change_this_password", "change_me_fernet_key",
    "your_jwt_secret_here", "your_refresh_secret_here", "change_this",
    "changeme", "CHANGE_THIS",
}

# Headers server.py must put on every /api_crowe_bizcheck/* response.
EXPECTED_SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
}

SMOKE_FIRST_NAME = "E2ESmoke"
FERNET_PREFIX = "gAAAAA"
MINIMAL_PDF = b"%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n"

# How many tests to probe before giving up on finding one with questions. A
# catalog can be long; the smoke test must stay a handful of requests.
MAX_TESTS_PROBED = 5


# ---------------------------------------------------------------------------
# Results
# ---------------------------------------------------------------------------

class Result:
    """One check outcome. `detail` is always printed — it is the whole point."""

    __slots__ = ("name", "status", "detail")

    def __init__(self, name, status, detail=""):
        self.name = name
        self.status = status
        self.detail = detail

    def __repr__(self):  # pragma: no cover - debugging aid
        return f"<Result {self.status} {self.name!r} {self.detail!r}>"


def ok(name, detail=""):
    return Result(name, PASS, detail)


def bad(name, detail=""):
    return Result(name, FAIL, detail)


def skipped(name, reason):
    """A skip MUST carry a reason — that is what distinguishes it from a pass."""
    return Result(name, SKIP, reason)


# ---------------------------------------------------------------------------
# HTTP
# ---------------------------------------------------------------------------

class Response:
    """Normalized HTTP response. `status == 0` means the request never landed."""

    def __init__(self, status, body=None, headers=None, raw=b"",
                 set_cookies=None, error=None):
        self.status = status
        self.body = body if isinstance(body, dict) else {}
        self.json = body
        self.raw = raw or b""
        self.headers = {str(k).lower(): v for k, v in (headers or {}).items()}
        self.set_cookies = list(set_cookies or [])
        self.error = error

    @property
    def unreachable(self):
        return self.error is not None

    def header(self, name):
        return self.headers.get(name.lower(), "")

    def __repr__(self):  # pragma: no cover - debugging aid
        return f"<Response {self.status}{' ' + self.error if self.error else ''}>"


def parse_set_cookie(raw):
    """'n=v; Path=/; HttpOnly' -> ('n', 'v', {'path', 'httponly'})."""
    parts = [p.strip() for p in str(raw).split(";") if p.strip()]
    if not parts:
        return "", "", set()
    name, _, value = parts[0].partition("=")
    attrs = {p.split("=", 1)[0].strip().lower() for p in parts[1:]}
    return name.strip(), value.strip(), attrs


class HttpClient:
    """Minimal urllib client with a cookie jar (the admin session needs one)."""

    def __init__(self, base_url=DEFAULT_BASE_URL, timeout=10.0):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.cookies = {}

    def request(self, method, path, body=None, headers=None, no_cookies=False):
        hdrs = dict(headers or {})
        data = None
        if body is not None:
            data = json.dumps(body).encode("utf-8")
            hdrs.setdefault("Content-Type", "application/json")
        if self.cookies and not no_cookies and "Cookie" not in hdrs:
            hdrs["Cookie"] = "; ".join(f"{k}={v}" for k, v in self.cookies.items())

        req = urllib.request.Request(
            self.base_url + path, data=data, method=method, headers=hdrs,
        )
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                return self._normalize(resp)
        except urllib.error.HTTPError as exc:          # 4xx/5xx are answers too
            return self._normalize(exc)
        except Exception as exc:                        # noqa: BLE001 - transport
            return Response(0, error=f"{type(exc).__name__}: {exc}")

    def _normalize(self, resp):
        raw = resp.read()
        try:
            parsed = json.loads(raw.decode("utf-8"))
        except Exception:                               # noqa: BLE001 - non-JSON body
            parsed = None
        info = resp.headers
        set_cookies = info.get_all("Set-Cookie") or [] if hasattr(info, "get_all") else []
        status = getattr(resp, "status", None) or getattr(resp, "code", 0)
        out = Response(status, parsed, dict(info.items()), raw, set_cookies)
        self._absorb(set_cookies)
        return out

    def _absorb(self, set_cookies):
        for raw in set_cookies:
            name, value, _ = parse_set_cookie(raw)
            if not name:
                continue
            if value in ("", '""'):
                self.cookies.pop(name, None)            # deletion
            else:
                self.cookies[name] = value


# ---------------------------------------------------------------------------
# Context
# ---------------------------------------------------------------------------

class Context:
    """Everything the checks share. Fully injectable so the suite can fake it."""

    def __init__(self, http, db_query=None, db_reason=None, env=None):
        self.http = http
        self.db_query = db_query
        self.db_reason = db_reason or "no database access from this process"
        self.env = os.environ if env is None else env

        self.tests = []                 # discovered catalog (may be empty)
        self.tests_response = None
        self.quiz = None                # (test, payload) of a test WITH questions
        self.quiz_probed = []           # [(slug, n_blocks, n_questions)]
        self.admin_jwt = None
        self.csrf = None
        self.created_submissions = []   # ids to clean up afterwards
        self.smoke_token = None

    def db(self, sql, params=None, fetch_one=False, fetch_all=False):
        return self.db_query(sql, params, fetch_one=fetch_one, fetch_all=fetch_all)


def build_db_accessor():
    """(callable, None) when the DB layer imports, (None, reason) otherwise."""
    try:
        from database.db import query
    except Exception as exc:                            # noqa: BLE001
        return None, f"database layer not importable here ({type(exc).__name__}: {exc})"

    def _query(sql, params=None, fetch_one=False, fetch_all=False):
        return query(sql, params, fetch_one=fetch_one, fetch_all=fetch_all)

    return _query, None


# ---------------------------------------------------------------------------
# Checks — infrastructure
# ---------------------------------------------------------------------------

def check_health(ctx):
    """DB-backed readiness probe. `/api/health` lives outside the API prefix."""
    r = ctx.http.request("GET", "/api/health")
    if r.unreachable:
        return bad("health", f"backend unreachable at {ctx.http.base_url}: {r.error}")
    if r.status != 200:
        return bad("health", f"HTTP {r.status} {r.body}")
    if r.body.get("status") != "ok" or r.body.get("database") != "up":
        return bad("health", f"HTTP 200 but {r.body}")
    return ok("health", f"HTTP 200 database=up version={r.body.get('version')}")


def check_db_schema(ctx):
    """Every table migrate() creates must exist — catches a migration no-show."""
    if ctx.db_query is None:
        return skipped("db schema migrated", ctx.db_reason)
    try:
        rows = ctx.db("SELECT table_name FROM information_schema.tables "
                      "WHERE table_schema = 'public'", None, fetch_all=True)
    except Exception as exc:                            # noqa: BLE001
        return bad("db schema migrated", f"query failed: {type(exc).__name__}: {exc}")
    present = {r.get("table_name") for r in (rows or [])}
    missing = [t for t in CORE_TABLES if t not in present]
    if missing:
        return bad("db schema migrated",
                   f"missing table(s): {', '.join(missing)} — did migrate() run?")
    return ok("db schema migrated", f"all {len(CORE_TABLES)} core tables present")


def check_required_env(ctx):
    missing, placeholder = [], []
    for var in REQUIRED_ENV:
        value = (ctx.env.get(var) or "").strip()
        if not value:
            missing.append(var)
        elif value in PLACEHOLDER_VALUES:
            placeholder.append(var)
    if missing or placeholder:
        parts = []
        if missing:
            parts.append(f"unset: {', '.join(missing)}")
        if placeholder:
            parts.append(f"still on the .env.example placeholder: {', '.join(placeholder)}")
        return bad("required env vars", "; ".join(parts))
    return ok("required env vars", f"all {len(REQUIRED_ENV)} set and non-placeholder")


def check_optional_env(ctx):
    unset = [v for v in OPTIONAL_ENV if not (ctx.env.get(v) or "").strip()]
    if unset:
        return skipped("optional integrations configured",
                       f"not configured (feature off by design): {', '.join(unset)}")
    return ok("optional integrations configured",
              f"all {len(OPTIONAL_ENV)} set")


def check_bot_bridge(ctx):
    """The group bot's export bridge: strictly gated on X-Bot-Secret."""
    secret = (ctx.env.get("BOT_SHARED_SECRET") or "").strip()
    if not secret:
        return skipped("bot export bridge",
                       "BOT_SHARED_SECRET is unset — /tg/exports/* is disabled (403) by design")
    path = f"{API}/tg/exports/tests"
    denied = ctx.http.request("GET", path, no_cookies=True)
    if denied.unreachable:
        return bad("bot export bridge", f"unreachable: {denied.error}")
    if denied.status != 403:
        return bad("bot export bridge",
                   f"no X-Bot-Secret should give 403, got HTTP {denied.status}")
    allowed = ctx.http.request("GET", path, headers={"X-Bot-Secret": secret},
                               no_cookies=True)
    if allowed.status != 200:
        return bad("bot export bridge",
                   f"correct X-Bot-Secret should give 200, got HTTP {allowed.status}")
    listed = allowed.json if isinstance(allowed.json, list) else []
    return ok("bot export bridge", f"403 without the secret, 200 with it ({len(listed)} test(s))")


# ---------------------------------------------------------------------------
# Checks — public API shape (content independent)
# ---------------------------------------------------------------------------

def check_tests_list(ctx):
    """Catalog endpoint. An EMPTY list is a valid answer on a fresh install."""
    r = ctx.http.request("GET", f"{API}/tests")
    if r.unreachable:
        return bad("public tests list", f"unreachable: {r.error}")
    if r.status != 200:
        return bad("public tests list", f"HTTP {r.status} {r.body}")
    tests = r.body.get("tests")
    if not isinstance(tests, list):
        return bad("public tests list", f"HTTP 200 but no 'tests' array: {r.body}")
    ctx.tests_response = r
    ctx.tests = [t for t in tests if isinstance(t, dict) and t.get("slug")]

    malformed = [t.get("slug") for t in ctx.tests
                 if not isinstance(t.get("scoring_zones"), dict) or not t.get("report_type")]
    if malformed:
        return bad("public tests list",
                   f"test(s) missing report_type/scoring_zones: {malformed}")
    slugs = [t["slug"] for t in ctx.tests]
    shown = ", ".join(slugs[:8]) + (" …" if len(slugs) > 8 else "")
    return ok("public tests list",
              f"HTTP 200, {len(slugs)} test(s)" + (f": {shown}" if slugs else " (empty catalog)"))


def check_security_headers(ctx):
    r = ctx.tests_response or ctx.http.request("GET", f"{API}/tests")
    if r.unreachable:
        return bad("security headers", f"unreachable: {r.error}")
    problems = []
    for name, expected in EXPECTED_SECURITY_HEADERS.items():
        actual = r.header(name)
        if actual != expected:
            problems.append(f"{name}={actual!r} (expected {expected!r})")
    if "default-src" not in r.header("Content-Security-Policy"):
        problems.append("Content-Security-Policy missing/!default-src")
    # API payloads carry PII — they must never be cached (CWE-525).
    if "no-store" not in r.header("Cache-Control"):
        problems.append(f"Cache-Control={r.header('Cache-Control')!r} (expected no-store)")
    if problems:
        return bad("security headers", "; ".join(problems))
    return ok("security headers", "nosniff, DENY, Referrer-Policy, CSP, no-store")


def check_quiz_requires_param(ctx):
    r = ctx.http.request("GET", f"{API}/blocks/quiz")
    if r.status != 400:
        return bad("quiz rejects a missing ?test", f"HTTP {r.status} {r.body}")
    return ok("quiz rejects a missing ?test", "HTTP 400")


def check_quiz_unknown_slug(ctx):
    slug = f"e2e-no-such-test-{secrets.token_hex(4)}"
    r = ctx.http.request("GET", f"{API}/blocks/quiz?test={slug}")
    if r.status != 200 or r.body.get("blocks") != [] or r.body.get("test") is not None:
        return bad("quiz on an unknown slug", f"HTTP {r.status} {r.body}")
    return ok("quiz on an unknown slug", "HTTP 200 blocks=[] test=null")


# ---------------------------------------------------------------------------
# Checks — content dependent (discovered, never hardcoded)
# ---------------------------------------------------------------------------

def check_quiz_for_discovered_test(ctx):
    """Probe real tests until one has questions. Skips on an empty catalog."""
    if not ctx.tests:
        return skipped(
            "quiz data for a real test",
            "no tests in the database — quiz content is entered in the admin panel",
        )
    for test in ctx.tests[:MAX_TESTS_PROBED]:
        slug = test["slug"]
        r = ctx.http.request(
            "GET", f"{API}/blocks/quiz?test={urllib.parse.quote(str(slug))}")
        if r.unreachable:
            return bad("quiz data for a real test", f"{slug}: unreachable: {r.error}")
        if r.status != 200:
            return bad("quiz data for a real test", f"{slug}: HTTP {r.status} {r.body}")
        payload_test = r.body.get("test")
        if not isinstance(payload_test, dict) or payload_test.get("slug") != slug:
            return bad("quiz data for a real test",
                       f"{slug}: payload test={payload_test}")
        blocks = r.body.get("blocks") or []
        n_questions = sum(len(b.get("questions") or []) for b in blocks)
        ctx.quiz_probed.append((slug, len(blocks), n_questions))
        if n_questions:
            ctx.quiz = (test, r.body)
            break
    detail = ", ".join(f"{s}: {nb} block(s)/{nq} question(s)"
                       for s, nb, nq in ctx.quiz_probed)
    return ok("quiz data for a real test", f"HTTP 200 — {detail}")


def check_quiz_has_questions(ctx):
    """Authorable content, so an empty test is a legitimate SKIP, not a PASS."""
    if not ctx.tests:
        return skipped("quiz has answerable questions",
                       "no tests in the database — nothing to load")
    if ctx.quiz is None:
        probed = ", ".join(s for s, _, _ in ctx.quiz_probed) or "none"
        return skipped(
            "quiz has answerable questions",
            f"no test carries questions yet (probed: {probed}) — content is authored in the admin panel",
        )
    test, payload = ctx.quiz
    blocks = payload.get("blocks") or []
    questions = [q for b in blocks for q in (b.get("questions") or [])]
    unanswerable = [q.get("id") for q in questions if not (q.get("options") or [])]
    if unanswerable:
        return bad("quiz has answerable questions",
                   f"{test['slug']}: question(s) with zero options: {unanswerable[:5]}")
    return ok("quiz has answerable questions",
              f"{test['slug']}: {len(blocks)} block(s), {len(questions)} question(s), all with options")


def check_submission_bound_to_test(ctx):
    if not ctx.tests:
        return skipped("submission binds to a test",
                       "no tests in the database — no slug to bind to")
    test = ctx.tests[0]
    r = ctx.http.request("POST", f"{API}/submissions", {
        "first_name": SMOKE_FIRST_NAME, "last_name": "Bound",
        "email": "smoke@e2e.invalid", "consent": True,
        "test_slug": test["slug"], "language": "uk",
    }, no_cookies=True)
    if r.status != 201:
        return bad("submission binds to a test", f"HTTP {r.status} {r.body}")
    sub = r.body.get("submission") or {}
    if sub.get("id"):
        ctx.created_submissions.append(sub["id"])
    if sub.get("test_id") != test.get("id"):
        return bad("submission binds to a test",
                   f"slug={test['slug']} expected test_id={test.get('id')}, got {sub.get('test_id')}")
    return ok("submission binds to a test",
              f"slug={test['slug']} → test_id={sub.get('test_id')}")


# ---------------------------------------------------------------------------
# Checks — public write path (content independent)
# ---------------------------------------------------------------------------

def check_submission_create(ctx):
    """A submission needs no test — contact data is collected before the quiz."""
    r = ctx.http.request("POST", f"{API}/submissions", {
        "first_name": SMOKE_FIRST_NAME, "last_name": "Deploy",
        "email": "smoke@e2e.invalid", "phone": "+380000000000",
        "consent": True, "language": "uk",
    }, no_cookies=True)
    if r.unreachable:
        return bad("submission create", f"unreachable: {r.error}")
    if r.status != 201:
        return bad("submission create", f"HTTP {r.status} {r.body}")
    sub = r.body.get("submission") or {}
    sub_id, token = sub.get("id"), sub.get("submission_token")
    if not sub_id:
        return bad("submission create", f"HTTP 201 without an id: {r.body}")
    ctx.created_submissions.append(sub_id)
    if not token:
        return bad("submission create",
                   f"id={sub_id} but no submission_token — the writer could never PATCH")
    ctx.smoke_token = token
    if sub.get("first_name") != SMOKE_FIRST_NAME:
        return bad("submission create",
                   f"first_name round-tripped as {sub.get('first_name')!r} — decrypt_row broken?")
    return ok("submission create", f"HTTP 201 id={sub_id}, token issued, PII round-trips")


def check_submission_bad_slug(ctx):
    r = ctx.http.request("POST", f"{API}/submissions", {
        "first_name": SMOKE_FIRST_NAME, "email": "smoke@e2e.invalid",
        "consent": True, "test_slug": f"e2e-no-such-test-{secrets.token_hex(4)}",
    }, no_cookies=True)
    if r.status != 400:
        # 201 here means an unknown slug silently created an unbound submission.
        sub_id = (r.body.get("submission") or {}).get("id")
        if sub_id:
            ctx.created_submissions.append(sub_id)
        return bad("submission with an unknown slug rejected", f"HTTP {r.status} {r.body}")
    return ok("submission with an unknown slug rejected", "HTTP 400")


def check_pii_encrypted_at_rest(ctx):
    if not ctx.created_submissions:
        return skipped("PII encrypted at rest", "no smoke submission was created")
    if ctx.db_query is None:
        return skipped("PII encrypted at rest", ctx.db_reason)
    sub_id = ctx.created_submissions[0]
    try:
        row = ctx.db("SELECT first_name FROM submissions WHERE id = %s",
                     (sub_id,), fetch_one=True)
    except Exception as exc:                            # noqa: BLE001
        return bad("PII encrypted at rest", f"query failed: {type(exc).__name__}: {exc}")
    raw = (row or {}).get("first_name")
    if raw == SMOKE_FIRST_NAME:
        return bad("PII encrypted at rest",
                   f"submission {sub_id}.first_name is stored in PLAINTEXT")
    if not raw or not str(raw).startswith(FERNET_PREFIX):
        return bad("PII encrypted at rest",
                   f"submission {sub_id}.first_name is not a Fernet token: {str(raw)[:40]!r}")
    return ok("PII encrypted at rest", f"raw column starts with {FERNET_PREFIX!r}")


def check_submission_token_gate(ctx):
    """IDOR guard: no token → 401, wrong token → 403 (same code as unknown id)."""
    if not ctx.created_submissions:
        return skipped("submission writes are token gated", "no smoke submission was created")
    sub_id = ctx.created_submissions[0]
    path = f"{API}/submissions/{sub_id}"
    anon = ctx.http.request("PATCH", path, {"status": "in_progress"}, no_cookies=True)
    if anon.status != 401:
        return bad("submission writes are token gated",
                   f"PATCH without a token gave HTTP {anon.status} (expected 401)")
    wrong = ctx.http.request("PATCH", path, {"status": "in_progress"},
                             headers={"X-Submission-Token": secrets.token_urlsafe(32)},
                             no_cookies=True)
    if wrong.status != 403:
        return bad("submission writes are token gated",
                   f"PATCH with a wrong token gave HTTP {wrong.status} (expected 403)")
    return ok("submission writes are token gated", "no token → 401, wrong token → 403")


def check_pdf_round_trip(ctx):
    """Upload + token-gated download. Catches a broken bytea/PDF storage path."""
    if not ctx.created_submissions or not ctx.smoke_token:
        return skipped("report PDF round-trip", "no smoke submission with a token")
    sub_id = ctx.created_submissions[0]
    up = ctx.http.request(
        "POST", f"{API}/submissions/{sub_id}/pdf",
        {"pdf": base64.b64encode(MINIMAL_PDF).decode()},
        headers={"X-Submission-Token": ctx.smoke_token}, no_cookies=True,
    )
    if up.status != 200:
        return bad("report PDF round-trip", f"upload gave HTTP {up.status} {up.body}")
    token = urllib.parse.quote(ctx.smoke_token)
    down = ctx.http.request("GET", f"{API}/submissions/{sub_id}/report.pdf?t={token}",
                            no_cookies=True)
    if down.status != 200:
        return bad("report PDF round-trip", f"download gave HTTP {down.status} {down.body}")
    if "application/pdf" not in down.header("Content-Type"):
        return bad("report PDF round-trip",
                   f"download Content-Type={down.header('Content-Type')!r}")
    if not down.raw.startswith(b"%PDF"):
        return bad("report PDF round-trip", f"download body is not a PDF: {down.raw[:20]!r}")
    forged = ctx.http.request(
        "GET", f"{API}/submissions/{sub_id}/report.pdf?t={secrets.token_urlsafe(32)}",
        no_cookies=True)
    if forged.status != 403:
        return bad("report PDF round-trip",
                   f"download with a wrong token gave HTTP {forged.status} (expected 403)")
    return ok("report PDF round-trip",
              f"{len(down.raw)} B back, wrong token → 403")


# ---------------------------------------------------------------------------
# Checks — admin auth (cookie + CSRF; Bearer is dead by policy)
# ---------------------------------------------------------------------------

def check_admin_requires_session(ctx):
    r = ctx.http.request("GET", f"{API}/admin/stats", no_cookies=True)
    if r.status != 401:
        return bad("admin endpoints require a session", f"HTTP {r.status} {r.body}")
    return ok("admin endpoints require a session", "HTTP 401 without a cookie")


def check_admin_login(ctx):
    """Login must set an httpOnly session cookie + a JS-readable CSRF cookie."""
    username = (ctx.env.get("ADMIN_USERNAME") or "").strip()
    password = ctx.env.get("ADMIN_PASSWORD") or ""
    if not username or not password:
        return bad("admin login", "ADMIN_USERNAME / ADMIN_PASSWORD not set in this environment")

    r = ctx.http.request("POST", f"{API}/admin/login",
                         {"username": username, "password": password})
    if r.unreachable:
        return bad("admin login", f"unreachable: {r.error}")
    if r.status != 200:
        return bad("admin login", f"HTTP {r.status} {r.body}")

    jar = {}
    for raw in r.set_cookies:
        name, value, attrs = parse_set_cookie(raw)
        jar[name] = (value, attrs)
    if "admin_session" not in jar:
        return bad("admin login", "no admin_session cookie in the response")
    session_value, session_attrs = jar["admin_session"]
    if "httponly" not in session_attrs:
        return bad("admin login", "admin_session is NOT HttpOnly — readable by any XSS")
    if "admin_csrf" not in jar:
        return bad("admin login", "no admin_csrf cookie — the double-submit pair is broken")
    csrf_value, csrf_attrs = jar["admin_csrf"]
    if "httponly" in csrf_attrs:
        return bad("admin login", "admin_csrf is HttpOnly — the SPA could never echo it")

    ctx.admin_jwt = session_value
    ctx.csrf = r.body.get("csrf_token") or csrf_value

    probe = ctx.http.request("GET", f"{API}/admin/session")
    if probe.status != 200 or not probe.body.get("ok"):
        return bad("admin login", f"session probe gave HTTP {probe.status} {probe.body}")
    return ok("admin login", "HTTP 200, httpOnly session + readable CSRF cookie, probe 200")


def check_bearer_rejected(ctx):
    """CLAUDE.md: Bearer-header admin auth is dead. This is its regression guard."""
    if not ctx.admin_jwt:
        return skipped("Bearer header is not accepted", "admin login did not succeed")
    r = ctx.http.request("GET", f"{API}/admin/stats",
                         headers={"Authorization": f"Bearer {ctx.admin_jwt}"},
                         no_cookies=True)
    if r.status != 401:
        return bad("Bearer header is not accepted",
                   f"a VALID admin JWT in the Authorization header gave HTTP {r.status}")
    return ok("Bearer header is not accepted", "valid JWT as Bearer → HTTP 401")


def check_csrf_enforced(ctx):
    """Cookie alone must not be enough for a mutating admin request."""
    if not ctx.admin_jwt:
        return skipped("CSRF double-submit enforced", "admin login did not succeed")
    # DELETE on an id that does not exist: if CSRF were broken we would get 404
    # from the handler, so nothing can be destroyed by this probe either way.
    r = ctx.http.request("DELETE", f"{API}/submissions/2147483647")
    if r.status != 403:
        return bad("CSRF double-submit enforced",
                   f"mutating request without X-CSRF-Token gave HTTP {r.status} (expected 403)")
    return ok("CSRF double-submit enforced", "cookie without X-CSRF-Token → HTTP 403")


def check_cleanup(ctx):
    """Delete the smoke rows. Also the POSITIVE half of the CSRF check."""
    if not ctx.created_submissions:
        return skipped("smoke submissions removed", "nothing was created")
    remaining = []
    for sub_id in ctx.created_submissions:
        if _delete_submission(ctx, sub_id):
            continue
        remaining.append(sub_id)
    if remaining:
        return bad("smoke submissions removed",
                   f"left behind in the database: {remaining} — delete them by hand")
    return ok("smoke submissions removed",
              f"{len(ctx.created_submissions)} row(s) deleted (admin DELETE with CSRF header)")


def _delete_submission(ctx, sub_id):
    if ctx.admin_jwt and ctx.csrf:
        r = ctx.http.request("DELETE", f"{API}/submissions/{sub_id}",
                             headers={"X-CSRF-Token": ctx.csrf})
        if r.status in (200, 404):
            return True
    if ctx.db_query is not None:
        try:
            ctx.db("DELETE FROM submissions WHERE id = %s", (sub_id,))
            return True
        except Exception:                               # noqa: BLE001
            return False
    return False


def check_logout_revokes_session(ctx):
    """Logout must deny-list the jti, not just drop the cookie. Runs LAST."""
    if not ctx.admin_jwt:
        return skipped("logout revokes the session", "admin login did not succeed")
    out = ctx.http.request("POST", f"{API}/admin/logout")
    if out.status != 200:
        return bad("logout revokes the session", f"logout gave HTTP {out.status} {out.body}")
    # Re-present the very same JWT: a cookie-only logout would still answer 200.
    replay = ctx.http.request("GET", f"{API}/admin/session",
                              headers={"Cookie": f"admin_session={ctx.admin_jwt}"},
                              no_cookies=True)
    if replay.status != 401:
        return bad("logout revokes the session",
                   f"the revoked JWT still works: HTTP {replay.status} — is admin_revoked_tokens missing?")
    return ok("logout revokes the session", "replayed JWT → HTTP 401")


# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------

# Order matters: discovery feeds the content checks, cleanup needs the admin
# session, and the logout check kills it — so it comes last.
CHECKS = (
    check_health,
    check_db_schema,
    check_required_env,
    check_optional_env,
    check_tests_list,
    check_security_headers,
    check_quiz_requires_param,
    check_quiz_unknown_slug,
    check_quiz_for_discovered_test,
    check_quiz_has_questions,
    check_submission_create,
    check_submission_bound_to_test,
    check_submission_bad_slug,
    check_pii_encrypted_at_rest,
    check_submission_token_gate,
    check_pdf_round_trip,
    check_admin_requires_session,
    check_admin_login,
    check_bearer_rejected,
    check_csrf_enforced,
    check_bot_bridge,
    check_cleanup,
    check_logout_revokes_session,
)


def run_checks(ctx, checks=CHECKS):
    """Run every check; a crashing check becomes a FAIL, never an exception."""
    results = []
    for check in checks:
        try:
            results.append(check(ctx))
        except Exception as exc:                        # noqa: BLE001
            results.append(bad(getattr(check, "__name__", str(check)),
                               f"check raised {type(exc).__name__}: {exc}"))
        # The backend being down makes every later check a meaningless timeout.
        # Collapse them into ONE skip: 20 identical lines hide the real failure.
        if check is check_health and results[-1].status == FAIL \
                and "unreachable" in results[-1].detail:
            not_run = len(checks) - len(results)
            if not_run > 0:
                results.append(skipped(
                    "remaining checks",
                    f"{not_run} check(s) not run — the backend is unreachable",
                ))
            break
    return results


def report(results, strict=False, out=None):
    """Print the table + summary, return the process exit code."""
    stream = out or sys.stdout
    passed = [r for r in results if r.status == PASS]
    failed = [r for r in results if r.status == FAIL]
    skips = [r for r in results if r.status == SKIP]

    print(file=stream)
    for r in results:
        print(f"[{r.status}] {r.name}  —  {r.detail}", file=stream)
    print(file=stream)
    print(f"Result: {len(passed)} passed, {len(failed)} failed, "
          f"{len(skips)} skipped (of {len(results)}).", file=stream)

    if skips:
        print(file=stream)
        print("Skipped — these verified NOTHING:", file=stream)
        for r in skips:
            print(f"  · {r.name}: {r.detail}", file=stream)
        if not strict:
            print("  (a fresh install is empty by design, so skips are not failures; "
                  "use --strict where you expect a fully configured environment)",
                  file=stream)
    if failed:
        print(file=stream)
        print("Failed:", file=stream)
        for r in failed:
            print(f"  · {r.name}: {r.detail}", file=stream)

    if failed:
        return 1
    if strict and skips:
        return 1
    return 0


def main(argv=None, ctx=None):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--base-url", default=os.getenv("E2E_BASE_URL", DEFAULT_BASE_URL),
                        help=f"backend base URL (default {DEFAULT_BASE_URL})")
    parser.add_argument("--strict", action="store_true",
                        help="treat skipped checks as failures (seeded environments)")
    parser.add_argument("--timeout", type=float, default=10.0, help="per-request timeout, seconds")
    args = parser.parse_args(argv)

    if ctx is None:
        db_query, db_reason = build_db_accessor()
        ctx = Context(HttpClient(args.base_url, timeout=args.timeout),
                      db_query=db_query, db_reason=db_reason)
        print(f"BizCheck smoke test → {args.base_url}")

    return report(run_checks(ctx), strict=args.strict)


if __name__ == "__main__":
    sys.exit(main())
