"""Unit tests for the outbound CRM webhook (services/crm_notify.py).

No database, no network. Three seams are faked:

  * ``crm_notify._urlopen`` → a recorder that captures every urllib Request and
    answers with a scripted sequence of responses / exceptions. (The module
    opens through its own no-redirect opener, so this — not
    ``urllib.request.urlopen`` — is the single network seam.)
  * ``Submission.find_by_id`` / ``claim_crm_notification`` /
    ``release_crm_notification`` → in-memory doubles (imported lazily inside
    the service, so the class attributes are what gets patched).
  * ``crm_notify._sleep`` → records the backoff instead of sleeping.

The worker is exercised through the synchronous ``_deliver`` it runs; one test
proves the queue → worker wiring itself.
"""
import hashlib
import hmac
import io
import json
import logging
import os
import sys
import threading
import urllib.error
import uuid

_HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(_HERE))

import pytest  # noqa: E402

from models.submission import Submission  # noqa: E402
from services import crm_notify as cn  # noqa: E402

URL = "https://crm.example.com/hooks/abc?key=path-secret"
SECRET = "s3cr3t-shared-value"

LEAD_SUB = {
    "id": 42, "test_id": None, "first_name": "Olena", "last_name": "Koval",
    "email": "olena@example.org", "phone": "+380501112233", "tg_chat_id": None,
    "tg_username": None, "status": "completed", "language": "uk",
    "total_score": None, "consent": True, "has_pdf": False,
    "created_at": "2026-10-28T10:00:00+00:00",
}


# ---------------------------------------------------------------------------
# Fakes
# ---------------------------------------------------------------------------

class _Resp:
    def __init__(self, code):
        self.code = code

    def getcode(self):
        return self.code

    def read(self, n=-1):
        return b"{}"

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


def _http_error(code):
    return urllib.error.HTTPError(URL, code, "err", {}, io.BytesIO(b"nope"))


class FakeNet:
    """Scripted outcomes: an int → that status (2xx returns, else HTTPError);
    an Exception instance → raised. The last outcome repeats."""

    def __init__(self, *outcomes):
        self.outcomes = list(outcomes)
        self.requests = []

    def __call__(self, req, timeout):
        self.requests.append((req, timeout))
        out = self.outcomes.pop(0) if len(self.outcomes) > 1 else self.outcomes[0]
        if isinstance(out, BaseException):
            raise out
        if 200 <= out < 300:
            return _Resp(out)
        raise _http_error(out)


def _headers(req):
    return {k.lower(): v for k, v in req.header_items()}


@pytest.fixture
def env(monkeypatch):
    monkeypatch.setenv("CRM_WEBHOOK_URL", URL)
    monkeypatch.setenv("CRM_WEBHOOK_SECRET", SECRET)


@pytest.fixture
def sleeps(monkeypatch):
    calls = []
    monkeypatch.setattr(cn, "_sleep", calls.append)
    return calls


@pytest.fixture
def model(monkeypatch):
    """In-memory Submission double: one row, a claim flag, a call log."""
    state = {"rows": {42: dict(LEAD_SUB)}, "claimed": set(), "calls": []}

    def find_by_id(sid):
        state["calls"].append(("find", sid))
        row = state["rows"].get(sid)
        return dict(row) if row else None

    def claim(sid):
        state["calls"].append(("claim", sid))
        if sid in state["claimed"]:
            return None
        state["claimed"].add(sid)
        return sid

    def release(sid):
        state["calls"].append(("release", sid))
        state["claimed"].discard(sid)

    monkeypatch.setattr(Submission, "find_by_id", staticmethod(find_by_id))
    monkeypatch.setattr(Submission, "claim_crm_notification", staticmethod(claim))
    monkeypatch.setattr(Submission, "release_crm_notification", staticmethod(release))
    return state


@pytest.fixture
def enqueued(monkeypatch):
    jobs = []
    monkeypatch.setattr(cn, "_ensure_worker", lambda: None)
    monkeypatch.setattr(cn, "_enqueue", jobs.append)
    return jobs


# ---------------------------------------------------------------------------
# maybe_notify_crm — gating
# ---------------------------------------------------------------------------

class TestGate:
    def test_noop_when_url_unset(self, monkeypatch, model, enqueued):
        monkeypatch.delenv("CRM_WEBHOOK_URL", raising=False)
        cn.maybe_notify_crm(42)
        assert model["calls"] == [] and enqueued == []

    def test_noop_when_url_blank(self, monkeypatch, model, enqueued):
        monkeypatch.setenv("CRM_WEBHOOK_URL", "   ")
        cn.maybe_notify_crm(42)
        assert model["calls"] == [] and enqueued == []

    @pytest.mark.parametrize("bad", ["ftp://crm.example.com/x", "file:///etc/passwd",
                                     "javascript:alert(1)", "crm.example.com/hook"])
    def test_non_http_url_refused(self, monkeypatch, model, enqueued, bad):
        monkeypatch.setenv("CRM_WEBHOOK_URL", bad)
        cn.maybe_notify_crm(42)
        assert model["calls"] == [] and enqueued == []

    @pytest.mark.parametrize("patch", [
        {"email": None, "phone": None},                     # name, no contact
        {"first_name": None, "last_name": None},            # contact, no name
    ])
    def test_incomplete_lead_not_sent(self, env, model, enqueued, patch):
        model["rows"][42].update(patch)
        cn.maybe_notify_crm(42)
        assert ("claim", 42) not in model["calls"]
        assert enqueued == []

    def test_telegram_only_contact_counts(self, env, model, enqueued):
        model["rows"][42].update({"email": None, "phone": None, "tg_chat_id": 777})
        cn.maybe_notify_crm(42)
        assert enqueued == [42]

    def test_complete_lead_claimed_and_enqueued_once(self, env, model, enqueued):
        cn.maybe_notify_crm(42)
        cn.maybe_notify_crm(42)
        assert enqueued == [42]
        assert model["calls"].count(("claim", 42)) == 2

    def test_unknown_submission(self, env, model, enqueued):
        cn.maybe_notify_crm(999)
        assert enqueued == []

    def test_never_raises_on_db_error(self, env, monkeypatch, enqueued):
        def boom(_sid):
            raise RuntimeError("db down")
        monkeypatch.setattr(Submission, "find_by_id", staticmethod(boom))
        cn.maybe_notify_crm(42)  # must not raise
        assert enqueued == []

    def test_full_queue_releases_claim(self, env, model, monkeypatch):
        import queue as _q
        monkeypatch.setattr(cn, "_ensure_worker", lambda: None)
        monkeypatch.setattr(cn, "_QUEUE", _q.Queue(maxsize=1))
        cn._QUEUE.put_nowait(1)
        cn.maybe_notify_crm(42)
        assert ("release", 42) in model["calls"]


# ---------------------------------------------------------------------------
# _deliver — request shape
# ---------------------------------------------------------------------------

class TestRequestShape:
    def test_body_headers_and_signature(self, env, model, sleeps, monkeypatch):
        net = FakeNet(200)
        monkeypatch.setattr(cn, "_urlopen", net)
        assert cn._deliver(42) is True

        assert len(net.requests) == 1
        req, timeout = net.requests[0]
        assert timeout == 10
        assert req.get_method() == "POST"
        assert req.full_url == URL

        h = _headers(req)
        assert h["content-type"] == "application/json"
        assert h["user-agent"] == "Bizcheck-CRM-Webhook/1"
        assert h["x-bizcheck-event"] == "lead.created"
        uuid.UUID(h["x-bizcheck-delivery"])  # valid uuid
        assert h["x-bizcheck-token"] == SECRET
        expected = hmac.new(SECRET.encode(), req.data, hashlib.sha256).hexdigest()
        assert h["x-bizcheck-signature"] == f"sha256={expected}"

        body = json.loads(req.data.decode("utf-8"))
        assert set(body) == {"event", "schema_version", "sent_at", "lead"}
        assert body["event"] == "lead.created"
        assert body["schema_version"] == 1
        assert body["sent_at"].endswith("Z")
        assert body["lead"]["id"] == 42
        assert body["lead"]["contact"]["email"] == "olena@example.org"

        assert ("release", 42) not in model["calls"]
        assert sleeps == []

    def test_no_secret_no_auth_headers(self, env, model, monkeypatch):
        monkeypatch.delenv("CRM_WEBHOOK_SECRET")
        net = FakeNet(204)
        monkeypatch.setattr(cn, "_urlopen", net)
        assert cn._deliver(42) is True
        h = _headers(net.requests[0][0])
        assert "x-bizcheck-token" not in h
        assert "x-bizcheck-signature" not in h

    def test_retries_resend_identical_bytes_and_delivery_id(self, env, model, sleeps,
                                                            monkeypatch):
        net = FakeNet(503, 200)
        monkeypatch.setattr(cn, "_urlopen", net)
        assert cn._deliver(42) is True
        (r1, _), (r2, _) = net.requests
        assert r1.data == r2.data
        assert _headers(r1)["x-bizcheck-delivery"] == _headers(r2)["x-bizcheck-delivery"]


# ---------------------------------------------------------------------------
# _deliver — retry policy
# ---------------------------------------------------------------------------

class TestRetry:
    @pytest.mark.parametrize("code", [400, 401, 403, 404, 422])
    def test_4xx_gives_up_immediately_and_releases(self, env, model, sleeps,
                                                   monkeypatch, code):
        net = FakeNet(code)
        monkeypatch.setattr(cn, "_urlopen", net)
        assert cn._deliver(42) is False
        assert len(net.requests) == 1
        assert sleeps == []
        assert ("release", 42) in model["calls"]

    def test_5xx_retries_with_backoff_then_releases(self, env, model, sleeps, monkeypatch):
        net = FakeNet(500)
        monkeypatch.setattr(cn, "_urlopen", net)
        assert cn._deliver(42) is False
        assert len(net.requests) == 4
        assert sleeps == [2, 10, 30]
        assert ("release", 42) in model["calls"]

    def test_429_is_retried(self, env, model, sleeps, monkeypatch):
        net = FakeNet(429, 200)
        monkeypatch.setattr(cn, "_urlopen", net)
        assert cn._deliver(42) is True
        assert len(net.requests) == 2 and sleeps == [2]
        assert ("release", 42) not in model["calls"]

    def test_network_error_is_retried(self, env, model, sleeps, monkeypatch):
        net = FakeNet(urllib.error.URLError(ConnectionRefusedError()), TimeoutError(), 201)
        monkeypatch.setattr(cn, "_urlopen", net)
        assert cn._deliver(42) is True
        assert len(net.requests) == 3 and sleeps == [2, 10]

    def test_redirect_not_followed(self, env, model, sleeps, monkeypatch):
        net = FakeNet(302)
        monkeypatch.setattr(cn, "_urlopen", net)
        assert cn._deliver(42) is False
        assert len(net.requests) == 1
        assert ("release", 42) in model["calls"]

    def test_failure_log_has_no_secret_or_pii(self, env, model, sleeps, monkeypatch, caplog):
        monkeypatch.setattr(cn, "_urlopen", FakeNet(500))
        with caplog.at_level(logging.DEBUG, logger=cn.log.name):
            cn._deliver(42)
        text = caplog.text
        assert "FAILED" in text
        for leak in (SECRET, "olena@example.org", "+380501112233", "Olena",
                     "Koval", "path-secret", "/hooks/abc"):
            assert leak not in text

    def test_missing_submission_releases(self, env, model, monkeypatch):
        net = FakeNet(200)
        monkeypatch.setattr(cn, "_urlopen", net)
        assert cn._deliver(999) is False
        assert net.requests == []
        assert ("release", 999) in model["calls"]

    def test_non_http_url_refused_at_delivery(self, monkeypatch, model):
        monkeypatch.setenv("CRM_WEBHOOK_URL", "ftp://crm.example.com/x")
        net = FakeNet(200)
        monkeypatch.setattr(cn, "_urlopen", net)
        assert cn._deliver(42) is False
        assert net.requests == []
        assert ("release", 42) in model["calls"]


# ---------------------------------------------------------------------------
# Worker wiring
# ---------------------------------------------------------------------------

def test_worker_drains_queue(monkeypatch):
    done = threading.Event()
    seen = []

    def fake_deliver(sid):
        seen.append(sid)
        done.set()

    monkeypatch.setattr(cn, "_deliver", fake_deliver)
    cn._ensure_worker()
    cn._enqueue(7)
    assert done.wait(2)
    assert seen == [7]


# ---------------------------------------------------------------------------
# send_test_event
# ---------------------------------------------------------------------------

class TestSendTestEvent:
    def test_ok(self, env, monkeypatch, sleeps):
        net = FakeNet(200)
        monkeypatch.setattr(cn, "_urlopen", net)

        def no_db(*_a, **_k):
            raise AssertionError("send_test_event must not touch the DB")
        monkeypatch.setattr(Submission, "find_by_id", staticmethod(no_db))

        ok, status = cn.send_test_event()
        assert ok is True and "200" in status
        req = net.requests[0][0]
        h = _headers(req)
        assert h["x-bizcheck-event"] == "ping"
        expected = hmac.new(SECRET.encode(), req.data, hashlib.sha256).hexdigest()
        assert h["x-bizcheck-signature"] == f"sha256={expected}"
        body = json.loads(req.data)
        assert body["event"] == "ping" and body["schema_version"] == 1
        assert body["lead"]["id"] == 0
        assert body["lead"]["contact"]["email"].endswith("@example.com")

    def test_fail_single_attempt(self, env, monkeypatch, sleeps):
        net = FakeNet(500)
        monkeypatch.setattr(cn, "_urlopen", net)
        ok, status = cn.send_test_event()
        assert ok is False and "500" in status
        assert len(net.requests) == 1 and sleeps == []
        assert SECRET not in status

    def test_network_failure(self, env, monkeypatch, sleeps):
        monkeypatch.setattr(cn, "_urlopen", FakeNet(urllib.error.URLError("dns")))
        ok, status = cn.send_test_event()
        assert ok is False and "network error" in status

    def test_url_unset(self, monkeypatch):
        monkeypatch.delenv("CRM_WEBHOOK_URL", raising=False)
        ok, status = cn.send_test_event()
        assert ok is False and "CRM_WEBHOOK_URL" in status

    def test_non_http_refused(self, monkeypatch):
        monkeypatch.setenv("CRM_WEBHOOK_URL", "file:///etc/passwd")
        net = FakeNet(200)
        monkeypatch.setattr(cn, "_urlopen", net)
        ok, status = cn.send_test_event()
        assert ok is False and "refused" in status
        assert net.requests == []

    def test_cli_exit_codes(self, env, monkeypatch, capsys):
        from scripts import crm_test_webhook as cli
        monkeypatch.setattr(cli, "send_test_event", lambda: (True, "HTTP 200"))
        assert cli.main() == 0
        monkeypatch.setattr(cli, "send_test_event", lambda: (False, "HTTP 500"))
        assert cli.main() == 1
        assert "FAILED: HTTP 500" in capsys.readouterr().out


def test_no_redirect_handler_returns_none():
    h = cn._NoRedirect()
    assert h.redirect_request(None, None, 302, "Found", {}, "http://evil.example/") is None
