"""Unit tests for the performance + robustness pass.

Covers, with NO database and NO running backend (Flask test client +
monkeypatch, per CLAUDE.md):

  A. utils.cache.TTLCache semantics
  B. quiz-data caching + invalidation on admin writes
  C. SiteSettings caching + invalidation on set()
  D. GET /submissions pagination contract
  E. migrate() idempotency and the new submissions indexes
  F. X-Bot-Secret gate on the PII-writing /tg/* endpoints
  G. /api/health DB probe
"""
import os
import sys
from pathlib import Path

import jwt
import pytest
from flask import Flask

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


def _admin_jwt():
    return jwt.encode({"role": "admin"}, os.environ["JWT_SECRET"], algorithm="HS256")


# ---------------------------------------------------------------------------
# A. TTLCache
# ---------------------------------------------------------------------------

class TestTTLCache:

    def test_miss_then_hit(self):
        from utils.cache import TTLCache
        c = TTLCache(ttl=60)
        calls = []

        def produce():
            calls.append(1)
            return "value"

        assert c.get_or_set("k", produce) == "value"
        assert c.get_or_set("k", produce) == "value"
        assert len(calls) == 1, "producer must run only on the miss"

    def test_expiry_forces_recompute(self):
        from utils.cache import TTLCache
        c = TTLCache(ttl=0)          # everything is stale immediately
        calls = []
        for _ in range(3):
            c.get_or_set("k", lambda: calls.append(1))
        assert len(calls) == 3

    def test_invalidate_single_key_keeps_others(self):
        from utils.cache import TTLCache
        c = TTLCache(ttl=60)
        c.set("a", 1)
        c.set("b", 2)
        c.invalidate("a")
        assert c.get("a") is None
        assert c.get("b") == 2

    def test_invalidate_all_clears_namespace(self):
        from utils.cache import TTLCache
        c = TTLCache(ttl=60)
        c.set("a", 1)
        c.set("b", 2)
        c.invalidate()
        assert len(c) == 0

    def test_get_returns_default_on_miss(self):
        from utils.cache import TTLCache
        c = TTLCache(ttl=60)
        sentinel = object()
        assert c.get("nope", sentinel) is sentinel

    def test_expired_entry_is_evicted_not_just_hidden(self):
        from utils.cache import TTLCache
        c = TTLCache(ttl=0)
        c.set("k", "v")
        assert c.get("k") is None
        assert len(c) == 0


# ---------------------------------------------------------------------------
# B. Quiz data cache
# ---------------------------------------------------------------------------

@pytest.fixture
def quiz_stub(monkeypatch):
    """Count how many times the UNCACHED builder actually runs."""
    from services import block_service
    from utils.cache import invalidate_quiz_cache

    invalidate_quiz_cache()
    calls = []

    def fake_build(test_slug=None, test_id=None):
        calls.append((test_slug, test_id))
        return {"blocks": [{"id": 1}], "test": {"slug": test_slug}}

    monkeypatch.setattr(block_service, "_build_quiz_data", fake_build)
    yield block_service, calls
    invalidate_quiz_cache()


class TestQuizCache:

    def test_second_call_is_served_from_cache(self, quiz_stub):
        block_service, calls = quiz_stub
        a = block_service.get_quiz_data(test_slug="bizcheck")
        b = block_service.get_quiz_data(test_slug="bizcheck")
        assert a == b
        assert len(calls) == 1

    def test_different_slugs_are_cached_separately(self, quiz_stub):
        block_service, calls = quiz_stub
        block_service.get_quiz_data(test_slug="one")
        block_service.get_quiz_data(test_slug="two")
        assert len(calls) == 2

    def test_invalidate_forces_rebuild(self, quiz_stub):
        block_service, calls = quiz_stub
        from utils.cache import invalidate_quiz_cache
        block_service.get_quiz_data(test_slug="bizcheck")
        invalidate_quiz_cache()
        block_service.get_quiz_data(test_slug="bizcheck")
        assert len(calls) == 2

    def test_block_write_invalidates(self, quiz_stub, monkeypatch):
        """An admin creating a block must not leave a stale quiz payload."""
        block_service, calls = quiz_stub
        block_service.get_quiz_data(test_slug="bizcheck")

        monkeypatch.setattr(block_service.Test, "find_by_id", lambda _id: {"id": 1})
        monkeypatch.setattr(
            block_service.Block, "create",
            lambda *a, **k: {"id": 9, "created_at": "now"},
        )
        block_service.create_block(1, "Titlu", "Title", 0)

        block_service.get_quiz_data(test_slug="bizcheck")
        assert len(calls) == 2

    def test_block_delete_invalidates(self, quiz_stub, monkeypatch):
        block_service, calls = quiz_stub
        block_service.get_quiz_data(test_slug="bizcheck")

        monkeypatch.setattr(block_service.Block, "find_by_id", lambda _id: {"id": 1})
        monkeypatch.setattr(block_service.Block, "delete", lambda _id: None)
        block_service.delete_block(1)

        block_service.get_quiz_data(test_slug="bizcheck")
        assert len(calls) == 2

    def test_question_write_invalidates(self, quiz_stub, monkeypatch):
        """Questions live inside the quiz payload → their writes must bust it."""
        block_service, calls = quiz_stub
        from services import question_service

        block_service.get_quiz_data(test_slug="bizcheck")

        monkeypatch.setattr(
            question_service.Question, "create",
            lambda *a, **k: {"id": 5, "created_at": "now"},
        )
        monkeypatch.setattr(question_service.Answer, "create_many", lambda *a, **k: [])
        question_service.create_question(
            1, "t_uk", "t_en", None, None, 0, [{"text_uk": "a"}, {"text_uk": "b"}],
        )

        block_service.get_quiz_data(test_slug="bizcheck")
        assert len(calls) == 2


# ---------------------------------------------------------------------------
# C. SiteSettings cache
# ---------------------------------------------------------------------------

@pytest.fixture
def settings_stub(monkeypatch):
    """Replace the DB layer under models.site_settings with counters."""
    import models.site_settings as ss
    from utils.cache import invalidate_settings_cache

    invalidate_settings_cache()
    store = {"cta_target": "bizcheck"}
    reads = []
    writes = []

    def fake_query(sql, params=None, fetch_one=False, fetch_all=False, commit=False):
        reads.append(sql)
        if fetch_all:
            return [{"setting_key": k, "setting_value": v} for k, v in store.items()]
        key = params[0]
        return {"setting_value": store[key]} if key in store else None

    def fake_execute(sql, params=None):
        writes.append(params)
        store[params[0]] = params[1]
        return None

    monkeypatch.setattr(ss, "query", fake_query)
    monkeypatch.setattr(ss, "execute", fake_execute)
    yield ss.SiteSettings, store, reads, writes
    invalidate_settings_cache()


class TestSiteSettingsCache:

    def test_repeated_get_hits_db_once(self, settings_stub):
        SiteSettings, _store, reads, _ = settings_stub
        assert SiteSettings.get("cta_target") == "bizcheck"
        assert SiteSettings.get("cta_target") == "bizcheck"
        assert SiteSettings.get("cta_target") == "bizcheck"
        assert len(reads) == 1

    def test_missing_key_is_also_cached_and_returns_default(self, settings_stub):
        SiteSettings, _store, reads, _ = settings_stub
        assert SiteSettings.get("nope", "fallback") == "fallback"
        assert SiteSettings.get("nope", "fallback") == "fallback"
        assert len(reads) == 1, "a missing key must not re-query on every call"

    def test_set_invalidates_so_the_new_value_is_visible(self, settings_stub):
        SiteSettings, _store, reads, _ = settings_stub
        assert SiteSettings.get("cta_target") == "bizcheck"
        SiteSettings.set("cta_target", "premium")
        assert SiteSettings.get("cta_target") == "premium"
        assert len(reads) == 2

    def test_set_also_invalidates_the_get_all_aggregate(self, settings_stub):
        SiteSettings, _store, _reads, _ = settings_stub
        assert SiteSettings.get_all() == {"cta_target": "bizcheck"}
        SiteSettings.set("other", "x")
        assert SiteSettings.get_all() == {"cta_target": "bizcheck", "other": "x"}

    def test_get_all_result_is_a_copy(self, settings_stub):
        """Mutating the returned dict must not poison the cached entry."""
        SiteSettings, _store, _reads, _ = settings_stub
        first = SiteSettings.get_all()
        first["injected"] = "evil"
        assert "injected" not in SiteSettings.get_all()


# ---------------------------------------------------------------------------
# D. GET /submissions pagination contract
# ---------------------------------------------------------------------------

@pytest.fixture
def submissions_app(monkeypatch):
    """Real submissions blueprint with the service layer stubbed out."""
    import routes.submissions as rs

    rows = [{"id": i, "first_name": f"u{i}"} for i in range(1, 121)]

    def fake_get_all(test_id=None, limit=None, offset=0):
        data = rows if test_id is None else [r for r in rows if r["id"] <= 10]
        if limit is None:
            return list(data)
        return data[offset:offset + limit]

    def fake_count(test_id=None):
        return len(rows) if test_id is None else 10

    monkeypatch.setattr(rs, "get_all_submissions", fake_get_all)
    monkeypatch.setattr(rs, "count_submissions", fake_count)

    app = Flask(__name__)
    app.register_blueprint(rs.submissions_bp)
    return app, rows


def _admin_client(app):
    c = app.test_client()
    c.set_cookie(key="admin_session", value=_admin_jwt(), domain="localhost")
    return c


class TestSubmissionsPagination:
    URL = "/api_crowe_bizcheck/submissions"

    def test_requires_admin(self, submissions_app):
        app, _ = submissions_app
        assert app.test_client().get(self.URL).status_code == 401

    def test_no_params_returns_full_array_backwards_compatible(self, submissions_app):
        """The current SPA sends no paging params — it must still get everything."""
        app, rows = submissions_app
        r = _admin_client(app).get(self.URL)
        assert r.status_code == 200
        body = r.get_json()
        assert len(body["submissions"]) == len(rows)
        assert body["count"] == len(rows)
        assert body["total"] == len(rows)
        # Paging meta is absent when paging was not requested.
        assert "page" not in body and "per_page" not in body

    def test_total_count_header_always_present(self, submissions_app):
        app, rows = submissions_app
        r = _admin_client(app).get(self.URL)
        assert r.headers["X-Total-Count"] == str(len(rows))

    def test_page_param_engages_pagination(self, submissions_app):
        app, _ = submissions_app
        body = _admin_client(app).get(f"{self.URL}?page=1").get_json()
        assert len(body["submissions"]) == 50      # DEFAULT_PER_PAGE
        assert body["per_page"] == 50
        assert body["page"] == 1
        assert body["total"] == 120
        assert body["total_pages"] == 3

    def test_second_page_offsets_correctly(self, submissions_app):
        app, _ = submissions_app
        body = _admin_client(app).get(f"{self.URL}?page=2&per_page=10").get_json()
        assert [s["id"] for s in body["submissions"]] == list(range(11, 21))

    def test_per_page_is_capped(self, submissions_app):
        app, _ = submissions_app
        body = _admin_client(app).get(f"{self.URL}?per_page=100000").get_json()
        assert body["per_page"] == 200              # MAX_PER_PAGE
        assert len(body["submissions"]) == 120      # only 120 rows exist

    def test_garbage_paging_params_are_clamped_not_500(self, submissions_app):
        app, _ = submissions_app
        r = _admin_client(app).get(f"{self.URL}?page=abc&per_page=-7")
        assert r.status_code == 200
        body = r.get_json()
        assert body["page"] == 1
        assert body["per_page"] == 1

    def test_page_beyond_the_end_returns_empty_but_keeps_total(self, submissions_app):
        app, _ = submissions_app
        body = _admin_client(app).get(f"{self.URL}?page=999&per_page=10").get_json()
        assert body["submissions"] == []
        assert body["total"] == 120

    def test_test_id_filter_scopes_the_total(self, submissions_app):
        app, _ = submissions_app
        r = _admin_client(app).get(f"{self.URL}?test_id=3&page=1&per_page=5")
        body = r.get_json()
        assert body["total"] == 10
        assert body["total_pages"] == 2
        assert r.headers["X-Total-Count"] == "10"


class TestPagingParamParsing:

    def test_absent_params_mean_no_pagination(self):
        from routes.submissions import _paging_params
        assert _paging_params({}) == (None, None)

    def test_per_page_alone_engages_pagination(self):
        from routes.submissions import _paging_params
        page, per_page = _paging_params({"per_page": "25"})
        assert (page, per_page) == (1, 25)

    def test_page_zero_is_clamped_to_one(self):
        from routes.submissions import _paging_params
        assert _paging_params({"page": "0"})[0] == 1


class TestSubmissionModelPagination:
    """Submission.find_all must emit LIMIT/OFFSET only when asked."""

    def _capture(self, monkeypatch):
        import models.submission as ms
        seen = {}

        def fake_query(sql, params=None, fetch_one=False, fetch_all=False, commit=False):
            seen["sql"] = sql
            seen["params"] = params
            return []

        monkeypatch.setattr(ms, "query", fake_query)
        monkeypatch.setattr(ms, "decrypt_rows", lambda rows: rows)
        return ms.Submission, seen

    def test_unpaginated_emits_no_limit(self, monkeypatch):
        Submission, seen = self._capture(monkeypatch)
        Submission.find_all()
        assert "LIMIT" not in seen["sql"]
        assert seen["params"] is None

    def test_limit_offset_are_parameterized(self, monkeypatch):
        Submission, seen = self._capture(monkeypatch)
        Submission.find_all(limit=50, offset=100)
        assert "LIMIT %s OFFSET %s" in seen["sql"]
        assert seen["params"] == (50, 100)

    def test_test_id_and_paging_combine(self, monkeypatch):
        Submission, seen = self._capture(monkeypatch)
        Submission.find_all(test_id=7, limit=10, offset=20)
        assert "WHERE test_id = %s" in seen["sql"]
        assert seen["params"] == (7, 10, 20)

    def test_negative_offset_is_floored_at_zero(self, monkeypatch):
        Submission, seen = self._capture(monkeypatch)
        Submission.find_all(limit=10, offset=-5)
        assert seen["params"] == (10, 0)

    def test_ordering_is_deterministic(self, monkeypatch):
        """created_at alone is not unique — ties would shuffle rows across pages."""
        Submission, seen = self._capture(monkeypatch)
        Submission.find_all(limit=10)
        assert "ORDER BY created_at DESC, id DESC" in seen["sql"]


# ---------------------------------------------------------------------------
# E. migrate() — idempotency + the new indexes
# ---------------------------------------------------------------------------

class _FakeCursor:
    def __init__(self, log):
        self.log = log

    def execute(self, query, params=None):
        self.log.append(str(getattr(query, "string", query)))

    def fetchone(self):
        # Shape expected by migrate_ro_to_uk / migrate_ru_to_en: (has_old, has_new)
        return (False, False)

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


class _FakeConn:
    def __init__(self, log):
        self._log = log

    def cursor(self, *a, **k):
        return _FakeCursor(self._log)

    def commit(self):
        pass

    def rollback(self):
        pass


@pytest.fixture
def migration_sql(monkeypatch):
    """Run migrate() against a recording fake connection and return the SQL."""
    import database.db as db
    log = []
    monkeypatch.setattr(db, "get_conn", lambda: _FakeConn(log))
    monkeypatch.setattr(db, "put_conn", lambda conn: None)
    db.migrate()
    return log


class TestMigration:

    def test_creates_created_at_index(self, migration_sql):
        joined = "\n".join(migration_sql)
        assert "idx_submissions_created_at" in joined
        assert "ON submissions(created_at DESC)" in joined

    def test_creates_composite_test_created_index(self, migration_sql):
        joined = "\n".join(migration_sql)
        assert "idx_submissions_test_created" in joined
        assert "ON submissions(test_id, created_at DESC)" in joined

    def test_submission_token_index_still_present(self, migration_sql):
        """find_id_by_token runs on every token-gated write — it needs this."""
        assert "idx_submissions_submission_token" in "\n".join(migration_sql)

    def test_every_create_index_is_guarded(self, migration_sql):
        """A bare CREATE INDEX would blow up the SECOND boot / second worker."""
        joined = "\n".join(migration_sql)
        for line in joined.splitlines():
            stripped = line.strip()
            if stripped.upper().startswith("CREATE ") and " INDEX " in stripped.upper():
                assert "IF NOT EXISTS" in stripped.upper(), stripped

    def test_every_create_table_is_guarded(self, migration_sql):
        joined = "\n".join(migration_sql)
        for line in joined.splitlines():
            stripped = line.strip().upper()
            if stripped.startswith("CREATE TABLE"):
                assert "IF NOT EXISTS" in stripped, line

    def test_every_add_column_is_guarded(self, migration_sql):
        joined = "\n".join(migration_sql)
        for line in joined.splitlines():
            stripped = line.strip().upper()
            if "ADD COLUMN" in stripped:
                assert "IF NOT EXISTS" in stripped, line

    def test_running_twice_issues_identical_sql(self, monkeypatch):
        """The real idempotency proof: a second migrate() must not diverge."""
        import database.db as db
        first, second = [], []
        monkeypatch.setattr(db, "put_conn", lambda conn: None)

        monkeypatch.setattr(db, "get_conn", lambda: _FakeConn(first))
        db.migrate()
        monkeypatch.setattr(db, "get_conn", lambda: _FakeConn(second))
        db.migrate()

        assert first == second
        assert first, "migrate() issued no SQL at all — the fake is wrong"

    def test_no_drop_statements(self, migration_sql):
        """Drops are not idempotent across replicas (CLAUDE.md)."""
        joined = "\n".join(migration_sql).upper()
        assert "DROP TABLE" not in joined
        assert "DROP COLUMN" not in joined
        assert "DROP INDEX" not in joined


# ---------------------------------------------------------------------------
# F. X-Bot-Secret gate on the PII-writing /tg/* endpoints
# ---------------------------------------------------------------------------

@pytest.fixture
def tg_app(monkeypatch):
    """Telegram blueprint with the DB + downstream services stubbed."""
    import routes.telegram as tg

    monkeypatch.setattr(tg, "query", lambda *a, **k: None)
    monkeypatch.setattr(tg, "execute", lambda *a, **k: None)
    monkeypatch.delenv("BOT_SHARED_SECRET", raising=False)
    monkeypatch.delenv("TG_REQUIRE_BOT_SECRET", raising=False)

    app = Flask(__name__)
    app.register_blueprint(tg.tg_bp)
    return app


PII_WRITE_ROUTES = [
    "/api_crowe_bizcheck/tg/contact/tok",
    "/api_crowe_bizcheck/tg/email/tok",
    "/api_crowe_bizcheck/tg/lead/tok",
]


class TestBotSecretGate:

    @pytest.mark.parametrize("url", PII_WRITE_ROUTES)
    def test_wrong_secret_is_always_rejected(self, tg_app, monkeypatch, url):
        monkeypatch.setenv("BOT_SHARED_SECRET", "correct-secret")
        r = tg_app.test_client().post(
            url, json={"tg_chat_id": 1, "email": "a@b.co"},
            headers={"X-Bot-Secret": "wrong"},
        )
        assert r.status_code == 403

    @pytest.mark.parametrize("url", PII_WRITE_ROUTES)
    def test_secret_claimed_but_none_configured_is_rejected(self, tg_app, url):
        """A caller asserting bot identity we cannot verify is never trusted."""
        r = tg_app.test_client().post(
            url, json={"tg_chat_id": 1, "email": "a@b.co"},
            headers={"X-Bot-Secret": "anything"},
        )
        assert r.status_code == 403

    @pytest.mark.parametrize("url", PII_WRITE_ROUTES)
    def test_missing_header_is_allowed_during_the_staged_rollout(
        self, tg_app, monkeypatch, url,
    ):
        """webdev/tgbot does not send the header yet — must not break today."""
        monkeypatch.setenv("BOT_SHARED_SECRET", "correct-secret")
        r = tg_app.test_client().post(url, json={"tg_chat_id": 1, "email": "a@b.co"})
        assert r.status_code != 403

    @pytest.mark.parametrize("url", PII_WRITE_ROUTES)
    def test_missing_header_is_rejected_once_enforcement_is_on(
        self, tg_app, monkeypatch, url,
    ):
        monkeypatch.setenv("BOT_SHARED_SECRET", "correct-secret")
        monkeypatch.setenv("TG_REQUIRE_BOT_SECRET", "1")
        r = tg_app.test_client().post(url, json={"tg_chat_id": 1, "email": "a@b.co"})
        assert r.status_code == 403

    @pytest.mark.parametrize("url", PII_WRITE_ROUTES)
    def test_correct_secret_passes_the_gate(self, tg_app, monkeypatch, url):
        monkeypatch.setenv("BOT_SHARED_SECRET", "correct-secret")
        monkeypatch.setenv("TG_REQUIRE_BOT_SECRET", "1")
        r = tg_app.test_client().post(
            url, json={"tg_chat_id": 1, "email": "a@b.co"},
            headers={"X-Bot-Secret": "correct-secret"},
        )
        assert r.status_code != 403

    def test_read_only_report_endpoint_is_not_gated(self, tg_app, monkeypatch):
        """GET /tg/report writes nothing; gating it would break delivery today."""
        monkeypatch.setenv("BOT_SHARED_SECRET", "correct-secret")
        monkeypatch.setenv("TG_REQUIRE_BOT_SECRET", "1")
        r = tg_app.test_client().get("/api_crowe_bizcheck/tg/report/tok")
        assert r.status_code == 404      # token not found, NOT 403

    def test_enforcement_flag_accepts_common_truthy_spellings(self, monkeypatch):
        import routes.telegram as tg
        for val in ("1", "true", "TRUE", "yes", "on"):
            monkeypatch.setenv("TG_REQUIRE_BOT_SECRET", val)
            assert tg._bot_secret_required() is True
        for val in ("0", "false", "", "no"):
            monkeypatch.setenv("TG_REQUIRE_BOT_SECRET", val)
            assert tg._bot_secret_required() is False


# ---------------------------------------------------------------------------
# G. /api/health
# ---------------------------------------------------------------------------

class _PingCursor:
    def __init__(self, boom=False):
        self.boom = boom
        self.statements = []

    def execute(self, sql, params=None):
        self.statements.append(sql)
        if self.boom:
            raise RuntimeError("connection refused to db:5432 as postgres")

    def fetchone(self):
        return (1,)

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


class _PingConn:
    def __init__(self, boom=False):
        self.cur = _PingCursor(boom)
        self.rolled_back = False

    def cursor(self, *a, **k):
        return self.cur

    def rollback(self):
        self.rolled_back = True


@pytest.fixture
def health_app():
    from routes.health import health_bp
    app = Flask(__name__)
    app.register_blueprint(health_bp)
    return app


def _patch_pool(monkeypatch, conn):
    import database.db as db
    returned = []
    monkeypatch.setattr(db, "get_conn", lambda: conn)
    monkeypatch.setattr(db, "put_conn", lambda c: returned.append(c))
    return returned


class TestHealth:

    def test_healthy_db_returns_200(self, health_app, monkeypatch):
        _patch_pool(monkeypatch, _PingConn())
        r = health_app.test_client().get("/api/health")
        assert r.status_code == 200
        assert r.get_json()["status"] == "ok"
        assert r.get_json()["database"] == "up"

    def test_down_db_returns_503(self, health_app, monkeypatch):
        _patch_pool(monkeypatch, _PingConn(boom=True))
        r = health_app.test_client().get("/api/health")
        assert r.status_code == 503
        assert r.get_json()["status"] == "degraded"
        assert r.get_json()["database"] == "down"

    def test_error_message_is_not_leaked(self, health_app, monkeypatch):
        """psycopg2 messages carry hostnames/users — only the TYPE may escape."""
        _patch_pool(monkeypatch, _PingConn(boom=True))
        body = health_app.test_client().get("/api/health").get_json()
        assert body["error"] == "RuntimeError"
        assert "postgres" not in str(body)
        assert "5432" not in str(body)

    def test_probe_sets_a_statement_timeout(self, health_app, monkeypatch):
        conn = _PingConn()
        _patch_pool(monkeypatch, conn)
        health_app.test_client().get("/api/health")
        assert any("statement_timeout" in s for s in conn.cur.statements)
        assert any(s.strip() == "SELECT 1" for s in conn.cur.statements)

    def test_connection_is_returned_to_the_pool_on_success(self, health_app, monkeypatch):
        conn = _PingConn()
        returned = _patch_pool(monkeypatch, conn)
        health_app.test_client().get("/api/health")
        assert returned == [conn]

    def test_connection_is_returned_to_the_pool_on_failure(self, health_app, monkeypatch):
        """A leaked connection per failed probe would exhaust the pool."""
        conn = _PingConn(boom=True)
        returned = _patch_pool(monkeypatch, conn)
        health_app.test_client().get("/api/health")
        assert returned == [conn]

    def test_probe_does_not_leave_a_transaction_open(self, health_app, monkeypatch):
        conn = _PingConn()
        _patch_pool(monkeypatch, conn)
        health_app.test_client().get("/api/health")
        assert conn.rolled_back is True


# ---------------------------------------------------------------------------
# H. Branding — the UA launch
# ---------------------------------------------------------------------------

class TestBranding:

    def _render(self, **kw):
        from services import email_templates as et
        base = dict(lang="uk", first_name="Ion", test_name="",
                    date_str="2026-01-01", score=82, logo_url="https://x/logo.png")
        base.update(kw)
        return et.render(**base)

    def test_uk_subject_uses_the_ua_brand(self):
        subject, _, _ = self._render()
        assert "Bizcheck.com.ua" in subject
        assert "Bizcheck.md" not in subject

    def test_en_subject_uses_the_ua_brand(self):
        subject, _, _ = self._render(lang="en")
        assert "Bizcheck.com.ua" in subject
        assert "Bizcheck.md" not in subject

    def test_html_eyebrow_is_rebranded(self):
        _, html, _ = self._render()
        assert "BIZCHECK.COM.UA" in html
        assert "BIZCHECK.MD" not in html

    def test_footer_points_at_the_ua_site(self):
        _, html, text = self._render()
        assert "bizcheck.com.ua" in html
        assert "bizcheck.com.ua" in text

    def test_corporate_site_url_stays_crowe_tm_md(self):
        """crowe-tm.md is the real Crowe firm site — NOT stale .md branding."""
        from services import email_templates as et
        assert et.DEFAULT_SITE_URL == "https://crowe-tm.md"

    def test_reply_to_is_overridable_from_the_environment(self, monkeypatch):
        """The UA mailbox does not exist yet; it must be swappable without a deploy."""
        import importlib
        monkeypatch.setenv("EMAIL_REPLY_TO", "office@bizcheck.com.ua")
        from services import email_templates as et
        importlib.reload(et)
        try:
            assert et.DEFAULT_REPLY_TO == "office@bizcheck.com.ua"
            _, html, _ = et.render(
                lang="uk", first_name="Ion", test_name="T", date_str="d",
                score=50, logo_url="https://x/l.png",
            )
            assert "office@bizcheck.com.ua" in html
        finally:
            monkeypatch.delenv("EMAIL_REPLY_TO", raising=False)
            importlib.reload(et)
