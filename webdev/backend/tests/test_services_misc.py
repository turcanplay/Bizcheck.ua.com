"""Unit tests for the thin business-logic services (result / submission /
feedback / telegram_send). Model + network access is monkeypatched."""
import pytest


# ---------------------------------------------------------------------------
# result_service — score validation
# ---------------------------------------------------------------------------
class TestResultService:
    def _patch_create(self, monkeypatch):
        monkeypatch.setattr("models.result.Result.create",
                            staticmethod(lambda uid, bid, s, t: {
                                "id": 1, "user_id": uid, "block_id": bid,
                                "score": s, "total_questions": t, "completed_at": "2026-01-01"}))

    def test_rejects_score_above_total(self, monkeypatch):
        from services import result_service as rs
        with pytest.raises(ValueError):
            rs.save_result(1, 1, score=11, total_questions=10)

    def test_rejects_negative_score(self, monkeypatch):
        from services import result_service as rs
        with pytest.raises(ValueError):
            rs.save_result(1, 1, score=-1, total_questions=10)

    def test_rejects_nonpositive_total(self, monkeypatch):
        from services import result_service as rs
        with pytest.raises(ValueError):
            rs.save_result(1, 1, score=0, total_questions=0)

    def test_valid_result_stringifies_completed_at(self, monkeypatch):
        from services import result_service as rs
        self._patch_create(monkeypatch)
        out = rs.save_result(1, 2, score=7, total_questions=10)
        assert out["score"] == 7
        assert isinstance(out["completed_at"], str)


# ---------------------------------------------------------------------------
# submission_service — test resolution + JSON coercion + not-found guards
# ---------------------------------------------------------------------------
class TestSubmissionService:
    def test_create_rejects_unknown_test_id(self, monkeypatch):
        from services import submission_service as ss
        monkeypatch.setattr("models.test.Test.find_by_id", staticmethod(lambda i: None))
        with pytest.raises(ValueError, match="Test not found"):
            ss.create_submission("A", "B", None, None, True, test_id=999)

    def test_create_resolves_slug(self, monkeypatch):
        from services import submission_service as ss
        monkeypatch.setattr("models.test.Test.find_by_slug", staticmethod(lambda s: {"id": 5}))
        captured = {}

        def fake_create(fn, ln, email, phone, consent, test_id=None):
            captured["test_id"] = test_id
            return {"id": 1, "created_at": "2026-01-01"}
        monkeypatch.setattr("models.submission.Submission.create", staticmethod(fake_create))
        ss.create_submission("A", "B", None, None, True, test_slug="my-test")
        assert captured["test_id"] == 5

    def test_update_serializes_dict_json_fields(self, monkeypatch):
        from services import submission_service as ss
        monkeypatch.setattr("models.submission.Submission.find_by_id",
                            staticmethod(lambda i: {"id": i}))
        seen = {}

        def fake_update(sid, **data):
            seen.update(data)
            return {"id": sid, "created_at": "2026-01-01"}
        monkeypatch.setattr("models.submission.Submission.update", staticmethod(fake_update))
        ss.update_submission(1, {"answers_json": {"b1q1": 3}, "status": "completed"})
        assert isinstance(seen["answers_json"], str)   # dict → JSON string
        assert '"b1q1"' in seen["answers_json"]

    def test_update_unknown_submission_raises(self, monkeypatch):
        from services import submission_service as ss
        monkeypatch.setattr("models.submission.Submission.find_by_id", staticmethod(lambda i: None))
        with pytest.raises(ValueError, match="not found"):
            ss.update_submission(1, {"status": "x"})

    def test_get_pdf_missing_raises(self, monkeypatch):
        from services import submission_service as ss
        monkeypatch.setattr("models.submission.Submission.get_pdf", staticmethod(lambda i: None))
        with pytest.raises(ValueError, match="PDF not found"):
            ss.get_submission_pdf(1)


# ---------------------------------------------------------------------------
# feedback — pure config helpers + auto-schedule gating
# ---------------------------------------------------------------------------
class TestFeedback:
    def test_norm_lang(self):
        from services import feedback as fb
        assert fb.norm_lang("uk") == "uk"
        assert fb.norm_lang("ru") == "ru"
        assert fb.norm_lang("xx") == "ru"      # default is ru here

    def test_get_prompt_uses_default_when_unset(self, monkeypatch):
        from services import feedback as fb
        monkeypatch.setattr("models.site_settings.SiteSettings.get",
                            staticmethod(lambda k, d="": ""))
        assert fb.get_prompt("uk") == fb.DEFAULT_PROMPT["uk"]

    def test_compose_message_appends_hint(self, monkeypatch):
        from services import feedback as fb
        monkeypatch.setattr("models.site_settings.SiteSettings.get",
                            staticmethod(lambda k, d="": "PROMPT"))
        msg = fb.compose_message("uk")
        assert msg.startswith("PROMPT")
        assert fb.REPLY_HINT["uk"] in msg

    def test_auto_delay_clamps_and_defaults(self, monkeypatch):
        from services import feedback as fb
        monkeypatch.setattr("models.site_settings.SiteSettings.get",
                            staticmethod(lambda k, d="": "999999"))
        assert fb.auto_delay_min() == fb.MAX_DELAY_MIN
        monkeypatch.setattr("models.site_settings.SiteSettings.get",
                            staticmethod(lambda k, d="": "not-a-number"))
        assert fb.auto_delay_min() == fb.DEFAULT_DELAY_MIN

    def test_auto_enabled_flag(self, monkeypatch):
        from services import feedback as fb
        monkeypatch.setattr("models.site_settings.SiteSettings.get",
                            staticmethod(lambda k, d="": "1"))
        assert fb.auto_enabled() is True

    def test_maybe_schedule_noop_when_disabled(self, monkeypatch):
        from services import feedback as fb
        monkeypatch.setattr(fb, "auto_enabled", lambda: False)
        called = {"n": 0}
        monkeypatch.setattr("models.tg_outreach.TgOutreach.create",
                            staticmethod(lambda **k: called.__setitem__("n", called["n"] + 1)))
        fb.maybe_schedule_auto(123, "uk")
        assert called["n"] == 0

    def test_maybe_schedule_skips_when_already_scheduled(self, monkeypatch):
        from services import feedback as fb
        monkeypatch.setattr(fb, "auto_enabled", lambda: True)
        monkeypatch.setattr("models.tg_outreach.TgOutreach.has_auto_for_chat",
                            staticmethod(lambda c: True))
        created = {"n": 0}
        monkeypatch.setattr("models.tg_outreach.TgOutreach.create",
                            staticmethod(lambda **k: created.__setitem__("n", created["n"] + 1)))
        fb.maybe_schedule_auto(123, "uk")
        assert created["n"] == 0

    def test_maybe_schedule_creates_when_new(self, monkeypatch):
        from services import feedback as fb
        monkeypatch.setattr(fb, "auto_enabled", lambda: True)
        monkeypatch.setattr("models.tg_outreach.TgOutreach.has_auto_for_chat",
                            staticmethod(lambda c: False))
        monkeypatch.setattr(fb, "auto_delay_min", lambda: 60)
        seen = {}
        monkeypatch.setattr("models.tg_outreach.TgOutreach.create",
                            staticmethod(lambda **k: seen.update(k)))
        fb.maybe_schedule_auto(123, "uk")
        assert seen["tg_chat_id"] == 123
        assert seen["mode"] == "auto"
        assert seen["lang"] == "uk"


# ---------------------------------------------------------------------------
# question_service._serialize — attaches answers + stringifies timestamps
# ---------------------------------------------------------------------------
class TestQuestionSerialize:
    def test_attaches_answers_and_stringifies_dates(self, monkeypatch):
        from services import question_service as qs
        monkeypatch.setattr("models.answer.Answer.find_by_question",
                            staticmethod(lambda qid: [{"id": 9, "created_at": 123}]))
        out = qs._serialize([{"id": 1, "created_at": 456}])
        assert out[0]["answers"][0]["id"] == 9
        assert out[0]["created_at"] == "456"              # stringified
        assert out[0]["answers"][0]["created_at"] == "123"


# ---------------------------------------------------------------------------
# email_service — SMTP gate + MIME message assembly (no network / no send)
# ---------------------------------------------------------------------------
class TestEmailService:
    def test_smtp_configured_requires_all_three(self, monkeypatch):
        from services import email_service as es
        for k in ("SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD"):
            monkeypatch.setenv(k, "x")
        assert es._smtp_configured() is True
        monkeypatch.delenv("SMTP_PASSWORD")
        assert es._smtp_configured() is False

    def test_build_message_has_alternative_and_pdf(self, monkeypatch):
        from services import email_service as es
        monkeypatch.setenv("SMTP_USER", "no-reply@bizcheck.md")
        msg = es._build_message(
            to_email="client@x.md", subject="Raport", html_body="<b>hi</b>",
            text_body="hi", pdf_bytes=b"%PDF-1.4 data", pdf_filename="r.pdf")
        assert msg["To"] == "client@x.md"
        assert msg["Subject"] == "Raport"
        # Message-ID domain aligns with the From address (DKIM/DMARC).
        assert "bizcheck.md" in msg["Message-ID"]
        # A PDF attachment is present.
        assert any(p.get_filename() == "r.pdf" for p in msg.iter_attachments())

    def test_build_message_without_pdf_has_no_attachment(self, monkeypatch):
        from services import email_service as es
        monkeypatch.setenv("SMTP_USER", "no-reply@bizcheck.md")
        msg = es._build_message(
            to_email="c@x.md", subject="s", html_body="<b>h</b>",
            text_body="h", pdf_bytes=b"", pdf_filename="r.pdf")
        assert list(msg.iter_attachments()) == []


# ---------------------------------------------------------------------------
# telegram_send — configuration gate (no real network)
# ---------------------------------------------------------------------------
class TestTelegramSend:
    def test_not_configured_returns_error(self, monkeypatch):
        from services import telegram_send as ts
        monkeypatch.delenv("TELEGRAM_BOT_TOKEN", raising=False)
        ok, err = ts.send_message(123, "hi")
        assert ok is False
        assert "not configured" in err

    def test_is_configured_reflects_env(self, monkeypatch):
        from services import telegram_send as ts
        monkeypatch.setenv("TELEGRAM_BOT_TOKEN", "abc")
        assert ts.is_configured() is True
        monkeypatch.delenv("TELEGRAM_BOT_TOKEN", raising=False)
        assert ts.is_configured() is False
