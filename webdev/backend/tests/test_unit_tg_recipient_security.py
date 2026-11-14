"""Local regression coverage for private, recipient-bound Telegram reports.

No Postgres or outbound calls: these tests exercise HTTP guards and capture the
atomic SQL boundary. PostgreSQL's concurrent UPDATE semantics require staging
verification; the suite does not claim to simulate a database lock manager.
"""
import base64

import pytest
from flask import Flask


SECRET = "unit-bot-secret"
HEADERS = {"X-Bot-Secret": SECRET, "X-Telegram-Chat-ID": "12345"}
PREFIX = "/api_crowe_bizcheck/tg"
ROUTES = ["/report/token", "/report/token/failed", "/contact/token", "/email/token", "/lead/token"]


@pytest.fixture
def bridge(monkeypatch):
    import routes.telegram as tg

    monkeypatch.setenv("BOT_SHARED_SECRET", SECRET)
    calls = []

    def absent(sql, params=None, **kwargs):
        calls.append((sql, params))
        return None

    monkeypatch.setattr(tg, "query", absent)
    monkeypatch.setattr(tg, "execute", absent)
    app = Flask(__name__)
    app.register_blueprint(tg.tg_bp)
    return app.test_client(), tg, calls


@pytest.mark.parametrize("path", ROUTES)
@pytest.mark.parametrize("provided", [None, "wrong-secret", "невірний"])
def test_secret_is_required_before_database_access(bridge, path, provided):
    client, _, calls = bridge
    headers = {"X-Telegram-Chat-ID": "12345"}
    if provided is not None:
        headers["X-Bot-Secret"] = provided
    r = client.post(PREFIX + path, headers=headers)
    assert r.status_code == 403
    assert calls == []
    assert r.headers["Cache-Control"] == "no-store"


@pytest.mark.parametrize("chat_id", [None, "0", "-100123456", "1.5", "True", "9" * 20])
@pytest.mark.parametrize("path", ROUTES)
def test_private_chat_is_required_before_database_access(bridge, chat_id, path):
    client, _, calls = bridge
    headers = {"X-Bot-Secret": SECRET}
    if chat_id is not None:
        headers["X-Telegram-Chat-ID"] = chat_id
    assert client.post(PREFIX + path, headers=headers).status_code == 400
    assert calls == []


def test_report_claim_and_pdf_read_share_one_atomic_statement(bridge, monkeypatch):
    client, tg, calls = bridge
    row = {"id": 1, "first_name": "Олена", "last_name": "Тест",
           "total_score": 80, "block_scores_json": [], "pdf_data": b"%PDF-test",
           "language": "uk", "scoring_zones": None}

    def claim(sql, params):
        calls.append((sql, params))
        return row

    monkeypatch.setattr(tg, "execute", claim)
    r = client.post(PREFIX + "/report/token", headers=HEADERS)
    assert r.status_code == 200
    assert base64.b64decode(r.json["pdf_b64"]) == b"%PDF-test"
    assert len(calls) == 1
    sql, params = calls[0]
    assert params == (12345, "token", 12345)
    normalized = " ".join(sql.lower().split())
    assert "update submissions set tg_token_chat_id = %s" in normalized
    assert "tg_token_expires > now()" in normalized
    assert "tg_token_chat_id is null or tg_token_chat_id = %s" in normalized
    assert "left join tests" in normalized


def test_invalid_expired_and_already_claimed_tokens_share_404(bridge):
    client, _, _ = bridge
    r = client.post(PREFIX + "/report/token", headers=HEADERS)
    assert r.status_code == 404
    assert "pdf_b64" not in r.json


def test_contact_cannot_replace_the_recipient_with_a_json_identity(bridge):
    client, _, calls = bridge
    r = client.post(PREFIX + "/contact/token", headers=HEADERS,
                    json={"tg_chat_id": 67890})
    assert r.status_code == 400
    assert calls == []


def test_claimed_recipient_can_save_contact_and_schedules_uk_feedback(bridge, monkeypatch):
    client, tg, calls = bridge
    scheduled = []

    def persist(sql, params):
        calls.append((sql, params))
        return {"id": 42}

    monkeypatch.setattr(tg, "execute", persist)
    monkeypatch.setattr("services.sales_notify.maybe_notify_sales", lambda *a: None)
    monkeypatch.setattr("services.crm_notify.maybe_notify_crm", lambda *a: None)
    monkeypatch.setattr("services.feedback.maybe_schedule_auto",
                        lambda *args: scheduled.append(args))
    r = client.post(PREFIX + "/contact/token", headers=HEADERS,
                    json={"tg_chat_id": 12345, "tg_first_name": "<b>Олена</b>"})
    assert r.status_code == 200 and r.json == {"ok": True}
    assert scheduled == [(12345, "uk")]
    _, params = calls[0]
    assert params == (12345, "", "Олена", "", "token", 12345)


@pytest.mark.parametrize("action,body", [
    ("email", {"email": "Client@Example.com"}),
    ("lead", {"email": "Client@Example.com", "phone": "+380671234567"}),
])
def test_claimed_recipient_can_use_contact_actions(bridge, monkeypatch, action, body):
    client, tg, _ = bridge
    updates = []
    monkeypatch.setattr(tg, "query", lambda *a, **k: {"id": 42})
    monkeypatch.setattr("models.submission.Submission.update",
                        staticmethod(lambda sid, **fields: updates.append((sid, fields))))
    monkeypatch.setattr("services.sales_notify.maybe_notify_sales", lambda *a: None)
    monkeypatch.setattr("services.crm_notify.maybe_notify_crm", lambda *a: None)
    monkeypatch.setattr("services.report_email.dispatch_report_email", lambda sid: (True, "ok"))
    r = client.post(PREFIX + f"/{action}/token", headers=HEADERS, json=body)
    assert r.status_code == 200 and r.json["ok"] is True
    expected = {"email": "client@example.com"}
    if action == "lead":
        expected["phone"] = "+380671234567"
    assert updates == [(42, expected)]


@pytest.mark.parametrize("path,body", [
    ("/email/token", {"email": "client@example.com"}),
    ("/lead/token", {"phone": "+380671234567"}),
])
def test_actions_require_the_same_claimed_chat(bridge, path, body):
    client, _, calls = bridge
    r = client.post(PREFIX + path, headers=HEADERS, json=body)
    assert r.status_code == 404
    assert len(calls) == 1
    sql, params = calls[0]
    assert params == ("token", 12345)
    assert "tg_token_expires > NOW()" in sql
    assert "tg_token_chat_id = %s" in sql


def test_foreign_failed_link_does_not_notify_sales(bridge, monkeypatch):
    client, _, calls = bridge
    monkeypatch.setattr("services.sales_notify.notify_delivery_issue",
                        lambda *a, **k: pytest.fail("foreign token triggered an alert"))
    r = client.post(PREFIX + "/report/token/failed", headers=HEADERS,
                    json={"reason": "expired", "tg_chat_id": 99999})
    assert r.status_code == 200 and r.json == {"ok": True}
    sql, params = calls[0]
    assert params == ("token", 12345)
    assert "tg_token_chat_id IS NULL OR tg_token_chat_id = %s" in sql


@pytest.mark.parametrize("path", ROUTES)
def test_non_object_json_is_rejected(bridge, path):
    client, _, calls = bridge
    assert client.post(PREFIX + path, headers=HEADERS, json=["bad"]).status_code == 400
    assert calls == []


def test_link_issuance_serializes_refresh_and_preserves_a_live_bind(bridge, monkeypatch):
    client, tg, calls = bridge
    monkeypatch.setenv("TELEGRAM_BOT_USERNAME", "UA_BizCheck_bot")
    monkeypatch.setattr("models.submission.Submission.find_id_by_token",
                        staticmethod(lambda sid, token: sid))

    def issue(sql, params):
        calls.append((sql, params))
        assert len(params[0]) == 43  # 32 bytes of randomness, Telegram-safe base64url.
        return {"tg_token": "live_token", "has_pdf": True}

    monkeypatch.setattr(tg, "execute", issue)
    r = client.post(PREFIX + "/link/1", headers={"X-Submission-Token": "owner"})
    assert r.status_code == 200
    assert r.json["token"] == "live_token" and r.json["pdf_ready"] is True
    assert r.headers["Cache-Control"] == "no-store"
    assert len(calls) == 1
    sql, _ = calls[0]
    assert "THEN tg_token_chat_id ELSE NULL END" in sql
    assert "THEN tg_token ELSE %s END" in sql
