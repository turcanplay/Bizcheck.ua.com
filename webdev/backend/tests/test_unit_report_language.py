"""Language resolution for report delivery — no DB, no running backend.

Quiz/test content is entered by hand in the admin panel, so one of the two
translations is regularly blank. The report email must never end up with an
empty test name in its subject line just because the translation for the
recipient's language was not filled in.

Mirrors the frontend contract in src/i18n/pickLang.ts (and its Vitest suite):
prefer the requested language, fall back to the other one, and return "" only
when BOTH are blank.
"""

import pytest

from services.report_email import pick_lang
from services.email_templates import render as render_report_email
from services.block_service import create_block


# ---------------------------------------------------------------------------
# pick_lang
# ---------------------------------------------------------------------------

class TestPickLang:
    def test_returns_requested_language(self):
        row = {"name_uk": "Тест", "name_en": "Test"}
        assert pick_lang(row, "name", "uk") == "Тест"
        assert pick_lang(row, "name", "en") == "Test"

    def test_falls_back_when_requested_language_is_empty(self):
        assert pick_lang({"name_uk": "Тест", "name_en": ""}, "name", "en") == "Тест"
        assert pick_lang({"name_uk": "", "name_en": "Test"}, "name", "uk") == "Test"

    def test_falls_back_when_requested_language_is_none(self):
        assert pick_lang({"name_uk": "Тест", "name_en": None}, "name", "en") == "Тест"
        assert pick_lang({"name_uk": None, "name_en": "Test"}, "name", "uk") == "Test"

    def test_whitespace_only_counts_as_missing(self):
        assert pick_lang({"name_uk": "Тест", "name_en": "   "}, "name", "en") == "Тест"
        assert pick_lang({"name_uk": "\n\t ", "name_en": "Test"}, "name", "uk") == "Test"

    def test_empty_string_when_both_missing(self):
        assert pick_lang({"name_uk": "", "name_en": ""}, "name", "uk") == ""
        assert pick_lang({"name_uk": None, "name_en": None}, "name", "en") == ""
        assert pick_lang({"name_uk": None, "name_en": "  "}, "name", "uk") == ""

    def test_missing_column_and_missing_row(self):
        assert pick_lang({}, "name", "uk") == ""
        assert pick_lang(None, "name", "uk") == ""

    def test_unknown_language_is_treated_as_ukrainian(self):
        # submissions.language is a free VARCHAR; a legacy 'ro'/'ru' row must
        # still resolve to something rather than blowing up on a missing key.
        row = {"name_uk": "Тест", "name_en": "Test"}
        assert pick_lang(row, "name", "ro") == "Тест"
        assert pick_lang(row, "name", None) == "Тест"

    def test_language_matching_is_case_insensitive(self):
        row = {"name_uk": "Тест", "name_en": "Test"}
        assert pick_lang(row, "name", "EN") == "Test"

    def test_works_for_any_field_base(self):
        row = {"description_uk": "", "description_en": "Desc"}
        assert pick_lang(row, "description", "uk") == "Desc"


# ---------------------------------------------------------------------------
# The email itself must be built in the recipient's language.
# ---------------------------------------------------------------------------

class TestReportEmailLanguage:
    def _build(self, lang, test_name="Bizcheck"):
        return render_report_email(
            lang=lang,
            first_name="Ivan",
            test_name=test_name,
            date_str="1 January 2026",
            score=78,
            logo_url="https://example.ua/logo.png",
            download_url="https://example.ua/report.pdf?t=x",
        )

    def test_ukrainian_recipient_gets_ukrainian_body(self):
        subject, html, text = self._build("uk")
        assert 'lang="uk"' in html
        # Cyrillic content present, and the English greeting is not.
        assert any("Ѐ" <= ch <= "ӿ" for ch in subject + text)
        assert "Hello" not in text

    def test_english_recipient_gets_english_body(self):
        subject, html, text = self._build("en")
        assert 'lang="en"' in html
        assert not any("Ѐ" <= ch <= "ӿ" for ch in subject)

    def test_unknown_language_falls_back_to_ukrainian(self):
        _, html, _ = self._build("ro")
        assert 'lang="uk"' in html

    def test_test_name_is_carried_into_the_email(self):
        subject, html, text = self._build("en", test_name="HR Compliance")
        assert "HR Compliance" in subject or "HR Compliance" in html

    @pytest.mark.parametrize("lang", ["uk", "en"])
    def test_both_languages_produce_a_non_empty_subject(self, lang):
        subject, html, text = self._build(lang)
        assert subject.strip()
        assert html.strip()
        assert text.strip()


# ---------------------------------------------------------------------------
# Entering content in ONE language must be possible.
# ---------------------------------------------------------------------------

class TestSingleLanguageBlockCreation:
    """`create_block` used to demand BOTH titles while the route and the admin
    modal both advertised "at least one" — so a Ukrainian-only block (the normal
    first step of manual content entry) was impossible to save. The validation
    must reject only the both-blank case; it runs before any DB access."""

    def test_rejects_only_when_both_titles_are_blank(self):
        with pytest.raises(ValueError) as exc:
            create_block(test_id=1, title_uk="", title_en="   ")
        assert "at least one" in str(exc.value).lower()

    def test_rejects_missing_test_id_before_touching_the_db(self):
        with pytest.raises(ValueError) as exc:
            create_block(test_id=None, title_uk="Кадри", title_en="")
        assert "test_id" in str(exc.value)
