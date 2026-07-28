"""Unit tests for the length-limit behavior on authored content.

Before: `clean_content` truncated at the column width and the route answered
HTTP 200 — a 405-character block title was stored as 255 and the admin who
typed it was told nothing. Silent data loss on manually authored quiz copy.

After: the ADMIN authored-content write paths use `clean_authored` /
`clean_authored_optional`, which raise `TextTooLong`; middleware/errors.py maps
that to a 400 naming the field, the limit and the length.

The PUBLIC write paths (PATCH /submissions, the nested answers_json /
block_scores_json walk in `clean_json_content`) must KEEP truncating — a
visitor's quiz must never fail because a machine-generated payload grew. Those
invariants are asserted here too, because losing them is the real risk of this
change.

No DB, no running backend.
"""
import os
import sys

import jwt
import pytest
from flask import Flask

_HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(_HERE))

CSRF = "unit-csrf"


def _admin_jwt():
    return jwt.encode({"role": "admin"}, os.environ["JWT_SECRET"], algorithm="HS256")


def _client(*blueprints):
    from middleware.errors import register_error_handlers
    app = Flask(__name__)
    for bp in blueprints:
        app.register_blueprint(bp)
    register_error_handlers(app)
    c = app.test_client()
    c.set_cookie(key="admin_session", value=_admin_jwt(), domain="localhost")
    c.set_cookie(key="admin_csrf", value=CSRF, domain="localhost")
    return c


def _hdr():
    return {"X-CSRF-Token": CSRF}


# ---------------------------------------------------------------------------
# A. The validator itself
# ---------------------------------------------------------------------------

class TestStrictValidator:

    def test_over_the_limit_raises_instead_of_truncating(self):
        from utils.validators import clean_authored, TextTooLong
        with pytest.raises(TextTooLong):
            clean_authored("я" * 405, 255, "title_uk")

    def test_exactly_at_the_limit_is_accepted(self):
        from utils.validators import clean_authored
        assert len(clean_authored("я" * 255, 255, "title_uk")) == 255

    def test_error_names_the_field_the_limit_and_the_length(self):
        from utils.validators import clean_authored, TextTooLong
        with pytest.raises(TextTooLong) as ei:
            clean_authored("я" * 405, 255, "title_uk")
        err = ei.value
        assert err.field == "title_uk"
        assert err.limit == 255
        assert err.length == 405
        assert err.submitted_length == 405
        assert "title_uk" in str(err) and "255" in str(err)

    def test_to_dict_is_json_safe_and_carries_no_user_text(self):
        from utils.validators import clean_authored, TextTooLong
        secret = "СЕКРЕТНИЙ ТЕКСТ " * 60
        with pytest.raises(TextTooLong) as ei:
            clean_authored(secret, 100, "description_uk")
        payload = ei.value.to_dict()
        assert payload["code"] == "field_too_long"
        assert payload["field"] == "description_uk"
        assert payload["limit"] == 100
        assert "СЕКРЕТНИЙ" not in payload["error"]

    def test_length_is_measured_AFTER_sanitization(self):
        """Markup that bleach strips must not push a legitimate value over."""
        from utils.validators import clean_authored
        value = "<b>" * 200 + "Блок II — Внутрішній контроль" + "</b>" * 200
        assert clean_authored(value, 255, "title_uk") == "Блок II — Внутрішній контроль"

    def test_submitted_length_survives_the_raw_input_cap(self):
        """_cap_raw_input cuts the raw string before bleach; the reported
        submitted_length must still be the size the client actually sent."""
        from utils.validators import clean_authored, TextTooLong
        with pytest.raises(TextTooLong) as ei:
            clean_authored("x" * 100_000, 255, "title_uk")
        assert ei.value.submitted_length == 100_000

    def test_optional_variant_rejects_too_and_still_maps_empty_to_none(self):
        from utils.validators import clean_authored_optional, TextTooLong
        assert clean_authored_optional("", 50, "category") is None
        with pytest.raises(TextTooLong):
            clean_authored_optional("x" * 51, 50, "category")

    def test_text_too_long_is_not_a_valueerror(self):
        """Admin routes wrap their bodies in `except ValueError` to emit a
        generic 400 with str(e). If TextTooLong were a ValueError, the
        structured field/limit payload would be flattened away."""
        from utils.validators import TextTooLong
        assert not issubclass(TextTooLong, ValueError)


class TestLenientPathsUnchanged:
    """The public / machine-generated paths must still truncate silently."""

    def test_clean_text_still_truncates_by_default(self):
        from utils.validators import clean_text
        assert len(clean_text("x" * 1000, 50)) == 50

    def test_clean_content_still_truncates_by_default(self):
        from utils.validators import clean_content
        assert len(clean_content("я" * 50_000, 10_000)) == 10_000

    def test_nested_json_walk_truncates_and_never_raises(self):
        from utils.validators import clean_json_content
        out = clean_json_content({"b1q1": "x" * 5_000}, 100)
        assert len(out["b1q1"]) == 100


# ---------------------------------------------------------------------------
# B. The HTTP behavior on the admin write paths
# ---------------------------------------------------------------------------

@pytest.fixture
def blocks_client(monkeypatch):
    from routes import blocks as mod
    monkeypatch.setattr(mod, "create_block",
                        lambda *a, **kw: {"id": 1, "title_uk": "ok"})
    monkeypatch.setattr(mod, "update_block",
                        lambda *a, **kw: {"id": 1, "title_uk": "ok"})
    return _client(mod.blocks_bp)


@pytest.fixture
def questions_client(monkeypatch):
    from routes import questions as mod
    monkeypatch.setattr(mod, "create_question", lambda *a, **kw: {"id": 1})
    monkeypatch.setattr(mod, "update_question", lambda *a, **kw: {"id": 1})
    return _client(mod.questions_bp)


_BLOCKS = "/api_crowe_bizcheck/blocks"
_QUESTIONS = "/api_crowe_bizcheck/questions"


class TestAdminRoutesReject:

    def test_405_char_title_is_a_400_not_a_silent_200(self, blocks_client):
        r = blocks_client.post(_BLOCKS, headers=_hdr(),
                               json={"test_id": 1, "title_uk": "я" * 405, "title_en": ""})
        assert r.status_code == 400
        body = r.get_json()
        assert body["code"] == "field_too_long"
        assert body["field"] == "title_uk"
        assert body["limit"] == 255
        assert body["length"] == 405

    def test_a_normal_title_still_saves(self, blocks_client):
        r = blocks_client.post(_BLOCKS, headers=_hdr(),
                               json={"test_id": 1,
                                     "title_uk": "Блок II — «Внутрішній контроль»",
                                     "title_en": "Block II"})
        assert r.status_code == 201

    def test_update_rejects_too(self, blocks_client):
        r = blocks_client.put(f"{_BLOCKS}/1", headers=_hdr(),
                              json={"title_en": "x" * 256})
        assert r.status_code == 400
        assert r.get_json()["field"] == "title_en"

    def test_question_text_over_max_long_is_rejected(self, questions_client):
        r = questions_client.post(_QUESTIONS, headers=_hdr(),
                                  json={"block_id": 1, "text_uk": "я" * 10_001})
        assert r.status_code == 400
        assert r.get_json()["field"] == "text_uk"

    def test_a_long_but_legal_question_is_accepted(self, questions_client):
        """The largest authored question in the production dump is 282 chars
        against a 10 000 limit — real content must be nowhere near a 400."""
        r = questions_client.post(_QUESTIONS, headers=_hdr(),
                                  json={"block_id": 1, "text_uk": "я" * 9_999})
        assert r.status_code == 201

    def test_the_offending_answer_index_is_named(self, questions_client):
        r = questions_client.post(_QUESTIONS, headers=_hdr(), json={
            "block_id": 1, "text_uk": "Питання",
            "answers": [{"text_uk": "Так", "score": 1},
                        {"text_uk": "я" * 10_001, "score": 0}],
        })
        assert r.status_code == 400
        assert r.get_json()["field"] == "answers[1].text_uk"

    def test_rejection_happens_before_anything_is_written(self, monkeypatch):
        from routes import blocks as mod
        calls = []
        monkeypatch.setattr(mod, "create_block",
                            lambda *a, **kw: calls.append(a) or {"id": 1})
        c = _client(mod.blocks_bp)
        c.post(_BLOCKS, headers=_hdr(),
               json={"test_id": 1, "title_uk": "я" * 405})
        assert calls == []

    def test_still_requires_auth_before_validating(self, monkeypatch):
        """The 400 must not become an unauthenticated oracle."""
        from routes import blocks as mod
        from middleware.errors import register_error_handlers
        app = Flask(__name__)
        app.register_blueprint(mod.blocks_bp)
        register_error_handlers(app)
        r = app.test_client().post(_BLOCKS, json={"test_id": 1, "title_uk": "я" * 405})
        assert r.status_code == 401


class TestPublicSubmissionPathStillTruncates:
    """PATCH /submissions is reachable by any visitor holding a submission
    token; it must never start 400-ing because a payload grew."""

    def test_long_sector_is_truncated_not_rejected(self, monkeypatch):
        from routes import submissions as mod
        seen = {}

        def fake_update(sub_id, data):
            seen.update(data)
            return {"id": sub_id, "status": "started"}

        monkeypatch.setattr(mod, "update_submission", fake_update)
        monkeypatch.setattr("models.submission.Submission.find_id_by_token",
                            staticmethod(lambda sid, tok: sid))

        app = Flask(__name__)
        app.register_blueprint(mod.submissions_bp)
        from middleware.errors import register_error_handlers
        register_error_handlers(app)

        r = app.test_client().patch(
            "/api_crowe_bizcheck/submissions/5",
            headers={"X-Submission-Token": "t" * 32},
            json={"sector": "s" * 5_000},
        )
        assert r.status_code == 200
        assert len(seen["sector"]) < 5_000
