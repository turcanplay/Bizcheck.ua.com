"""
Unit tests — write-path sanitization for the ADMIN CONTENT routes.

CLAUDE.md: "Every user-supplied free-text field on a write path must go through
utils/validators.clean_text or clean_optional". routes/content.py did;
routes/blocks.py, routes/questions.py, routes/tests.py and routes/templates.py
did NOT — they wrote raw admin strings straight to Postgres. Since the whole
quiz is authored by hand through the admin panel and those rows are re-emitted
by the PDF report, the Excel export and Telegram messages (none of which escape
HTML), an unsanitized row is a stored-XSS / broken-output vector.

Two properties are pinned for every repaired route:
  1. markup and control characters are removed before the service layer sees
     the payload;
  2. realistic Ukrainian quiz copy — «lapki», the ’ apostrophe, em dashes, %,
     ₴, Roman numerals, and the comparison operators `<` / `>` / `&` — survives
     BYTE-FOR-BYTE. (2) is the reason clean_content exists next to clean_text:
     bleach entity-escapes the leftovers, so plain clean_text would have turned
     "оборот < 500 000 грн" into "оборот &lt; 500 000 грн" in the report.

No running backend and no database: the blueprints are mounted on a bare Flask
app and the service layer is replaced by recorders.

Run with:
    cd webdev/backend
    venv/bin/python -m pytest tests/test_unit_content_sanitization.py -v
"""
import os
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(_HERE))

from html.parser import HTMLParser

import jwt
import pytest
from flask import Flask

# --- realistic Ukrainian quiz copy -----------------------------------------
UK_TITLE = "Блок II — «Внутрішній контроль» та ризики"
UK_QUESTION = (
    "Чи має ваша компанія письмовий обов’язок керівника — «регламент» — "
    "переглянутий у III кварталі, з бюджетом 1 500 ₴ (20% від обороту)?"
)
UK_WITH_OPERATORS = "Оборот < 500 000 грн і > 100 000 грн, напрям R&D"

XSS = "<script>alert(1)</script>Реальний текст<img src=x onerror=alert(2)>"
XSS_CLEAN = "alert(1)Реальний текст"

CSRF = "unit-csrf"


def _admin_jwt():
    return jwt.encode({"role": "admin"}, os.environ["JWT_SECRET"], algorithm="HS256")


def _client(*blueprints):
    app = Flask(__name__)
    for bp in blueprints:
        app.register_blueprint(bp)
    c = app.test_client()
    c.set_cookie(key="admin_session", value=_admin_jwt(), domain="localhost")
    c.set_cookie(key="admin_csrf", value=CSRF, domain="localhost")
    return c


def _hdr():
    return {"X-CSRF-Token": CSRF}


class _TagFinder(HTMLParser):
    """Independent oracle: which HTML elements does a real parser see?"""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.tags = []

    def handle_starttag(self, tag, attrs):
        self.tags.append(tag)

    def handle_startendtag(self, tag, attrs):
        self.tags.append(tag)

    def handle_endtag(self, tag):
        self.tags.append(tag)


def _tags_in(text):
    p = _TagFinder()
    p.feed(text)
    p.close()
    return p.tags


class _Recorder:
    """Stands in for a service function: records the call, returns a dummy row."""

    def __init__(self, result=None):
        self.args = None
        self.kwargs = None
        self.result = result if result is not None else {"id": 1}

    def __call__(self, *args, **kwargs):
        self.args, self.kwargs = args, kwargs
        return dict(self.result)


# ---------------------------------------------------------------------------
# A. The sanitizer itself
# ---------------------------------------------------------------------------

class TestCleanContent:

    def test_strips_markup(self):
        from utils.validators import clean_content
        assert clean_content(XSS) == XSS_CLEAN

    def test_removes_control_chars(self):
        from utils.validators import clean_content
        out = clean_content("Контроль\x00\x01\x1f X\tY\nZ")
        for bad in ("\x00", "\x01", "\x1f"):
            assert bad not in out
        assert "\t" in out and "\n" in out

    @pytest.mark.parametrize("text", [UK_TITLE, UK_QUESTION, UK_WITH_OPERATORS])
    def test_ukrainian_copy_survives_unchanged(self, text):
        """« » ’ — % ₴ III  and the < > & operators must round-trip exactly."""
        from utils.validators import clean_content
        assert clean_content(text) == text

    def test_clean_text_would_have_mangled_the_operators(self):
        """Documents WHY clean_content exists — clean_text escapes < > &."""
        from utils.validators import clean_text, clean_content
        assert clean_text(UK_WITH_OPERATORS) != UK_WITH_OPERATORS
        assert "&lt;" in clean_text(UK_WITH_OPERATORS)
        assert clean_content(UK_WITH_OPERATORS) == UK_WITH_OPERATORS

    @pytest.mark.parametrize("payload", [
        "&lt;script&gt;alert(1)&lt;/script&gt;",
        "&#60;script&#62;alert(1)&#60;/script&#62;",
        "&#x3c;script&#x3e;alert(1)&#x3c;/script&#x3e;",
        "&amp;lt;script&amp;gt;alert(1)&amp;lt;/script&amp;gt;",
        "&amp;#60;script&amp;#62;",
        "&lt;img src=x onerror=alert(1)&gt;",
        # bleach strips the inner tag and leaves the outer halves behind — the
        # payload that broke the naive "bleach once, then unescape once" version.
        "<<script>script>alert(1)<</script>/script>",
        "<scr<script>ipt>alert(1)</scr</script>ipt>",
    ])
    def test_encoded_and_nested_markup_is_stripped_not_revived(self, payload):
        """Entity-encoded / nested payloads must be STRIPPED, never revived.

        This is why _strip_to_plain_text iterates to a fixed point instead of
        unescaping once: bleach resolves entities internally and re-escapes its
        leftovers, so a single undo hands back a live tag.
        """
        from utils.validators import clean_content
        assert _tags_in(clean_content(payload)) == []

    def test_lone_angle_bracket_is_not_a_tag(self):
        from utils.validators import clean_content
        assert clean_content("бюджет <3 млн та >2 млн") == "бюджет <3 млн та >2 млн"

    def test_fuzz_never_leaves_a_parsable_tag(self):
        """Oracle check: an HTML parser must find ZERO elements in the output."""
        import random
        from utils.validators import clean_content

        random.seed(1)
        alphabet = '<>&;/ script alertimgsvgonerror="1lt gt amp #x603ab'
        for _ in range(3_000):
            payload = "".join(
                random.choice(alphabet) for _ in range(random.randint(1, 60))
            )
            assert _tags_in(clean_content(payload)) == [], payload

    def test_optional_returns_none_when_empty(self):
        from utils.validators import clean_content_optional
        assert clean_content_optional("") is None
        assert clean_content_optional("<b></b>") is None
        assert clean_content_optional(UK_TITLE) == UK_TITLE

    def test_truncates_to_cap(self):
        from utils.validators import clean_content
        assert len(clean_content("я" * 50_000, 10_000)) == 10_000


class TestCleanJsonContent:

    def test_sanitizes_nested_strings_only(self):
        from utils.validators import clean_json_content
        out = clean_json_content({
            "blocks": [{"title": XSS, "score": 87.5, "passed": True, "note": None}],
            "count": 3,
        })
        assert out["blocks"][0]["title"] == XSS_CLEAN
        assert out["blocks"][0]["score"] == 87.5          # still a float
        assert out["blocks"][0]["passed"] is True         # still a bool
        assert out["blocks"][0]["note"] is None
        assert out["count"] == 3

    def test_keeps_ukrainian_labels(self):
        from utils.validators import clean_json_content
        out = clean_json_content([{"title": UK_TITLE, "score": 4}])
        assert out[0]["title"] == UK_TITLE

    def test_depth_guard_does_not_recurse_forever(self):
        from utils.validators import clean_json_content
        deep = cur = {}
        for _ in range(60):
            cur["n"] = {}
            cur = cur["n"]
        assert clean_json_content(deep) is not None       # no RecursionError


# ---------------------------------------------------------------------------
# A2. Resource bounds — the sanitizer must not be a CPU-exhaustion lever
# ---------------------------------------------------------------------------
# bleach's HTML parser is SUPERLINEAR in the input length. Measured on this
# machine, clean_content("<>" * n):
#     40 000 chars -> 0.30 s        400 000 chars ->  4.4 s
#    800 000 chars -> 12.6 s      1 600 000 chars -> ~40 s
# Truncation to max_len happens at the END of clean_text, so the WHOLE raw input
# was being parsed first. server.py allows a 25 MB request body and
# routes/submissions.py PATCH — reachable by anyone, the submission_token is
# handed out by the public POST — pushes free text AND every string inside
# answers_json / block_scores_json / selected_answers_json through the
# sanitizer. 60 PATCHes per minute per IP are allowed (server.py), so a single
# unauthenticated client could pin a gunicorn worker indefinitely.
#
# The fix is to cap the RAW input before it reaches the parser, and to cap the
# total amount of text one clean_json_content() walk may sanitize.

class TestSanitizerResourceBounds:

    def test_raw_input_is_capped_before_it_reaches_bleach(self, monkeypatch):
        """No single bleach call may see an unbounded string."""
        from utils import validators as v

        seen = []
        real = v._bleach

        def spy(value):
            seen.append(len(value))
            return real(value)

        monkeypatch.setattr(v, "_bleach", spy)
        v.clean_content("<>" * 500_000, v.MAX_LONG)          # 1 MB of markup
        assert seen, "bleach was never called"
        assert max(seen) <= v.MAX_LONG * 8, (
            f"bleach was handed {max(seen)} chars for a {v.MAX_LONG}-char field"
        )

    def test_multi_megabyte_field_stays_fast(self):
        """A 4 MB body must not cost seconds of CPU (it cost ~60 s before)."""
        import time
        from utils.validators import clean_content, MAX_LONG

        t0 = time.perf_counter()
        clean_content("<>" * 2_000_000, MAX_LONG)
        assert time.perf_counter() - t0 < 2.0

    def test_json_walk_has_a_total_text_budget(self):
        """Many big strings in one payload must not multiply the parser cost."""
        import time
        from utils.validators import clean_json_content

        payload = {f"k{i}": "<>" * 200_000 for i in range(20)}   # ~8 MB
        t0 = time.perf_counter()
        clean_json_content(payload)
        assert time.perf_counter() - t0 < 2.0

    def test_the_cap_never_touches_realistic_authored_copy(self):
        """Anything a human actually types is far below the cap."""
        from utils.validators import clean_content, MAX_TITLE, MAX_LONG

        # .strip() trims the outer whitespace, so build the paragraphs joined.
        long_but_real = "\n\n".join([UK_QUESTION] * 60)       # ~8 000 chars
        assert clean_content(long_but_real, MAX_LONG) == long_but_real
        assert clean_content(UK_TITLE, MAX_TITLE) == UK_TITLE

    def test_the_cap_does_not_weaken_stripping(self):
        """Cutting the input can only produce a DIFFERENT string to sanitize."""
        from utils.validators import clean_content, MAX_LONG

        payload = ("a" * 100_000) + "<script>alert(1)</script>"
        assert _tags_in(clean_content(payload, MAX_LONG)) == []


# ---------------------------------------------------------------------------
# B. routes/blocks.py
# ---------------------------------------------------------------------------

class TestBlocksRoute:

    @pytest.fixture
    def env(self, monkeypatch):
        import routes.blocks as mod
        create, update = _Recorder(), _Recorder()
        monkeypatch.setattr(mod, "create_block", create)
        monkeypatch.setattr(mod, "update_block", update)
        return _client(mod.blocks_bp), create, update

    def test_create_strips_markup(self, env):
        c, create, _ = env
        r = c.post("/api_crowe_bizcheck/blocks", json={
            "test_id": 1, "title_uk": XSS, "title_en": "<b>Block</b>", "order_index": 2,
        }, headers=_hdr())
        assert r.status_code == 201
        test_id, title_uk, title_en, order_index = create.args
        assert title_uk == XSS_CLEAN
        assert title_en == "Block"
        assert (test_id, order_index) == (1, 2)

    def test_create_keeps_ukrainian_title(self, env):
        c, create, _ = env
        c.post("/api_crowe_bizcheck/blocks",
               json={"test_id": 1, "title_uk": UK_TITLE, "title_en": UK_WITH_OPERATORS},
               headers=_hdr())
        assert create.args[1] == UK_TITLE
        assert create.args[2] == UK_WITH_OPERATORS

    def test_create_rejects_non_numeric_order_index(self, env):
        c, create, _ = env
        r = c.post("/api_crowe_bizcheck/blocks",
                   json={"test_id": 1, "title_uk": "X", "order_index": "abc"},
                   headers=_hdr())
        assert r.status_code == 400
        assert create.args is None

    def test_update_strips_markup(self, env):
        c, _, update = env
        r = c.put("/api_crowe_bizcheck/blocks/7",
                  json={"title_uk": XSS, "title_en": UK_TITLE}, headers=_hdr())
        assert r.status_code == 200
        assert update.args[1] == XSS_CLEAN
        assert update.args[2] == UK_TITLE

    def test_update_leaves_untouched_fields_as_none(self, env):
        c, _, update = env
        c.put("/api_crowe_bizcheck/blocks/7", json={"order_index": 3}, headers=_hdr())
        assert update.args[1] is None and update.args[2] is None
        assert update.args[3] == 3


# ---------------------------------------------------------------------------
# C. routes/questions.py  (incl. the nested answers)
# ---------------------------------------------------------------------------

class TestQuestionsRoute:

    @pytest.fixture
    def env(self, monkeypatch):
        import routes.questions as mod
        create, update = _Recorder(), _Recorder()
        monkeypatch.setattr(mod, "create_question", create)
        monkeypatch.setattr(mod, "update_question", update)
        return _client(mod.questions_bp), create, update

    def _payload(self, **over):
        base = {
            "block_id": 3,
            "text_uk": XSS,
            "text_en": "Question",
            "note_uk": "<i>Примітка</i>",
            "order_index": 1,
            "answers": [
                {"text_uk": "<b>Так</b>", "text_en": "Yes", "score": 3.33},
                {"text_uk": "Ні", "text_en": "No", "score": 0},
            ],
        }
        base.update(over)
        return base

    def test_create_sanitizes_text_and_notes(self, env):
        c, create, _ = env
        r = c.post("/api_crowe_bizcheck/questions", json=self._payload(), headers=_hdr())
        assert r.status_code == 201
        block_id, text_uk, text_en, note_uk, note_en, order_index, answers, parent = create.args
        assert text_uk == XSS_CLEAN
        assert note_uk == "Примітка"
        assert note_en is None            # optional field stays None, not ""
        assert (block_id, order_index, parent) == (3, 1, None)

    def test_create_sanitizes_nested_answers(self, env):
        c, create, _ = env
        c.post("/api_crowe_bizcheck/questions",
               json=self._payload(answers=[
                   {"text_uk": XSS, "text_en": "Yes", "score": "2.5",
                    "next_question_id": "9"},
                   {"text_uk": UK_WITH_OPERATORS, "text_en": "No"},
               ]), headers=_hdr())
        answers = create.args[6]
        assert answers[0]["text_uk"] == XSS_CLEAN
        assert answers[0]["score"] == 2.5            # coerced, NOT rounded away
        assert answers[0]["next_question_id"] == 9
        assert answers[1]["text_uk"] == UK_WITH_OPERATORS
        assert answers[1]["score"] == 0.0
        assert answers[1]["next_question_id"] is None

    def test_create_keeps_ukrainian_question(self, env):
        c, create, _ = env
        c.post("/api_crowe_bizcheck/questions",
               json=self._payload(text_uk=UK_QUESTION, note_uk=UK_WITH_OPERATORS),
               headers=_hdr())
        assert create.args[1] == UK_QUESTION
        assert create.args[3] == UK_WITH_OPERATORS

    def test_create_rejects_non_numeric_score(self, env):
        c, create, _ = env
        r = c.post("/api_crowe_bizcheck/questions",
                   json=self._payload(answers=[{"text_uk": "a", "text_en": "a",
                                                "score": "not-a-number"}]),
                   headers=_hdr())
        assert r.status_code == 400
        assert create.args is None

    def test_create_rejects_malformed_answer_object(self, env):
        c, create, _ = env
        r = c.post("/api_crowe_bizcheck/questions",
                   json=self._payload(answers=["just a string"]), headers=_hdr())
        assert r.status_code == 400
        assert create.args is None

    def test_update_sanitizes_text_and_answers(self, env):
        c, _, update = env
        r = c.put("/api_crowe_bizcheck/questions/12", json={
            "text_uk": XSS,
            "answers": [{"text_uk": XSS, "text_en": UK_TITLE, "score": 1}],
        }, headers=_hdr())
        assert r.status_code == 200
        assert update.args[2] == XSS_CLEAN
        answers = update.args[7]
        assert answers[0]["text_uk"] == XSS_CLEAN
        assert answers[0]["text_en"] == UK_TITLE

    def test_update_without_answers_passes_none(self, env):
        c, _, update = env
        c.put("/api_crowe_bizcheck/questions/12", json={"text_uk": UK_QUESTION},
              headers=_hdr())
        assert update.args[2] == UK_QUESTION
        assert update.args[7] is None      # "don't touch the answers"


# ---------------------------------------------------------------------------
# D. routes/tests.py
# ---------------------------------------------------------------------------

class TestTestsRoute:

    @pytest.fixture
    def env(self, monkeypatch):
        import routes.tests as mod
        create, update = _Recorder(), _Recorder()
        monkeypatch.setattr(mod, "create_test", create)
        monkeypatch.setattr(mod, "update_test", update)
        return _client(mod.admin_tests_bp), create, update

    def test_create_sanitizes_all_free_text(self, env):
        c, create, _ = env
        r = c.post("/api_crowe_bizcheck/admin/tests", json={
            "slug": "GDPR-Test",
            "name_uk": XSS,
            "description_uk": "<p>Опис</p>",
            "category": "<b>Аудит</b>",
            "features": ["<i>Перша</i>", UK_WITH_OPERATORS],
        }, headers=_hdr())
        assert r.status_code == 201
        kw = create.kwargs
        assert kw["slug"] == "gdpr-test"           # clean_slug lower-cases
        assert kw["name_uk"] == XSS_CLEAN
        assert kw["description_uk"] == "Опис"
        assert kw["category"] == "Аудит"
        assert kw["features"] == ["Перша", UK_WITH_OPERATORS]

    def test_create_keeps_ukrainian_name_and_description(self, env):
        c, create, _ = env
        c.post("/api_crowe_bizcheck/admin/tests",
               json={"name_uk": UK_TITLE, "description_uk": UK_QUESTION},
               headers=_hdr())
        assert create.kwargs["name_uk"] == UK_TITLE
        assert create.kwargs["description_uk"] == UK_QUESTION

    def test_create_rejects_bad_slug(self, env):
        c, create, _ = env
        r = c.post("/api_crowe_bizcheck/admin/tests",
                   json={"slug": "../../etc/passwd", "name_uk": "X"}, headers=_hdr())
        assert r.status_code == 400
        assert create.kwargs is None

    def test_empty_slug_is_left_for_auto_generation(self, env):
        c, create, _ = env
        c.post("/api_crowe_bizcheck/admin/tests", json={"name_uk": "X"}, headers=_hdr())
        assert create.kwargs["slug"] == ""

    def test_scoring_zones_stay_numeric(self, env):
        c, create, _ = env
        c.post("/api_crowe_bizcheck/admin/tests", json={
            "name_uk": "X",
            "scoring_zones": {"safe": 80, "developing": "70", "warn": 65,
                              "risk": 0, "evil": "<script>x</script>"},
        }, headers=_hdr())
        zones = create.kwargs["scoring_zones"]
        assert zones == {"safe": 80.0, "developing": 70.0, "warn": 65.0, "risk": 0.0}
        assert "evil" not in zones

    def test_zone_recommendations_are_sanitized_recursively(self, env):
        c, create, _ = env
        c.post("/api_crowe_bizcheck/admin/tests", json={
            "name_uk": "X",
            "zone_recommendations": {
                "safe": {"title": XSS, "items": [UK_WITH_OPERATORS], "min": 80},
            },
        }, headers=_hdr())
        zr = create.kwargs["zone_recommendations"]
        assert zr["safe"]["title"] == XSS_CLEAN
        assert zr["safe"]["items"] == [UK_WITH_OPERATORS]
        assert zr["safe"]["min"] == 80

    def test_booleans_are_coerced_not_truthy_strings(self, env):
        c, create, _ = env
        c.post("/api_crowe_bizcheck/admin/tests",
               json={"name_uk": "X", "is_active": "false", "is_paid": "true"},
               headers=_hdr())
        assert create.kwargs["is_active"] is False
        assert create.kwargs["is_paid"] is True

    def test_update_sanitizes_and_preserves_key_presence(self, env):
        c, _, update = env
        r = c.put("/api_crowe_bizcheck/admin/tests/4",
                  json={"name_uk": XSS, "description_uk": UK_QUESTION}, headers=_hdr())
        assert r.status_code == 200
        payload = update.args[1]
        assert payload["name_uk"] == XSS_CLEAN
        assert payload["description_uk"] == UK_QUESTION
        # keys that were not sent must NOT appear — the service uses `in data`
        # to decide between "clear it" and "keep the stored value".
        assert "features" not in payload
        assert "price" not in payload


# ---------------------------------------------------------------------------
# E. routes/templates.py
# ---------------------------------------------------------------------------

class TestTemplatesRoute:

    @pytest.fixture
    def env(self, monkeypatch):
        import routes.templates as mod
        create, update = _Recorder(), _Recorder()
        monkeypatch.setattr(mod, "create_template", create)
        monkeypatch.setattr(mod, "update_template", update)
        return _client(mod.admin_templates_bp), create, update

    def test_create_sanitizes_free_text(self, env):
        c, create, _ = env
        r = c.post("/api_crowe_bizcheck/admin/templates", json={
            "slug": "nda_ua",
            "title_uk": XSS,
            "description_uk": "<div>Опис шаблону</div>",
            "category": "<b>Договори</b>",
            "features": "<i>Пункт</i>",
        }, headers=_hdr())
        assert r.status_code == 201
        kw = create.kwargs
        assert kw["title_uk"] == XSS_CLEAN
        assert kw["description_uk"] == "Опис шаблону"
        assert kw["category"] == "Договори"
        assert kw["features"] == "Пункт"

    def test_create_keeps_ukrainian_title(self, env):
        c, create, _ = env
        c.post("/api_crowe_bizcheck/admin/templates",
               json={"title_uk": UK_TITLE, "description_uk": UK_WITH_OPERATORS},
               headers=_hdr())
        assert create.kwargs["title_uk"] == UK_TITLE
        assert create.kwargs["description_uk"] == UK_WITH_OPERATORS

    def test_update_sanitizes_and_preserves_key_presence(self, env):
        c, _, update = env
        c.put("/api_crowe_bizcheck/admin/templates/2",
              json={"title_uk": XSS}, headers=_hdr())
        payload = update.args[1]
        assert payload["title_uk"] == XSS_CLEAN
        assert "features" not in payload

    def test_upload_rejects_non_string_filename_without_500(self, env, monkeypatch):
        import routes.templates as mod
        monkeypatch.setattr(mod, "add_file", _Recorder())
        c, _, _u = env
        r = c.post("/api_crowe_bizcheck/admin/templates/2/files",
                   json={"filename": ["x"], "pdf": ""}, headers=_hdr())
        assert r.status_code == 400          # "PDF data is required", not a crash


# ---------------------------------------------------------------------------
# F. routes/submissions.py — the nested *_json payloads (PUBLIC write path)
# ---------------------------------------------------------------------------

class TestSubmissionJsonFields:

    @pytest.fixture
    def env(self, monkeypatch):
        import routes.submissions as mod
        import services.sales_notify as sales

        update = _Recorder({"id": 5})
        monkeypatch.setattr(mod, "update_submission", update)
        monkeypatch.setattr(mod, "get_submission_detail", lambda sid: {"id": sid})
        monkeypatch.setattr(sales, "maybe_notify_sales", lambda *a, **k: None)
        return _client(mod.submissions_bp), update

    def test_block_titles_are_sanitized(self, env):
        c, update = env
        r = c.patch("/api_crowe_bizcheck/submissions/5", json={
            "block_scores_json": [{"id": 1, "title": XSS, "score": 87.5}],
        }, headers=_hdr())
        assert r.status_code == 200
        sent = update.args[1]["block_scores_json"]
        assert sent[0]["title"] == XSS_CLEAN
        assert sent[0]["score"] == 87.5
        assert sent[0]["id"] == 1

    def test_ukrainian_block_title_survives(self, env):
        c, update = env
        c.patch("/api_crowe_bizcheck/submissions/5", json={
            "block_scores_json": [{"id": 1, "title": UK_TITLE, "score": 40}],
        }, headers=_hdr())
        assert update.args[1]["block_scores_json"][0]["title"] == UK_TITLE

    def test_plain_fields_keep_the_original_clean_text_behavior(self, env):
        """`sector` & co. still use clean_text — deliberately NOT switched over.

        They are picked from a fixed dropdown, so the entity escaping bleach
        applies to a stray `<`/`&` never shows up in practice, and leaving them
        alone keeps this change off the public quiz path.
        """
        c, update = env
        c.patch("/api_crowe_bizcheck/submissions/5",
                json={"sector": "R&D"}, headers=_hdr())
        assert update.args[1]["sector"] == "R&amp;D"

    def test_answer_scores_keep_their_types(self, env):
        c, update = env
        c.patch("/api_crowe_bizcheck/submissions/5", json={
            "answers_json": {"b1q2": 5, "b1q3": 0.5},
            "selected_answers_json": {"b1q2": "<b>Так</b>"},
        }, headers=_hdr())
        sent = update.args[1]
        assert sent["answers_json"] == {"b1q2": 5, "b1q3": 0.5}
        assert sent["selected_answers_json"] == {"b1q2": "Так"}


# ---------------------------------------------------------------------------
# G. routes/auth.py — the public register form
# ---------------------------------------------------------------------------

class TestAuthRegister:

    def test_username_is_sanitized_before_store(self, monkeypatch):
        import routes.auth as mod

        seen = {}

        def fake_register(username, email, password):
            seen["username"], seen["email"] = username, email
            return {"id": 1, "created_at": "now"}, "a", "r"

        monkeypatch.setattr(mod, "register_user", fake_register)
        c = _client(mod.auth_bp)
        r = c.post("/api_crowe_bizcheck/auth/register", json={
            "username": "<script>evil</script>Ivan",
            "email": "  IVAN@Example.COM ",
            "password": "sufficiently-long",
        })
        assert r.status_code == 201
        assert seen["username"] == "evilIvan"
        assert seen["email"] == "ivan@example.com"
