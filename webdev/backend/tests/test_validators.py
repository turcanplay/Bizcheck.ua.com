"""Unit tests for utils.validators — input sanitization & coercion helpers.

Pure functions, no DB. Complements the sanitization cases in
test_unit_security.py with full coverage of the numeric/slug/lang/bool helpers.
"""
import pytest

from utils import validators as v


class TestCleanText:
    def test_coerces_non_string(self):
        assert v.clean_text(123) == "123"

    def test_strips_surrounding_whitespace(self):
        assert v.clean_text("  hi  ") == "hi"

    def test_required_raises_on_none(self):
        with pytest.raises(ValueError):
            v.clean_text(None, allow_empty=False)

    def test_strip_html_false_keeps_tags(self):
        # When strip_html is disabled the tags survive (control chars still go).
        out = v.clean_text("<b>x</b>", strip_html=False)
        assert "<b>" in out

    def test_default_max_len_is_max_text(self):
        out = v.clean_text("a" * (v.MAX_TEXT + 500))
        assert len(out) == v.MAX_TEXT


class TestCleanOptional:
    def test_returns_value_when_present(self):
        assert v.clean_optional("hello") == "hello"

    def test_returns_none_when_blank(self):
        assert v.clean_optional("   ") is None


class TestCleanSlug:
    @pytest.mark.parametrize("good", ["abc", "a-b-c", "a_b", "test123", "x1"])
    def test_accepts_valid_slugs(self, good):
        assert v.clean_slug(good) == good

    def test_lowercases_and_strips(self):
        assert v.clean_slug("  ABC  ") == "abc"

    @pytest.mark.parametrize("bad", ["", "-abc", "abc-", "a b", "ünïcode", "a/b", "A!"])
    def test_rejects_invalid_slugs(self, bad):
        with pytest.raises(ValueError):
            v.clean_slug(bad)

    def test_rejects_single_char_out_of_class(self):
        # Regex requires start+end alnum; a lone "-" is invalid.
        with pytest.raises(ValueError):
            v.clean_slug("-")


class TestCleanInt:
    def test_parses_numeric_string(self):
        assert v.clean_int("42") == 42

    def test_rejects_non_numeric(self):
        with pytest.raises(ValueError):
            v.clean_int("abc")

    def test_rejects_none(self):
        with pytest.raises(ValueError):
            v.clean_int(None)

    def test_enforces_min(self):
        with pytest.raises(ValueError):
            v.clean_int(1, min_value=5)

    def test_enforces_max(self):
        with pytest.raises(ValueError):
            v.clean_int(10, max_value=5)

    def test_accepts_within_bounds(self):
        assert v.clean_int(5, min_value=1, max_value=10) == 5


class TestCleanFloat:
    def test_parses_and_rounds_to_one_decimal(self):
        assert v.clean_float("3.14") == 3.1

    def test_rejects_nan(self):
        with pytest.raises(ValueError):
            v.clean_float(float("nan"))

    def test_rejects_inf(self):
        with pytest.raises(ValueError):
            v.clean_float(float("inf"))

    def test_snaps_to_step(self):
        # 3.7 snapped to a 0.5 grid → 3.5
        assert v.clean_float(3.7, step=0.5) == 3.5

    def test_clamps_to_range(self):
        assert v.clean_float(9, min_value=1, max_value=5) == 5.0
        assert v.clean_float(-2, min_value=1, max_value=5) == 1.0

    def test_rejects_non_numeric(self):
        with pytest.raises(ValueError):
            v.clean_float("xyz")


class TestCleanLang:
    @pytest.mark.parametrize("val,expected", [("uk", "uk"), ("RU", "ru"), ("Uk", "uk")])
    def test_whitelisted(self, val, expected):
        assert v.clean_lang(val) == expected

    def test_unknown_falls_back_to_default(self):
        assert v.clean_lang("fr") == "uk"

    def test_custom_default(self):
        assert v.clean_lang("de", default="ru") == "ru"

    def test_none_is_default(self):
        assert v.clean_lang(None) == "uk"


class TestCleanBool:
    @pytest.mark.parametrize("val", [True, 1, "1", "true", "TRUE", "yes", "on"])
    def test_truthy(self, val):
        assert v.clean_bool(val) is True

    @pytest.mark.parametrize("val", [False, 0, "0", "false", "no", "", "random", None])
    def test_falsy(self, val):
        assert v.clean_bool(val) is False
