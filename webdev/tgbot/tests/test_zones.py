"""The bot's zone ladder must be the backend's, not one of its own.

`tests.scoring_zones` is edited from the admin panel and now travels in the
`/tg/report/<token>` payload. Before this, helpers._zone carried a third
hard-coded copy of 80/70/65, so an admin who moved the thresholds got one zone
on the website/email and a different one from the bot.

Pinned here:
  * custom thresholds actually change what the bot says;
  * the bot survives a backend that does not send them (independent deploys);
  * boundaries are inclusive — a score EQUAL to a threshold sits in the band
    above, exactly like services/scoring.zone_of;
  * a 0 is printed as 1% but stays in the risk zone.
"""
import importlib.util
import itertools
import os

import pytest

import helpers
import handlers
from helpers import (
    DEFAULT_ZONES, ZONE_EMOJI, _zone, display_pct, resolve_zones, zone_of,
)
from strings import _t

from conftest import FakeContext, FakeResponse, FakeUpdate

from test_bot import TOKEN, _report_payload


CUSTOM = {"safe": 50, "developing": 40, "warn": 30, "risk": 0}


def _backend_scoring():
    """Import webdev/backend/services/scoring.py directly, or None.

    By file path and with no package import: the module is pure stdlib, and the
    bot's image does not ship the backend, so this only runs in the repo.
    """
    path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        "backend", "services", "scoring.py",
    )
    if not os.path.exists(path):
        return None
    spec = importlib.util.spec_from_file_location("_backend_scoring", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


# ---------------------------------------------------------------------------
# resolve_zones — must behave like the backend's read path, and never raise
# ---------------------------------------------------------------------------

class TestResolveZones:
    def test_none_gives_the_defaults(self):
        assert resolve_zones(None) == DEFAULT_ZONES

    @pytest.mark.parametrize("bad", ["80", 42, [], True, object()])
    def test_non_dict_gives_the_defaults(self, bad):
        assert resolve_zones(bad) == DEFAULT_ZONES

    def test_valid_custom_set_is_kept(self):
        assert resolve_zones(CUSTOM) == \
            {"safe": 50.0, "developing": 40.0, "warn": 30.0, "risk": 0.0}

    def test_missing_keys_fall_back_individually(self):
        assert resolve_zones({"safe": 95, "developing": 60}) == \
            {"safe": 95.0, "developing": 60.0, "warn": 60.0, "risk": 0.0}

    def test_inverted_input_is_repaired_not_rejected(self):
        z = resolve_zones({"safe": 60, "developing": 70, "warn": 80, "risk": 0})
        assert z["safe"] >= z["developing"] >= z["warn"] >= z["risk"]

    def test_out_of_range_is_clamped(self):
        z = resolve_zones({"safe": 500, "developing": 70, "warn": 65, "risk": -20})
        assert z["safe"] == 100.0 and z["risk"] == 0.0

    def test_does_not_mutate_the_shared_default(self):
        resolve_zones(None)["safe"] = 1
        assert DEFAULT_ZONES["safe"] == 80.0


# ---------------------------------------------------------------------------
# zone_of — boundaries, custom bands, fallback
# ---------------------------------------------------------------------------

class TestZoneOf:
    @pytest.mark.parametrize("score,expected", [
        (100, "safe"), (80, "safe"), (79, "developing"), (70, "developing"),
        (69, "warning"), (65, "warning"), (64, "risk"), (0, "risk"),
    ])
    def test_default_ladder_boundaries_are_inclusive(self, score, expected):
        assert zone_of(score, None) == expected

    @pytest.mark.parametrize("score,expected", [
        (50, "safe"), (49, "developing"), (40, "developing"),
        (39, "warning"), (30, "warning"), (29, "risk"),
    ])
    def test_custom_ladder_boundaries_are_inclusive(self, score, expected):
        assert zone_of(score, CUSTOM) == expected

    def test_custom_bands_change_the_answer(self):
        """45 is 'risk' on the default ladder and 'developing' on the custom one."""
        assert zone_of(45, None) == "risk"
        assert zone_of(45, CUSTOM) == "developing"

    @pytest.mark.parametrize("missing", [None, {}, "nonsense", []])
    def test_absent_zones_fall_back_to_the_defaults(self, missing):
        assert zone_of(75, missing) == zone_of(75, DEFAULT_ZONES) == "developing"

    def test_non_numeric_score_is_risk_not_a_crash(self):
        assert zone_of(None) == "risk"
        assert zone_of("abc") == "risk"

    def test_db_key_warn_is_reported_as_warning(self):
        """The DB calls the band `warn`; the report copy calls it `warning`."""
        assert zone_of(66, None) == "warning"


# ---------------------------------------------------------------------------
# display_pct — presentation-only floor
# ---------------------------------------------------------------------------

class TestDisplayPct:
    @pytest.mark.parametrize("raw,shown", [
        (0, 1), (-5, 1), (0.4, 1), (1, 1), (82.4, 82), (82.6, 83), (100, 100),
    ])
    def test_floor_and_rounding(self, raw, shown):
        assert display_pct(raw) == shown

    @pytest.mark.parametrize("bad", [None, "abc", float("nan"), float("inf")])
    def test_non_numeric_returns_none(self, bad):
        assert display_pct(bad) is None

    def test_the_floor_never_moves_the_zone(self):
        """A displayed 1% must not lift a 0 out of the risk band."""
        assert zone_of(0, None) == "risk"
        assert zone_of(0, {"safe": 3, "developing": 2, "warn": 1, "risk": 0}) == "risk"
        # …even though the printed number is 1, which WOULD be `warning` there.
        assert display_pct(0) == 1
        assert zone_of(display_pct(0), {"safe": 3, "developing": 2, "warn": 1,
                                        "risk": 0}) == "warning"


# ---------------------------------------------------------------------------
# _zone — emoji + localized label, thresholds injected
# ---------------------------------------------------------------------------

class TestZoneLabels:
    def test_signature_still_works_without_zones(self):
        assert _zone(85, "uk") == ("🟢", _t("uk", "zone_high"))

    @pytest.mark.parametrize("lang", ["uk", "en"])
    def test_custom_thresholds_pick_a_different_label(self, lang):
        assert _zone(45, lang, None) == ("🔴", _t(lang, "zone_low"))
        assert _zone(45, lang, CUSTOM) == ("🟡", _t(lang, "zone_mid"))

    def test_every_zone_has_an_emoji_and_a_label(self):
        for name in ("safe", "developing", "warning", "risk"):
            assert ZONE_EMOJI[name]
        for lang in ("uk", "en"):
            labels = {_zone(s, lang)[1] for s in (85, 75, 66, 10)}
            assert len(labels) == 4, "the four bands must read differently"


# ---------------------------------------------------------------------------
# End-to-end through the /start delivery handler
# ---------------------------------------------------------------------------

async def _summary(http, payload):
    http.get_result = FakeResponse(200, payload)
    update, context = FakeUpdate(), FakeContext(args=[TOKEN])
    await handlers.cmd_start(update, context)
    return update.effective_chat.texts[1]


class TestDeliveryUsesBackendZones:

    async def test_admin_thresholds_change_the_reported_zone(self, http):
        """45% is 'critical' by default and 'moderate' with the admin's bands."""
        base = await _summary(http, _report_payload(total_score=45))
        assert _t("uk", "zone_low") in base

        custom = await _summary(
            http, _report_payload(total_score=45, scoring_zones=CUSTOM))
        assert _t("uk", "zone_mid") in custom
        assert _t("uk", "zone_low") not in custom

    async def test_backend_without_the_field_falls_back(self, http):
        """Older backend / failed lookup: default ladder, no crash."""
        payload = _report_payload(total_score=82.4)
        payload.pop("scoring_zones", None)
        assert "scoring_zones" not in payload
        summary = await _summary(http, payload)
        assert _t("uk", "zone_high") in summary
        assert "82%" in summary

    @pytest.mark.parametrize("broken", [None, "nonsense", [], {}])
    async def test_broken_zones_payload_falls_back(self, http, broken):
        summary = await _summary(
            http, _report_payload(total_score=75, scoring_zones=broken))
        assert _t("uk", "zone_mid") in summary

    async def test_score_equal_to_the_threshold_lands_in_the_upper_band(self, http):
        summary = await _summary(
            http, _report_payload(total_score=50, scoring_zones=CUSTOM))
        assert _t("uk", "zone_high") in summary

    async def test_zero_is_shown_as_one_percent_but_stays_in_risk(self, http):
        summary = await _summary(http, _report_payload(total_score=0))
        assert "1%" in summary
        assert "0%" not in summary
        assert _t("uk", "zone_low") in summary

    async def test_zero_with_a_low_ladder_still_shows_risk(self, http):
        """The 1% floor is presentation only — it must not lift the zone."""
        summary = await _summary(http, _report_payload(
            total_score=0,
            scoring_zones={"safe": 3, "developing": 2, "warn": 1, "risk": 0}))
        assert "1%" in summary
        assert _t("uk", "zone_low") in summary

    async def test_a_null_score_does_not_crash_delivery(self, http):
        summary = await _summary(http, _report_payload(total_score=None))
        assert "1%" in summary
        assert _t("uk", "zone_low") in summary


# ---------------------------------------------------------------------------
# Parity with the backend's single source of truth
# ---------------------------------------------------------------------------
# helpers.py is a hand-copy of backend/services/scoring.py (separate services,
# no shared package). This class is the guard against the copies drifting: it
# runs both implementations over the same grid and demands identical answers.

_BK = _backend_scoring()

_LADDERS = [
    None, {}, "junk", [],
    {"safe": 90, "developing": 60, "warn": 30, "risk": 0},
    CUSTOM,
    {"safe": 95, "developing": 60},                          # legacy: no warn/risk
    {"safe": 60, "developing": 70, "warn": 80, "risk": 0},    # inverted
    {"safe": "abc", "developing": 70, "warn": 65},            # broken value
    {"safe": 500, "developing": 70, "warn": 65, "risk": -20},  # out of range
    {"safe": 3, "developing": 2, "warn": 1, "risk": 0},        # 1% floor trap
]
_SCORES = list(range(-3, 104)) + [0.4, 0.6, 64.5, 82.4, 82.5, None, "abc"]


@pytest.mark.skipif(_BK is None, reason="backend/services/scoring.py not available")
class TestParityWithBackendScoring:

    def test_constants_match(self):
        assert helpers.DEFAULT_ZONES == _BK.DEFAULT_ZONES
        assert helpers.ZONE_NAME_BY_KEY == _BK.ZONE_NAME_BY_KEY

    def test_every_backend_zone_name_has_bot_presentation(self):
        names = set(_BK.ZONE_NAME_BY_KEY.values())
        assert set(helpers.ZONE_EMOJI) == names
        assert set(helpers.ZONE_LABEL_KEY) == names

    def test_resolve_zones_agrees(self):
        for raw in _LADDERS:
            assert helpers.resolve_zones(raw) == _BK.resolve_zones(raw), raw

    def test_zone_of_agrees_on_every_score_and_ladder(self):
        for raw, score in itertools.product(_LADDERS, _SCORES):
            assert helpers.zone_of(score, raw) == _BK.zone_of(score, raw), (score, raw)

    def test_display_pct_agrees(self):
        for score in _SCORES + [float("nan"), float("inf")]:
            assert helpers.display_pct(score) == _BK.display_pct(score), score
