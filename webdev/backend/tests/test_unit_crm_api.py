"""
Unit tests — the CRM pull API (routes/crm.py).

The API hands out PII to a machine caller, so the fail-closed API-key gate is
the security boundary; the rest pins the parameter contract the CRM integrator
codes against (cursor, limit cap, completeness filter, response shape).

No running backend and no database: the blueprint is mounted on a bare Flask app,
Submission is replaced by an in-memory fake and the test loader is stubbed.

Run with:
    cd webdev/backend
    venv/bin/python -m pytest tests/test_unit_crm_api.py -v
"""
import os
import sys
from datetime import datetime, timedelta, timezone

_HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(_HERE))

import pytest
from flask import Flask

KEY = "unit-test-crm-key"
BASE = "/api_crowe_bizcheck/crm"
AUTH = {"X-Api-Key": KEY}

_T0 = datetime(2026, 10, 1, 12, 0, tzinfo=timezone.utc)


def _row(i, *, name=True, email=True, phone=False, tg=False, test_id=1):
    return {
        "id": i,
        "test_id": test_id,
        "first_name": f"Name{i}" if name else None,
        "last_name": None,
        "email": f"u{i}@example.com" if email else None,
        "phone": "+380000000000" if phone else None,
        "tg_chat_id": 1000 + i if tg else None,
        "tg_username": None,
        "sector": "it", "company_size": None, "company_age": None,
        "company_revenue": None, "total_score": None, "consent": True,
        "status": "completed", "created_at": _T0 + timedelta(hours=i),
        "language": "uk", "has_pdf": False,
    }


class _FakeSubmission:
    """In-memory stand-in for models.submission.Submission."""

    def __init__(self, rows):
        self.rows = sorted(rows, key=lambda r: r["id"])
        self.calls = []

    def list_for_crm(self, since=None, since_id=None, limit=50):
        self.calls.append({"since": since, "since_id": since_id, "limit": limit})
        out = [r for r in self.rows
               if (since_id is None or r["id"] > since_id)
               and (since is None or r["created_at"] > since)]
        return out[:limit]

    def find_by_id(self, submission_id):
        return next((r for r in self.rows if r["id"] == submission_id), None)


@pytest.fixture
def fake(monkeypatch):
    import routes.crm as mod
    f = _FakeSubmission([_row(i) for i in range(1, 6)])
    monkeypatch.setattr(mod, "Submission", f)
    loads = []

    def _load(test_id):
        loads.append(test_id)
        return {"id": test_id, "slug": f"t{test_id}", "name_uk": "Тест", "scoring_zones": None}

    monkeypatch.setattr(mod, "_load_test", _load)
    f.test_loads = loads
    return f


def _client():
    from routes.crm import crm_bp
    app = Flask(__name__)
    app.register_blueprint(crm_bp)
    return app.test_client()


@pytest.fixture
def client(fake, monkeypatch):
    monkeypatch.setenv("CRM_API_KEY", KEY)
    return _client()


# ---------------------------------------------------------------------------
# A. The API-key gate — strict / fail-closed
# ---------------------------------------------------------------------------

class TestKeyGate:

    @pytest.mark.parametrize("value", [None, "", "   "])
    def test_unset_server_key_disables_the_feature(self, fake, monkeypatch, value):
        """No CRM_API_KEY on the server → 403 even with a key sent. Never open."""
        if value is None:
            monkeypatch.delenv("CRM_API_KEY", raising=False)
        else:
            monkeypatch.setenv("CRM_API_KEY", value)
        c = _client()
        assert c.get(f"{BASE}/ping", headers=AUTH).status_code == 403
        assert c.get(f"{BASE}/ping", headers={"X-Api-Key": ""}).status_code == 403
        assert c.get(f"{BASE}/leads",
                     headers={"Authorization": f"Bearer {KEY}"}).status_code == 403

    def test_missing_key_is_401(self, client):
        resp = client.get(f"{BASE}/ping")
        assert resp.status_code == 401
        assert resp.get_json() == {"error": "unauthorized"}

    @pytest.mark.parametrize("headers", [
        {"X-Api-Key": "nope"},
        {"X-Api-Key": KEY + "x"},
        {"Authorization": "Bearer nope"},
        {"Authorization": KEY},             # no scheme
        {"Authorization": f"Basic {KEY}"},  # wrong scheme
        {"X-Api-Key": "ключ"},              # non-ASCII must not crash compare_digest
    ])
    def test_wrong_key_is_401(self, client, headers):
        assert client.get(f"{BASE}/leads", headers=headers).status_code == 401

    def test_x_api_key_ok(self, client):
        assert client.get(f"{BASE}/ping", headers=AUTH).status_code == 200

    @pytest.mark.parametrize("scheme", ["Bearer", "bearer"])
    def test_bearer_ok(self, client, scheme):
        resp = client.get(f"{BASE}/ping", headers={"Authorization": f"{scheme} {KEY}"})
        assert resp.status_code == 200

    def test_server_key_is_stripped(self, fake, monkeypatch):
        monkeypatch.setenv("CRM_API_KEY", f"  {KEY}\n")
        assert _client().get(f"{BASE}/ping", headers=AUTH).status_code == 200

    def test_gate_covers_every_route(self, client):
        for path in ("/ping", "/leads", "/leads/1"):
            assert client.get(f"{BASE}{path}").status_code == 401


# ---------------------------------------------------------------------------
# B. Headers / shape
# ---------------------------------------------------------------------------

class TestShape:

    def test_ping(self, client):
        resp = client.get(f"{BASE}/ping", headers=AUTH)
        assert resp.get_json() == {"ok": True, "service": "bizcheck.com.ua",
                                   "schema_version": 1}

    @pytest.mark.parametrize("path,headers", [
        ("/ping", AUTH), ("/leads", AUTH), ("/leads/1", AUTH), ("/leads/999", AUTH),
        ("/leads?limit=x", AUTH), ("/ping", {}),
    ])
    def test_no_store_everywhere(self, client, path, headers):
        resp = client.get(f"{BASE}{path}", headers=headers)
        assert "no-store" in resp.headers.get("Cache-Control", "")

    def test_no_store_on_disabled_feature(self, fake, monkeypatch):
        monkeypatch.delenv("CRM_API_KEY", raising=False)
        resp = _client().get(f"{BASE}/ping", headers=AUTH)
        assert resp.status_code == 403
        assert "no-store" in resp.headers.get("Cache-Control", "")

    def test_lead_shape(self, client):
        body = client.get(f"{BASE}/leads", headers=AUTH).get_json()
        lead = body["leads"][0]
        assert lead["id"] == 1
        assert lead["contact"]["email"] == "u1@example.com"
        assert lead["test"]["slug"] == "t1"
        assert lead["source"] == "bizcheck.com.ua"

    def test_single_lead(self, client):
        resp = client.get(f"{BASE}/leads/3", headers=AUTH)
        assert resp.status_code == 200
        assert resp.get_json()["id"] == 3

    def test_single_lead_404(self, client):
        resp = client.get(f"{BASE}/leads/999", headers=AUTH)
        assert resp.status_code == 404
        assert resp.get_json() == {"error": "not found"}


# ---------------------------------------------------------------------------
# C. /leads parameters
# ---------------------------------------------------------------------------

class TestLeadsParams:

    @pytest.mark.parametrize("qs", [
        "limit=abc", "limit=0", "limit=-5", "limit=1.5",
        "since_id=abc", "since_id=-1",
        "since=yesterday", "since=2026-13-01", "since=12345abc",
        "complete_only=maybe",
    ])
    def test_garbage_is_400(self, client, qs):
        resp = client.get(f"{BASE}/leads?{qs}", headers=AUTH)
        assert resp.status_code == 400
        assert "error" in resp.get_json()

    def test_limit_is_capped_at_200(self, client, fake):
        fake.rows = [_row(i) for i in range(1, 301)]
        body = client.get(f"{BASE}/leads?limit=500&complete_only=false",
                          headers=AUTH).get_json()
        assert body["count"] == 200
        assert fake.calls[-1]["limit"] == 200

    def test_default_limit_is_50(self, client, fake):
        fake.rows = [_row(i) for i in range(1, 101)]
        body = client.get(f"{BASE}/leads", headers=AUTH).get_json()
        assert body["count"] == 50

    def test_since_id_cursor_and_order(self, client):
        body = client.get(f"{BASE}/leads?since_id=2", headers=AUTH).get_json()
        assert [l["id"] for l in body["leads"]] == [3, 4, 5]
        assert body["count"] == 3
        assert body["next_since_id"] == 5

    def test_next_since_id_pages_through(self, client):
        b1 = client.get(f"{BASE}/leads?limit=2", headers=AUTH).get_json()
        assert [l["id"] for l in b1["leads"]] == [1, 2]
        b2 = client.get(f"{BASE}/leads?limit=2&since_id={b1['next_since_id']}",
                        headers=AUTH).get_json()
        assert [l["id"] for l in b2["leads"]] == [3, 4]

    def test_next_since_id_echoes_cursor_when_empty(self, client):
        body = client.get(f"{BASE}/leads?since_id=99", headers=AUTH).get_json()
        assert body == {"leads": [], "count": 0, "next_since_id": 99}

    def test_next_since_id_null_without_cursor_when_empty(self, client, fake):
        fake.rows = []
        body = client.get(f"{BASE}/leads", headers=AUTH).get_json()
        assert body == {"leads": [], "count": 0, "next_since_id": None}

    @pytest.mark.parametrize("since", [
        "2026-10-01T14:30:00Z", "2026-10-01T14:30:00+00:00",
        "2026-10-01T17:30:00+03:00", "2026-10-01T14:30:00",
    ])
    def test_since_filters_and_is_timezone_aware(self, client, fake, since):
        from urllib.parse import quote
        body = client.get(f"{BASE}/leads?since={quote(since)}", headers=AUTH).get_json()
        # rows are created at T0 + i hours (12:00 + i) → ids 3,4,5 are after 14:30Z
        assert [l["id"] for l in body["leads"]] == [3, 4, 5]
        assert fake.calls[-1]["since"].tzinfo is not None

    def test_each_test_loaded_once(self, client, fake):
        fake.rows = [_row(i, test_id=(1 if i % 2 else 2)) for i in range(1, 11)]
        client.get(f"{BASE}/leads", headers=AUTH)
        assert sorted(fake.test_loads) == [1, 2]


# ---------------------------------------------------------------------------
# D. complete_only (name AND email/phone/tg_chat_id — same rule as sales_notify)
# ---------------------------------------------------------------------------

class TestCompleteOnly:

    @pytest.fixture
    def mixed(self, fake):
        fake.rows = [
            _row(1),                                       # name + email
            _row(2, name=False),                           # no name
            _row(3, email=False),                          # name, no contact
            _row(4, email=False, phone=True),              # name + phone
            _row(5, email=False, tg=True),                 # name + telegram
            _row(6, name=False, email=False),              # nothing
        ]
        return fake

    def test_default_is_complete_only(self, client, mixed):
        body = client.get(f"{BASE}/leads", headers=AUTH).get_json()
        assert [l["id"] for l in body["leads"]] == [1, 4, 5]
        assert body["next_since_id"] == 5

    @pytest.mark.parametrize("v", ["false", "0", "no", "FALSE"])
    def test_complete_only_false_returns_everything(self, client, mixed, v):
        body = client.get(f"{BASE}/leads?complete_only={v}", headers=AUTH).get_json()
        assert [l["id"] for l in body["leads"]] == [1, 2, 3, 4, 5, 6]
        assert body["next_since_id"] == 6

    def test_limit_counts_complete_rows_only(self, client, mixed):
        body = client.get(f"{BASE}/leads?limit=2", headers=AUTH).get_json()
        assert [l["id"] for l in body["leads"]] == [1, 4]
        # cursor stops at the last RETURNED lead, so lead 5 comes next page
        assert body["next_since_id"] == 4

    def test_trailing_incomplete_rows_keep_cursor(self, client, mixed):
        """Row 6 (incomplete, maybe a quiz in progress) must be re-checked later."""
        body = client.get(f"{BASE}/leads?since_id=5", headers=AUTH).get_json()
        assert body == {"leads": [], "count": 0, "next_since_id": 5}

    def test_over_fetches_past_incomplete_rows(self, client, fake):
        """Complete rows hidden behind more than one batch of incomplete ones
        are still found — `limit` is filled when possible."""
        fake.rows = ([_row(i, name=False) for i in range(1, 451)]
                     + [_row(i) for i in range(451, 461)])
        body = client.get(f"{BASE}/leads?limit=5", headers=AUTH).get_json()
        assert [l["id"] for l in body["leads"]] == [451, 452, 453, 454, 455]
        assert len(fake.calls) == 3  # 200 + 200 + 60 rows scanned

    def test_scan_is_bounded_and_cursor_advances(self, client, fake):
        """A wall of incomplete rows larger than the scan bound: no endless
        work per request, and the cursor moves past it (no stuck poller)."""
        fake.rows = [_row(i, name=False) for i in range(1, 2001)]
        body = client.get(f"{BASE}/leads", headers=AUTH).get_json()
        assert body["count"] == 0
        assert len(fake.calls) == 5
        assert body["next_since_id"] == 1000


# ---------------------------------------------------------------------------
# E. Model method — SQL shape, no DB
# ---------------------------------------------------------------------------

class TestModelMethod:

    def test_list_for_crm_query_and_decrypt(self, monkeypatch):
        import models.submission as msub
        seen = {}

        def _query(sql, params=None, **kw):
            seen["sql"], seen["params"], seen["kw"] = sql, params, kw
            return [{"id": 7, "first_name": "x"}]

        monkeypatch.setattr(msub, "query", _query)
        monkeypatch.setattr(msub, "decrypt_rows", lambda rows: [dict(r, dec=True) for r in rows])
        since = datetime(2026, 1, 1, tzinfo=timezone.utc)
        out = msub.Submission.list_for_crm(since=since, since_id=3, limit=10)

        assert out == [{"id": 7, "first_name": "x", "dec": True}]
        sql = " ".join(seen["sql"].split())
        assert "id > %s" in sql and "created_at > %s" in sql
        assert sql.endswith("ORDER BY id ASC LIMIT %s")
        assert seen["params"] == (3, since, 10)
        assert seen["kw"].get("fetch_all") is True

    def test_list_for_crm_no_filters(self, monkeypatch):
        import models.submission as msub
        seen = {}
        monkeypatch.setattr(msub, "query",
                            lambda sql, params=None, **kw: seen.update(sql=sql, params=params) or [])
        assert msub.Submission.list_for_crm() == []
        assert "WHERE" not in seen["sql"]
        assert seen["params"] == (50,)
