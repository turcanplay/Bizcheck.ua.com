"""Unit tests for services.sales_notify.

Covers the pure formatting/gating helpers and the maybe_notify_sales control
flow. The current code hands work to a single serialized queue worker, so we
assert on the ENQUEUED jobs (patching sn._enqueue) rather than on spawned
threads — which is the real seam.
"""
import pytest

from services import sales_notify as sn


class TestZoneLabel:
    @pytest.mark.parametrize("score,label", [
        (85, "Risc scăzut"), (72, "Risc moderat"),
        (66, "Risc ridicat"), (40, "Risc critic"),
    ])
    def test_boundaries(self, score, label):
        assert sn._zone_label_ro(score) == label


class TestEsc:
    def test_escapes_html_metachars(self):
        assert sn._esc("<b>&</b>") == "&lt;b&gt;&amp;&lt;/b&gt;"

    def test_none_is_empty(self):
        assert sn._esc(None) == ""


class TestContactLine:
    def test_username_becomes_tme_link(self):
        line = sn._tg_contact_line({"tg_username": "@ion"})
        assert "https://t.me/ion" in line

    def test_chat_id_fallback(self):
        line = sn._tg_contact_line({"tg_chat_id": 555})
        assert "tg://user?id=555" in line

    def test_none_dash(self):
        assert sn._tg_contact_line({}) == "—"


class TestBuildKeyboard:
    def test_telegram_and_email_buttons(self):
        kb = sn._build_keyboard({"tg_username": "ion", "email": "a@b.md"})
        rows = kb["inline_keyboard"]
        assert any("t.me/ion" in b["url"] for row in rows for b in row)
        assert any("mail.google.com" in b["url"] for row in rows for b in row)

    def test_none_when_no_contacts(self):
        assert sn._build_keyboard({}) is None

    def test_invalid_email_skipped(self):
        assert sn._build_keyboard({"email": "not-an-email"}) is None


class TestBuildCaption:
    def test_contains_lead_fields_and_score_zone(self):
        cap = sn._build_caption(
            {"first_name": "Ion", "last_name": "Pop", "phone": "079",
             "email": "a@b.md", "total_score": 85, "sector": "IT"},
            "BizCheck")
        assert "Ion Pop" in cap
        assert "a@b.md" in cap
        assert "Risc scăzut" in cap          # 85 → low risk
        assert "BizCheck" in cap

    def test_non_numeric_score_renders_dash(self):
        cap = sn._build_caption({"first_name": "Ana", "total_score": None}, "T")
        assert "Scor: <b>—</b>" in cap


class TestRetryAfter:
    def test_parses_retry_after(self):
        assert sn._retry_after(b'{"parameters": {"retry_after": 7}}') == 7

    def test_clamps_low_and_high(self):
        assert sn._retry_after(b'{"parameters": {"retry_after": 0}}') == 1
        assert sn._retry_after(b'{"parameters": {"retry_after": 999}}') == 30

    def test_bad_body_defaults_to_one(self):
        assert sn._retry_after(b"garbage") == 1


class TestMaybeNotifySales:
    """Control-flow of the public entrypoint, asserting on enqueued jobs."""

    @pytest.fixture
    def jobs(self, monkeypatch):
        captured = []
        monkeypatch.setattr(sn, "_configured", lambda: True)
        monkeypatch.setattr(sn, "_ensure_worker", lambda: None)
        monkeypatch.setattr(sn, "_enqueue", lambda job, **kw: captured.append(job))
        return captured

    def _sub(self, **kw):
        base = {"id": 1, "first_name": "Ion", "last_name": "P", "email": "a@b.md",
                "phone": None, "tg_chat_id": None, "total_score": 80, "test_id": 1}
        base.update(kw)
        return base

    def test_skips_when_not_configured(self, monkeypatch):
        monkeypatch.setattr(sn, "_configured", lambda: False)
        # Should return before touching the model layer at all.
        sn.maybe_notify_sales(1)   # no exception == pass

    def test_skips_incomplete_lead(self, monkeypatch, jobs):
        sub = self._sub(first_name=None, last_name=None, email=None)
        monkeypatch.setattr("models.submission.Submission.find_by_id", staticmethod(lambda i: sub))
        sn.maybe_notify_sales(1)
        assert jobs == []

    def test_first_lead_enqueues_send(self, monkeypatch, jobs):
        monkeypatch.setattr("models.submission.Submission.find_by_id",
                            staticmethod(lambda i: self._sub()))
        monkeypatch.setattr("models.submission.Submission.claim_sales_notification",
                            staticmethod(lambda i: i))          # claim won
        sn.maybe_notify_sales(1)
        assert jobs == [("send", 1)]

    def test_already_claimed_with_known_message_enqueues_update(self, monkeypatch, jobs):
        monkeypatch.setattr("models.submission.Submission.find_by_id",
                            staticmethod(lambda i: self._sub()))
        monkeypatch.setattr("models.submission.Submission.claim_sales_notification",
                            staticmethod(lambda i: None))       # claim lost
        monkeypatch.setattr("models.submission.Submission.get_sales_message",
                            staticmethod(lambda i: (123, True)))
        sn.maybe_notify_sales(1)
        assert jobs == [("update", 1, 123, True)]

    def test_already_claimed_without_message_does_nothing(self, monkeypatch, jobs):
        monkeypatch.setattr("models.submission.Submission.find_by_id",
                            staticmethod(lambda i: self._sub()))
        monkeypatch.setattr("models.submission.Submission.claim_sales_notification",
                            staticmethod(lambda i: None))
        monkeypatch.setattr("models.submission.Submission.get_sales_message",
                            staticmethod(lambda i: None))
        sn.maybe_notify_sales(1)
        assert jobs == []
