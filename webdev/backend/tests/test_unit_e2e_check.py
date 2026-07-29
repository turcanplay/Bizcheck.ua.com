"""Unit tests for scripts/e2e_check.py — the post-deploy smoke test.

The script itself can only run against a live backend, so everything here talks
to `FakeBackend`, an in-memory stand-in implementing just enough of the real API
(cookies, CSRF, submission tokens, the bot secret) for the checks to exercise
their real logic. No socket, no Postgres, no Flask.

The behaviour that matters, and that these tests pin down:

  * an EMPTY database (the shipped default — see CLAUDE.md "Don'ts") must give
    SKIPs with reasons and exit code 0, never a green PASS for content that
    was never there;
  * a populated database must actually run those same checks;
  * a real breakage (DB down, migration missing, secret missing, Bearer auth
    resurrected, CSRF not enforced, PII in plaintext) must give exit code != 0.
"""

import io
import json
import secrets
import urllib.parse

import pytest

from scripts import e2e_check as e2e


# ---------------------------------------------------------------------------
# Fake backend
# ---------------------------------------------------------------------------

API_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Content-Security-Policy": "default-src 'self'; script-src 'self'",
    "Cache-Control": "no-store, no-cache, must-revalidate, private",
}

ADMIN_JWT = "header.payload.signature"
CSRF_TOKEN = "csrf-token-value"


def make_test(id_, slug, **over):
    row = {
        "id": id_, "slug": slug,
        "name_uk": f"Тест {slug}", "name_en": f"Test {slug}",
        "description_uk": "", "description_en": "",
        "is_paid": False, "is_active": True, "is_coming_soon": False,
        "price": None, "currency": "UAH", "category": None, "features": [],
        "report_type": "bizcheck",
        "scoring_zones": {"safe": 80, "developing": 60, "warn": 40, "risk": 0},
        "order_index": 0,
    }
    row.update(over)
    return row


def make_quiz(slug, n_blocks=1, n_questions=2, options_per_question=3):
    blocks = []
    for b in range(n_blocks):
        questions = []
        for q in range(n_questions):
            questions.append({
                "id": f"b{b}q{q}", "db_id": q,
                "text_uk": "Питання", "text_en": "Question",
                "note_uk": None, "note_en": None,
                "options": [
                    {"label_uk": "Так", "label_en": "Yes", "key": f"a{o}",
                     "score": float(o), "next_question_id": None}
                    for o in range(options_per_question)
                ],
            })
        blocks.append({"id": b, "title_uk": "Блок", "title_en": "Block",
                       "questions": questions})
    return {"blocks": blocks, "test": {"slug": slug, "name_uk": "x", "name_en": "x"}}


class FakeBackend:
    """Stands in for HttpClient. Same surface: .request(), .cookies, .base_url."""

    def __init__(self, tests=None, quiz=None, admin_password="admin",
                 bot_secret=None, healthy=True, unreachable=False,
                 accept_bearer=False, enforce_csrf=True, revoke_on_logout=True,
                 api_headers=None):
        self.base_url = "http://fake:4001"
        self.cookies = {}
        self.tests = list(tests or [])
        self.quiz = dict(quiz or {})
        self.admin_password = admin_password
        self.bot_secret = bot_secret
        self.healthy = healthy
        self.unreachable = unreachable
        self.accept_bearer = accept_bearer
        self.enforce_csrf = enforce_csrf
        self.revoke_on_logout = revoke_on_logout
        self.api_headers = dict(API_HEADERS if api_headers is None else api_headers)

        self.submissions = {}       # id -> {token, pdf, test_id}
        self.deleted = []
        self.revoked = set()
        self._next_id = 1
        self.calls = []

    # -- plumbing ----------------------------------------------------------

    def request(self, method, path, body=None, headers=None, no_cookies=False):
        self.calls.append((method, path))
        if self.unreachable:
            return e2e.Response(0, error="URLError: [Errno 111] Connection refused")
        raw_path, _, query = path.partition("?")
        params = urllib.parse.parse_qs(query)
        resp = self._route(method, raw_path, params, body or {},
                           dict(headers or {}), no_cookies)
        for raw in resp.set_cookies:
            name, value, _ = e2e.parse_set_cookie(raw)
            if value in ("", '""'):
                self.cookies.pop(name, None)
            else:
                self.cookies[name] = value
        return resp

    def _json(self, status, payload, extra_headers=None, set_cookies=None, raw=None):
        headers = dict(self.api_headers)
        headers.setdefault("Content-Type", "application/json")
        headers.update(extra_headers or {})
        body = payload if isinstance(payload, (dict, list)) else {}
        return e2e.Response(
            status, body, headers,
            raw if raw is not None else json.dumps(body).encode(),
            set_cookies or [],
        )

    def _session(self, headers, no_cookies):
        """Return the admin JWT presented by this request, or None."""
        cookie_header = headers.get("Cookie")
        if cookie_header:
            jar = dict(
                part.strip().split("=", 1)
                for part in cookie_header.split(";") if "=" in part
            )
        elif no_cookies:
            jar = {}
        else:
            jar = dict(self.cookies)
        return jar.get("admin_session")

    def _authed(self, headers, no_cookies):
        jwt = self._session(headers, no_cookies)
        if jwt and jwt not in self.revoked:
            return jwt
        if self.accept_bearer:
            auth = headers.get("Authorization", "")
            if auth.startswith("Bearer ") and auth[7:] not in self.revoked:
                return auth[7:]
        return None

    def _csrf_ok(self, headers, no_cookies):
        if not self.enforce_csrf:
            return True
        cookie_header = headers.get("Cookie")
        jar = {} if (no_cookies and not cookie_header) else dict(self.cookies)
        return bool(headers.get("X-CSRF-Token")) and \
            headers.get("X-CSRF-Token") == jar.get("admin_csrf")

    # -- routes ------------------------------------------------------------

    def _route(self, method, path, params, body, headers, no_cookies):
        if path == "/api/health":
            if self.healthy:
                return self._json(200, {"status": "ok", "version": "1.0.0",
                                        "database": "up"})
            return self._json(503, {"status": "degraded", "version": "1.0.0",
                                    "database": "down", "error": "OperationalError"})

        api = e2e.API
        if path == f"{api}/tests" and method == "GET":
            return self._json(200, {"tests": self.tests})

        if path == f"{api}/blocks/quiz" and method == "GET":
            slug = (params.get("test") or [""])[0].strip().lower()
            if not slug:
                return self._json(400, {"error": "Missing required query param: test"})
            return self._json(200, self.quiz.get(slug, {"blocks": [], "test": None}))

        if path == f"{api}/tg/exports/tests":
            if not self.bot_secret or headers.get("X-Bot-Secret") != self.bot_secret:
                return self._json(403, {"error": "forbidden"})
            return self._json(200, [{"id": t["id"], "name": t["name_uk"]} for t in self.tests])

        if path == f"{api}/submissions" and method == "POST":
            return self._create_submission(body)

        if path.startswith(f"{api}/submissions/"):
            return self._submission_route(method, path[len(f"{api}/submissions/"):],
                                          params, body, headers, no_cookies)

        if path == f"{api}/admin/login" and method == "POST":
            if body.get("password") != self.admin_password:
                return self._json(401, {"error": "Invalid credentials"})
            self.cookies.pop("admin_session", None)
            return self._json(200, {"ok": True, "csrf_token": CSRF_TOKEN}, set_cookies=[
                f"admin_session={ADMIN_JWT}; Path=/; HttpOnly; SameSite=Strict",
                f"admin_csrf={CSRF_TOKEN}; Path=/; SameSite=Strict",
            ])

        if path == f"{api}/admin/session" and method == "GET":
            if not self._authed(headers, no_cookies):
                return self._json(401, {"error": "Admin token is missing"})
            return self._json(200, {"ok": True, "csrf_token": CSRF_TOKEN})

        if path == f"{api}/admin/logout" and method == "POST":
            jwt = self._session(headers, no_cookies)
            if jwt and self.revoke_on_logout:
                self.revoked.add(jwt)
            return self._json(200, {"ok": True}, set_cookies=[
                "admin_session=; Path=/; Max-Age=0",
                "admin_csrf=; Path=/; Max-Age=0",
            ])

        if path == f"{api}/admin/stats" and method == "GET":
            if not self._authed(headers, no_cookies):
                return self._json(401, {"error": "Admin token is missing"})
            return self._json(200, {"submissions": 0})

        return self._json(404, {"error": "Not found"})

    def _create_submission(self, body):
        slug = (body.get("test_slug") or "").strip().lower() or None
        test_id = None
        if slug:
            match = next((t for t in self.tests if t["slug"] == slug), None)
            if not match:
                return self._json(400, {"error": "Test not found"})
            test_id = match["id"]
        sub_id = self._next_id
        self._next_id += 1
        token = secrets.token_urlsafe(24)
        self.submissions[sub_id] = {"token": token, "pdf": None, "test_id": test_id}
        return self._json(201, {"submission": {
            "id": sub_id, "test_id": test_id,
            "first_name": body.get("first_name"), "last_name": body.get("last_name"),
            "email": body.get("email"), "phone": body.get("phone"),
            "submission_token": token, "language": body.get("language") or "uk",
        }})

    def _submission_route(self, method, tail, params, body, headers, no_cookies):
        parts = tail.split("/")
        try:
            sub_id = int(parts[0])
        except ValueError:
            return self._json(404, {"error": "Not found"})
        rest = parts[1] if len(parts) > 1 else ""
        record = self.submissions.get(sub_id)
        token = headers.get("X-Submission-Token", "").strip()

        if rest == "report.pdf" and method == "GET":
            supplied = (params.get("t") or [""])[0]
            if not record or supplied != record["token"]:
                return self._json(403, {"error": "Forbidden"})
            if not record["pdf"]:
                return self._json(404, {"error": "Report not available"})
            return e2e.Response(200, None, {**self.api_headers,
                                            "Content-Type": "application/pdf"},
                                record["pdf"])

        if method == "DELETE":
            if not self._authed(headers, no_cookies):
                return self._json(401, {"error": "Admin token is missing"})
            if not self._csrf_ok(headers, no_cookies):
                return self._json(403, {"error": "CSRF token missing or invalid"})
            if not record:
                return self._json(404, {"error": "Submission not found"})
            self.submissions.pop(sub_id)
            self.deleted.append(sub_id)
            return self._json(200, {"message": "Submission deleted"})

        # Owner-or-admin paths (PATCH, POST /pdf)
        if not self._authed(headers, no_cookies):
            if not token:
                return self._json(401, {"error": "Submission token required"})
            if not record or token != record["token"]:
                return self._json(403, {"error": "Forbidden"})

        if rest == "pdf" and method == "POST":
            import base64
            try:
                record["pdf"] = base64.b64decode(body.get("pdf", ""), validate=True)
            except Exception:
                return self._json(400, {"error": "Invalid PDF data"})
            if not record["pdf"].startswith(b"%PDF"):
                return self._json(400, {"error": "File is not a valid PDF"})
            return self._json(200, {"message": "PDF saved"})

        if method == "PATCH":
            return self._json(200, {"submission": {"id": sub_id}})

        return self._json(404, {"error": "Not found"})


# ---------------------------------------------------------------------------
# Fake DB + env
# ---------------------------------------------------------------------------

FULL_ENV = {
    "JWT_SECRET": "s" * 32, "JWT_REFRESH_SECRET": "r" * 32,
    "PII_ENCRYPTION_KEY": "k" * 32, "ADMIN_USERNAME": "admin",
    "ADMIN_PASSWORD": "admin",
}


def make_db(tables=e2e.CORE_TABLES, stored_first_name=e2e.FERNET_PREFIX + "ciphertext",
            raises=None):
    def _query(sql, params=None, fetch_one=False, fetch_all=False):
        if raises:
            raise raises
        if "information_schema.tables" in sql:
            return [{"table_name": t} for t in tables]
        if sql.startswith("SELECT first_name"):
            return {"first_name": stored_first_name}
        if sql.startswith("DELETE"):
            return None
        raise AssertionError(f"unexpected SQL in the fake DB: {sql}")
    return _query


def build_ctx(backend, db=None, env=None):
    return e2e.Context(backend, db_query=db if db is not None else make_db(),
                       env=dict(FULL_ENV if env is None else env))


def by_name(results):
    return {r.name: r for r in results}


def statuses(results):
    return {r.name: r.status for r in results}


EMPTY_DB_SKIPS = {
    "quiz data for a real test",
    "quiz has answerable questions",
    "submission binds to a test",
}


# ---------------------------------------------------------------------------
# Empty database — the shipped default
# ---------------------------------------------------------------------------

def test_empty_database_skips_content_checks_and_exits_zero():
    backend = FakeBackend(tests=[], bot_secret="bot-secret")
    env = dict(FULL_ENV, BOT_SHARED_SECRET="bot-secret", TELEGRAM_BOT_TOKEN="t",
               SALES_BOT_TOKEN="t", SALES_CHAT_ID="-1", SMTP_PASSWORD="p",
               PUBLIC_BASE_URL="https://x", ALLOWED_HOSTS="x")
    ctx = build_ctx(backend, env=env)

    results = e2e.run_checks(ctx)
    st = statuses(results)

    assert [r.name for r in results if r.status == e2e.FAIL] == []
    assert {name for name, s in st.items() if s == e2e.SKIP} == EMPTY_DB_SKIPS
    assert e2e.report(results, out=io.StringIO()) == 0


def test_empty_database_never_passes_a_content_check():
    """A false PASS on an empty DB is the exact bug this rewrite removes."""
    ctx = build_ctx(FakeBackend(tests=[]))
    st = statuses(e2e.run_checks(ctx))
    for name in EMPTY_DB_SKIPS:
        assert st[name] == e2e.SKIP, f"{name} must not claim to have tested anything"


def test_every_skip_carries_a_reason():
    ctx = build_ctx(FakeBackend(tests=[]))
    for r in e2e.run_checks(ctx):
        if r.status == e2e.SKIP:
            assert r.detail.strip(), f"{r.name} was skipped without a reason"


def test_empty_database_fails_under_strict():
    """--strict is how a seeded staging env refuses to accept silent skips."""
    ctx = build_ctx(FakeBackend(tests=[]))
    results = e2e.run_checks(ctx)
    assert e2e.report(results, strict=True, out=io.StringIO()) == 1


def test_no_slug_is_hardcoded_anywhere():
    """The old script asserted business/gdpr/hr. Nothing may name a slug again."""
    source = open(e2e.__file__, encoding="utf-8").read()
    for legacy in ("'business'", '"business"', "'gdpr'", '"gdpr"', "'hr'", '"hr"'):
        assert legacy not in source


# ---------------------------------------------------------------------------
# Populated database
# ---------------------------------------------------------------------------

def populated_backend(**over):
    tests = [make_test(1, "diagnostic"), make_test(2, "compliance")]
    quiz = {"diagnostic": make_quiz("diagnostic", n_blocks=2, n_questions=3),
            "compliance": make_quiz("compliance")}
    kwargs = dict(tests=tests, quiz=quiz, bot_secret="bot-secret")
    kwargs.update(over)
    return FakeBackend(**kwargs)


def test_populated_database_runs_every_check():
    backend = populated_backend()
    env = dict(FULL_ENV, BOT_SHARED_SECRET="bot-secret", TELEGRAM_BOT_TOKEN="t",
               SALES_BOT_TOKEN="t", SALES_CHAT_ID="-1", SMTP_PASSWORD="p",
               PUBLIC_BASE_URL="https://x", ALLOWED_HOSTS="x")
    results = e2e.run_checks(build_ctx(backend, env=env))
    st = statuses(results)

    assert [r.name for r in results if r.status == e2e.FAIL] == []
    assert [r.name for r in results if r.status == e2e.SKIP] == []
    assert st["quiz data for a real test"] == e2e.PASS
    assert st["quiz has answerable questions"] == e2e.PASS
    assert st["submission binds to a test"] == e2e.PASS
    assert e2e.report(results, strict=True, out=io.StringIO()) == 0


def test_discovery_uses_the_first_test_that_actually_has_questions():
    tests = [make_test(1, "empty-one"), make_test(2, "filled-one")]
    quiz = {"empty-one": {"blocks": [], "test": {"slug": "empty-one"}},
            "filled-one": make_quiz("filled-one")}
    ctx = build_ctx(FakeBackend(tests=tests, quiz=quiz))
    st = statuses(e2e.run_checks(ctx))
    assert st["quiz has answerable questions"] == e2e.PASS
    assert ctx.quiz[0]["slug"] == "filled-one"


def test_catalog_with_tests_but_no_questions_skips_with_reason():
    tests = [make_test(1, "half-authored")]
    quiz = {"half-authored": {"blocks": [], "test": {"slug": "half-authored"}}}
    results = e2e.run_checks(build_ctx(FakeBackend(tests=tests, quiz=quiz)))
    res = by_name(results)
    # The endpoint answered correctly, so the routing check passes …
    assert res["quiz data for a real test"].status == e2e.PASS
    # … but the content check must not pretend it verified questions.
    assert res["quiz has answerable questions"].status == e2e.SKIP
    assert "no test carries questions" in res["quiz has answerable questions"].detail
    assert e2e.report(results, out=io.StringIO()) == 0


def test_question_without_options_is_a_failure_not_a_skip():
    quiz = {"broken": make_quiz("broken", n_questions=1, options_per_question=0)}
    quiz["broken"]["blocks"][0]["questions"][0]["options"] = []
    # a question with no options still counts as a question, so it is discovered
    ctx = build_ctx(FakeBackend(tests=[make_test(1, "broken")], quiz=quiz))
    results = e2e.run_checks(ctx)
    assert by_name(results)["quiz has answerable questions"].status == e2e.FAIL
    assert e2e.report(results, out=io.StringIO()) == 1


def test_wrong_test_returned_for_a_slug_fails():
    quiz = {"alpha": make_quiz("beta")}     # server answers with another test
    results = e2e.run_checks(build_ctx(FakeBackend(tests=[make_test(1, "alpha")],
                                                   quiz=quiz)))
    assert by_name(results)["quiz data for a real test"].status == e2e.FAIL


def test_submission_bound_to_the_wrong_test_id_fails():
    backend = populated_backend()
    original = backend._create_submission

    def wrong(body):
        resp = original(body)
        resp.body["submission"]["test_id"] = 999
        return resp

    backend._create_submission = wrong
    results = e2e.run_checks(build_ctx(backend))
    assert by_name(results)["submission binds to a test"].status == e2e.FAIL


# ---------------------------------------------------------------------------
# Infrastructure failures → non-zero exit
# ---------------------------------------------------------------------------

def test_unreachable_backend_short_circuits_and_fails():
    results = e2e.run_checks(build_ctx(FakeBackend(unreachable=True)))
    assert results[0].name == "health"
    assert results[0].status == e2e.FAIL
    # One collapsed skip, not 22 identical lines burying the real failure.
    assert len(results) == 2
    assert results[1].status == e2e.SKIP
    assert f"{len(e2e.CHECKS) - 1} check(s) not run" in results[1].detail
    assert e2e.report(results, out=io.StringIO()) == 1


def test_database_down_fails_health():
    results = e2e.run_checks(build_ctx(FakeBackend(healthy=False)))
    assert by_name(results)["health"].status == e2e.FAIL
    assert e2e.report(results, out=io.StringIO()) == 1


def test_missing_table_means_the_migration_did_not_run():
    partial = tuple(t for t in e2e.CORE_TABLES if t != "admin_revoked_tokens")
    ctx = build_ctx(populated_backend(), db=make_db(tables=partial))
    res = by_name(e2e.run_checks(ctx))["db schema migrated"]
    assert res.status == e2e.FAIL
    assert "admin_revoked_tokens" in res.detail


def test_no_database_access_skips_the_db_checks_but_still_exits_zero():
    ctx = e2e.Context(populated_backend(), db_query=None,
                      db_reason="database layer not importable here",
                      env=dict(FULL_ENV))
    results = e2e.run_checks(ctx)
    st = statuses(results)
    assert st["db schema migrated"] == e2e.SKIP
    assert st["PII encrypted at rest"] == e2e.SKIP
    assert [r.name for r in results if r.status == e2e.FAIL] == []
    assert e2e.report(results, out=io.StringIO()) == 0


def test_db_query_error_is_a_failure_not_a_crash():
    ctx = build_ctx(populated_backend(), db=make_db(raises=RuntimeError("boom")))
    results = e2e.run_checks(ctx)
    assert by_name(results)["db schema migrated"].status == e2e.FAIL
    assert e2e.report(results, out=io.StringIO()) == 1


@pytest.mark.parametrize("missing", e2e.REQUIRED_ENV)
def test_each_required_env_var_is_checked(missing):
    env = {k: v for k, v in FULL_ENV.items() if k != missing}
    res = by_name(e2e.run_checks(build_ctx(populated_backend(), env=env)))
    assert res["required env vars"].status == e2e.FAIL
    assert missing in res["required env vars"].detail


def test_placeholder_secret_is_rejected():
    env = dict(FULL_ENV, JWT_SECRET="change_me_in_production")
    res = by_name(e2e.run_checks(build_ctx(populated_backend(), env=env)))
    assert res["required env vars"].status == e2e.FAIL
    assert "placeholder" in res["required env vars"].detail


def test_unset_optional_integrations_are_skipped_not_failed():
    results = e2e.run_checks(build_ctx(populated_backend()))
    res = by_name(results)
    assert res["optional integrations configured"].status == e2e.SKIP
    assert res["bot export bridge"].status == e2e.SKIP
    assert "BOT_SHARED_SECRET" in res["bot export bridge"].detail
    assert e2e.report(results, out=io.StringIO()) == 0


def test_bot_bridge_open_without_the_secret_fails():
    backend = populated_backend()
    backend.bot_secret = None                       # server rejects every caller
    env = dict(FULL_ENV, BOT_SHARED_SECRET="bot-secret")
    res = by_name(e2e.run_checks(build_ctx(backend, env=env)))
    # secret configured on our side, server rejects it → the bridge is broken
    assert res["bot export bridge"].status == e2e.FAIL


# ---------------------------------------------------------------------------
# Auth model regressions
# ---------------------------------------------------------------------------

def test_bearer_auth_resurrected_is_caught():
    """CLAUDE.md forbids a Bearer fallback for admin auth."""
    ctx = build_ctx(populated_backend(accept_bearer=True))
    res = by_name(e2e.run_checks(ctx))["Bearer header is not accepted"]
    assert res.status == e2e.FAIL


def test_csrf_not_enforced_is_caught():
    ctx = build_ctx(populated_backend(enforce_csrf=False))
    res = by_name(e2e.run_checks(ctx))["CSRF double-submit enforced"]
    assert res.status == e2e.FAIL


def test_logout_that_only_drops_the_cookie_is_caught():
    ctx = build_ctx(populated_backend(revoke_on_logout=False))
    res = by_name(e2e.run_checks(ctx))["logout revokes the session"]
    assert res.status == e2e.FAIL
    assert "still works" in res.detail


def test_wrong_admin_password_fails_login_and_skips_dependent_checks():
    backend = populated_backend(admin_password="something-else")
    results = e2e.run_checks(build_ctx(backend))
    res = by_name(results)
    assert res["admin login"].status == e2e.FAIL
    for dependent in ("Bearer header is not accepted", "CSRF double-submit enforced",
                      "logout revokes the session"):
        assert res[dependent].status == e2e.SKIP
        assert "login did not succeed" in res[dependent].detail
    assert e2e.report(results, out=io.StringIO()) == 1


def test_session_cookie_must_be_httponly():
    backend = populated_backend()
    original = backend._route

    def leaky(method, path, params, body, headers, no_cookies):
        resp = original(method, path, params, body, headers, no_cookies)
        if path.endswith("/admin/login") and resp.status == 200:
            resp.set_cookies = [c.replace("; HttpOnly", "") for c in resp.set_cookies]
        return resp

    backend._route = leaky
    res = by_name(e2e.run_checks(build_ctx(backend)))["admin login"]
    assert res.status == e2e.FAIL
    assert "HttpOnly" in res.detail


def test_missing_security_header_is_caught():
    headers = {k: v for k, v in API_HEADERS.items() if k != "X-Frame-Options"}
    ctx = build_ctx(populated_backend(api_headers=headers))
    res = by_name(e2e.run_checks(ctx))["security headers"]
    assert res.status == e2e.FAIL
    assert "X-Frame-Options" in res.detail


def test_cacheable_api_response_is_caught():
    headers = dict(API_HEADERS, **{"Cache-Control": "public, max-age=600"})
    ctx = build_ctx(populated_backend(api_headers=headers))
    res = by_name(e2e.run_checks(ctx))["security headers"]
    assert res.status == e2e.FAIL
    assert "Cache-Control" in res.detail


# ---------------------------------------------------------------------------
# Public write path
# ---------------------------------------------------------------------------

def test_plaintext_pii_at_rest_is_caught():
    ctx = build_ctx(populated_backend(),
                    db=make_db(stored_first_name=e2e.SMOKE_FIRST_NAME))
    results = e2e.run_checks(ctx)
    res = by_name(results)["PII encrypted at rest"]
    assert res.status == e2e.FAIL
    assert "PLAINTEXT" in res.detail
    assert e2e.report(results, out=io.StringIO()) == 1


def test_pdf_round_trip_and_token_gate():
    backend = populated_backend()
    results = e2e.run_checks(build_ctx(backend))
    res = by_name(results)
    assert res["report PDF round-trip"].status == e2e.PASS
    assert res["submission writes are token gated"].status == e2e.PASS


def test_pdf_download_open_to_a_forged_token_is_caught():
    backend = populated_backend()
    original = backend._submission_route

    def open_download(method, tail, params, body, headers, no_cookies):
        if tail.endswith("/report.pdf"):
            params = dict(params)
            sub_id = int(tail.split("/")[0])
            record = backend.submissions.get(sub_id)
            if record:
                params["t"] = [record["token"]]     # ignores what was supplied
        return original(method, tail, params, body, headers, no_cookies)

    backend._submission_route = open_download
    res = by_name(e2e.run_checks(build_ctx(backend)))["report PDF round-trip"]
    assert res.status == e2e.FAIL
    assert "403" in res.detail


def test_smoke_submissions_are_deleted_afterwards():
    backend = populated_backend()
    ctx = build_ctx(backend)
    results = e2e.run_checks(ctx)
    assert by_name(results)["smoke submissions removed"].status == e2e.PASS
    assert sorted(backend.deleted) == sorted(ctx.created_submissions)
    assert backend.submissions == {}


def test_cleanup_falls_back_to_sql_when_the_admin_api_cannot_delete():
    backend = populated_backend(admin_password="nope")   # no admin session at all
    deleted = []

    def db(sql, params=None, fetch_one=False, fetch_all=False):
        if sql.startswith("DELETE"):
            deleted.append(params[0])
            return None
        return make_db()(sql, params, fetch_one=fetch_one, fetch_all=fetch_all)

    ctx = build_ctx(backend, db=db)
    results = e2e.run_checks(ctx)
    assert by_name(results)["smoke submissions removed"].status == e2e.PASS
    assert deleted == ctx.created_submissions


def test_leftover_smoke_rows_are_reported_as_a_failure():
    backend = populated_backend(admin_password="nope")
    ctx = e2e.Context(backend, db_query=None, db_reason="no db", env=dict(FULL_ENV))
    results = e2e.run_checks(ctx)
    res = by_name(results)["smoke submissions removed"]
    assert res.status == e2e.FAIL
    assert "left behind" in res.detail


def test_unknown_slug_accepted_by_the_server_is_caught():
    backend = populated_backend()
    original = backend._create_submission
    backend._create_submission = lambda body: original(dict(body, test_slug=None))
    results = e2e.run_checks(build_ctx(backend))
    res = by_name(results)["submission with an unknown slug rejected"]
    assert res.status == e2e.FAIL
    # the accidentally created row must still be cleaned up
    assert by_name(results)["smoke submissions removed"].status == e2e.PASS


def test_submission_without_a_token_is_a_failure():
    backend = populated_backend()
    original = backend._create_submission

    def tokenless(body):
        resp = original(body)
        resp.body["submission"].pop("submission_token")
        return resp

    backend._create_submission = tokenless
    results = e2e.run_checks(build_ctx(backend))
    res = by_name(results)
    assert res["submission create"].status == e2e.FAIL
    assert "submission_token" in res["submission create"].detail
    assert res["report PDF round-trip"].status == e2e.SKIP


# ---------------------------------------------------------------------------
# Runner / reporting contract
# ---------------------------------------------------------------------------

def test_a_crashing_check_becomes_a_failure():
    def exploding(ctx):
        raise ZeroDivisionError("nope")

    results = e2e.run_checks(build_ctx(populated_backend()), checks=(exploding,))
    assert results[0].status == e2e.FAIL
    assert "ZeroDivisionError" in results[0].detail
    assert e2e.report(results, out=io.StringIO()) == 1


def test_report_output_lists_counts_and_skip_reasons():
    out = io.StringIO()
    results = [e2e.ok("a", "fine"), e2e.bad("b", "broken"),
               e2e.skipped("c", "nothing to test")]
    code = e2e.report(results, out=out)
    text = out.getvalue()
    assert code == 1
    assert "1 passed, 1 failed, 1 skipped (of 3)" in text
    assert "c: nothing to test" in text
    assert "b: broken" in text


def test_report_exit_codes():
    assert e2e.report([e2e.ok("a")], out=io.StringIO()) == 0
    assert e2e.report([e2e.skipped("a", "why")], out=io.StringIO()) == 0
    assert e2e.report([e2e.skipped("a", "why")], strict=True, out=io.StringIO()) == 1
    assert e2e.report([e2e.bad("a", "why")], out=io.StringIO()) == 1


def test_main_uses_the_injected_context_and_returns_its_exit_code():
    ctx = build_ctx(populated_backend())
    assert e2e.main([], ctx=ctx) == 0
    assert e2e.main(["--strict"], ctx=build_ctx(FakeBackend(tests=[]))) == 1
    assert e2e.main([], ctx=build_ctx(FakeBackend(unreachable=True))) == 1


def test_parse_set_cookie():
    assert e2e.parse_set_cookie("a=b; Path=/; HttpOnly; SameSite=Strict") == \
        ("a", "b", {"path", "httponly", "samesite"})
    assert e2e.parse_set_cookie("a=; Max-Age=0")[1] == ""
    assert e2e.parse_set_cookie("") == ("", "", set())


def test_http_client_jar_absorbs_and_drops_cookies():
    client = e2e.HttpClient("http://x")
    client._absorb(["admin_session=jwt; HttpOnly", "admin_csrf=tok"])
    assert client.cookies == {"admin_session": "jwt", "admin_csrf": "tok"}
    client._absorb(["admin_session=; Max-Age=0"])
    assert client.cookies == {"admin_csrf": "tok"}


def test_build_db_accessor_returns_a_callable_or_a_reason():
    accessor, reason = e2e.build_db_accessor()
    assert (accessor is None) != (reason is None)
