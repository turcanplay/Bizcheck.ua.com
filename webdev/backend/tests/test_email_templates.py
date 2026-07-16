"""Unit tests for services.email_templates.render — pure HTML/text builder."""
import pytest

from services import email_templates as et


class TestZoneHelpers:
    @pytest.mark.parametrize("score,color", [
        (95, "#16A34A"), (75, "#EAB308"), (67, "#F97316"), (10, "#DC2626"),
    ])
    def test_zone_color_boundaries(self, score, color):
        assert et._zone_color(score) == color

    def test_zone_label_uk_vs_ru(self):
        assert et._zone_label(90, "uk") == "Низький ризик"
        assert et._zone_label(90, "ru") == "Низкий риск"

    def test_zone_label_critical(self):
        assert et._zone_label(20, "uk") == "Критичний ризик"


class TestRender:
    def _render(self, **kw):
        base = dict(lang="uk", first_name="Ion", test_name="BizCheck",
                    date_str="2026-01-01", score=82,
                    logo_url="https://x/logo.png")
        base.update(kw)
        return et.render(**base)

    def test_returns_subject_html_text_triple(self):
        subject, html, text = self._render()
        assert isinstance(subject, str) and isinstance(html, str) and isinstance(text, str)
        assert "BizCheck" in subject

    def test_score_appears_in_html_and_text(self):
        _, html, text = self._render(score=82)
        assert "82" in html
        assert "82%" in text

    def test_download_button_present_when_url_given(self):
        _, html, text = self._render(download_url="https://x/report.pdf")
        assert "https://x/report.pdf" in html
        assert "Відкрити звіт PDF" in html
        assert "https://x/report.pdf" in text

    def test_no_download_shows_pending_note(self):
        _, html, text = self._render(download_url=None)
        assert "буде доступний найближчим часом" in html
        assert "буде доступний найближчим часом" in text

    def test_ru_language_switches_copy(self):
        subject, html, _ = self._render(lang="ru")
        assert "готов" in subject
        assert 'lang="ru"' in html

    def test_unknown_lang_falls_back_to_uk(self):
        subject, _, _ = self._render(lang="fr")
        assert "Ваш звіт" in subject

    def test_html_escapes_first_name(self):
        # A malicious first_name must not inject markup into the HTML body.
        _, html, _ = self._render(first_name="<script>alert(1)</script>")
        assert "<script>alert(1)</script>" not in html
        assert "&lt;script&gt;" in html

    def test_empty_first_name_uses_default_uk(self):
        _, html, _ = self._render(first_name="")
        assert "Клієнт" in html

    def test_empty_first_name_uses_default_ru(self):
        _, html, _ = self._render(lang="ru", first_name="")
        assert "Клиент" in html
