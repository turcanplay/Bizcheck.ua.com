"""Scoring zones — the admin-configurable colour bands of the report.

The thresholds live in `tests.scoring_zones` (JSONB) and used to be ignored by
everything that actually rendered a score, which had its own hard-coded 80/70/65
ladder. These tests pin the contract of the single source of truth
(`services/scoring.py`) and of the two asymmetric paths around it:

* the WRITE path (`POST/PUT /admin/tests`) rejects an out-of-order payload,
* the READ path never rejects anything — a legacy row still renders.

No DB and no live server: the route tests drive the Flask test client with the
service layer monkeypatched, mirroring test_unit_content_sanitization.py.
"""
import json
import os

import pytest

from services.scoring import (
    DEFAULT_ZONES, display_pct, resolve_zones, validate_zones, zone_of,
)


# ---------------------------------------------------------------------------
# resolve_zones — read path, must never raise
# ---------------------------------------------------------------------------

class TestResolveZones:
    def test_none_gives_the_defaults(self):
        assert resolve_zones(None) == DEFAULT_ZONES

    @pytest.mark.parametrize("bad", ["80", 42, [], True, object()])
    def test_non_dict_gives_the_defaults(self, bad):
        assert resolve_zones(bad) == DEFAULT_ZONES

    def test_valid_custom_set_is_kept(self):
        assert resolve_zones({"safe": 90, "developing": 75, "warn": 50, "risk": 0}) == \
            {"safe": 90.0, "developing": 75.0, "warn": 50.0, "risk": 0.0}

    def test_missing_keys_fall_back_individually(self):
        # A row written before `risk` existed (see the migrate() backfill).
        assert resolve_zones({"safe": 95, "developing": 60}) == \
            {"safe": 95.0, "developing": 60.0, "warn": 60.0, "risk": 0.0}

    def test_non_numeric_value_falls_back_to_its_default(self):
        assert resolve_zones({"safe": "abc", "developing": 60, "warn": 40})["safe"] == 80.0

    def test_numeric_strings_are_coerced(self):
        assert resolve_zones({"safe": "90"})["safe"] == 90.0

    def test_out_of_range_values_are_clamped(self):
        z = resolve_zones({"safe": 500, "developing": 70, "warn": 65, "risk": -20})
        assert z["safe"] == 100.0
        assert z["risk"] == 0.0

    def test_inverted_input_is_repaired_not_rejected(self):
        # An existing row saved before the write-path check must still render.
        z = resolve_zones({"safe": 60, "developing": 70, "warn": 80, "risk": 0})
        assert z["safe"] >= z["developing"] >= z["warn"] >= z["risk"]
        assert z == {"safe": 60.0, "developing": 60.0, "warn": 60.0, "risk": 0.0}

    def test_result_is_always_descending(self):
        for raw in ({"warn": 99}, {"risk": 100}, {"developing": 100, "safe": 10}):
            z = resolve_zones(raw)
            assert z["safe"] >= z["developing"] >= z["warn"] >= z["risk"]

    def test_does_not_mutate_the_shared_default(self):
        resolve_zones(None)["safe"] = 1
        assert DEFAULT_ZONES["safe"] == 80.0


# ---------------------------------------------------------------------------
# validate_zones — write path, strict
# ---------------------------------------------------------------------------

class TestValidateZones:
    def test_none_passes_through(self):
        assert validate_zones(None) is None

    def test_non_dict_is_rejected(self):
        with pytest.raises(ValueError):
            validate_zones([80, 70, 65, 0])

    def test_valid_payload_is_normalised_to_floats(self):
        assert validate_zones({"safe": 80, "developing": "70", "warn": 65, "risk": 0}) == \
            {"safe": 80.0, "developing": 70.0, "warn": 65.0, "risk": 0.0}

    def test_unknown_keys_are_dropped(self):
        out = validate_zones({"safe": 80, "evil": "<script>x</script>"})
        assert "evil" not in out

    def test_missing_keys_are_filled_from_the_defaults(self):
        assert validate_zones({"safe": 90}) == \
            {"safe": 90.0, "developing": 70.0, "warn": 65.0, "risk": 0.0}

    def test_inverted_order_is_rejected(self):
        with pytest.raises(ValueError, match="ordered"):
            validate_zones({"safe": 60, "developing": 70, "warn": 80, "risk": 0})

    def test_equal_upper_bands_are_rejected(self):
        # Two equal thresholds would silently delete a zone from every report.
        with pytest.raises(ValueError, match="ordered"):
            validate_zones({"safe": 80, "developing": 80, "warn": 65, "risk": 0})

    def test_risk_may_equal_warn(self):
        # `risk` is the floor, not a band boundary.
        assert validate_zones({"safe": 80, "developing": 70, "warn": 65, "risk": 65})

    def test_garbage_value_is_rejected(self):
        with pytest.raises(ValueError):
            validate_zones({"safe": "abc"})

    def test_out_of_range_value_is_rejected_via_the_ordering_check(self):
        # 500 clamps to 100, which is still a legal top band.
        assert validate_zones({"safe": 500})["safe"] == 100.0


# ---------------------------------------------------------------------------
# zone_of
# ---------------------------------------------------------------------------

class TestZoneOf:
    @pytest.mark.parametrize("pct,expected", [
        (100, "safe"), (80, "safe"), (79, "developing"), (70, "developing"),
        (69, "warning"), (65, "warning"), (64, "risk"), (0, "risk"),
    ])
    def test_default_boundaries(self, pct, expected):
        assert zone_of(pct) == expected

    def test_score_on_a_threshold_falls_in_the_higher_zone(self):
        z = {"safe": 90, "developing": 60, "warn": 30, "risk": 0}
        assert zone_of(90, z) == "safe"
        assert zone_of(89, z) == "developing"
        assert zone_of(60, z) == "developing"
        assert zone_of(59, z) == "warning"
        assert zone_of(30, z) == "warning"
        assert zone_of(29, z) == "risk"

    def test_custom_zones_actually_change_the_result(self):
        assert zone_of(55) == "risk"
        assert zone_of(55, {"safe": 50, "developing": 40, "warn": 30, "risk": 0}) == "safe"

    def test_db_key_warn_maps_to_the_ui_name_warning(self):
        assert zone_of(65) == "warning"

    def test_zero_stays_in_risk(self):
        assert zone_of(0) == "risk"

    def test_garbage_zones_fall_back_instead_of_raising(self):
        assert zone_of(85, "not-a-dict") == "safe"
        assert zone_of(85, None) == "safe"

    def test_garbage_score_is_treated_as_zero(self):
        assert zone_of(None) == "risk"
        assert zone_of("abc") == "risk"


# ---------------------------------------------------------------------------
# display_pct
# ---------------------------------------------------------------------------

class TestDisplayPct:
    def test_zero_is_shown_as_one(self):
        assert display_pct(0) == 1
        assert display_pct(0.0) == 1

    def test_other_values_are_rounded_only(self):
        assert display_pct(1) == 1
        assert display_pct(49.4) == 49
        assert display_pct(49.6) == 50
        assert display_pct(100) == 100

    def test_negative_is_floored_to_one(self):
        assert display_pct(-3) == 1

    def test_non_numeric_returns_none_so_callers_can_print_a_dash(self):
        assert display_pct(None) is None
        assert display_pct("abc") is None
        assert display_pct(float("nan")) is None

    def test_the_floor_never_moves_the_zone(self):
        assert zone_of(0) == "risk"
        assert zone_of(display_pct(0)) == "risk"


# ---------------------------------------------------------------------------
# Consumers read the thresholds from the test row
# ---------------------------------------------------------------------------

class TestEmailTemplateUsesTestZones:
    def _render(self, score, zones):
        from services.email_templates import render
        return render(lang="uk", first_name="Ion", test_name="T",
                      date_str="2026-01-01", score=score, logo_url="x",
                      zones=zones)

    def test_custom_zones_change_the_risk_label(self):
        _, _, low = self._render(55, None)
        assert "Критичний ризик" in low
        _, _, high = self._render(55, {"safe": 50, "developing": 40, "warn": 30, "risk": 0})
        assert "Низький ризик" in high

    def test_zero_prints_as_one_but_stays_critical(self):
        _, html, text = self._render(0, None)
        assert "Критичний ризик" in text
        assert "1<span" in html          # the score ring
        assert ": 1% —" in text


class TestSalesNotifyUsesTestZones:
    def test_custom_zones_change_the_lead_card_label(self):
        from services import sales_notify as sn
        sub = {"first_name": "Ion", "total_score": 55}
        assert "Критичний ризик" in sn._build_caption(sub, "T")
        assert "Низький ризик" in sn._build_caption(
            sub, "T", {"safe": 50, "developing": 40, "warn": 30, "risk": 0})

    def test_zero_prints_as_one_but_stays_critical(self):
        from services import sales_notify as sn
        cap = sn._build_caption({"first_name": "Ion", "total_score": 0}, "T")
        assert "1% — Критичний ризик" in cap


# ---------------------------------------------------------------------------
# Routes: public payload carries the zones, admin CRUD validates them
# ---------------------------------------------------------------------------

CSRF = "unit-test-csrf-token"


def _admin_jwt():
    import jwt
    return jwt.encode({"role": "admin"}, os.environ["JWT_SECRET"], algorithm="HS256")


def _hdr():
    return {"X-CSRF-Token": CSRF}


@pytest.fixture
def env(monkeypatch):
    """Flask test client on the real routes, with the service layer recorded.

    Auth is exercised for real (admin_session JWT cookie + double-submit CSRF)
    exactly like test_unit_content_sanitization.py — patching the decorator
    would silently depend on module import order across the suite.
    """
    from flask import Flask
    import routes.tests as mod

    captured = {}

    def fake_create(**kwargs):
        captured["create"] = kwargs
        return {"id": 1}

    def fake_update(test_id, data):
        captured["update"] = data
        return {"id": test_id}

    monkeypatch.setattr(mod, "create_test", fake_create)
    monkeypatch.setattr(mod, "update_test", fake_update)

    app = Flask(__name__)
    app.register_blueprint(mod.tests_bp)
    app.register_blueprint(mod.admin_tests_bp)
    client = app.test_client()
    client.set_cookie(key="admin_session", value=_admin_jwt(), domain="localhost")
    client.set_cookie(key="admin_csrf", value=CSRF, domain="localhost")
    return client, captured, mod


class TestPublicTestsPayload:
    def test_scoring_zones_are_exposed_and_repaired(self, env, monkeypatch):
        client, _, routes_tests = env
        monkeypatch.setattr(routes_tests, "list_all_tests", lambda: [{
            "id": 1, "slug": "s", "name_uk": "a", "name_en": "a",
            "description_uk": "", "description_en": "", "is_active": True,
            # Legacy row: no `risk`, inverted upper bands.
            "scoring_zones": {"safe": 60, "developing": 70},
        }])
        body = json.loads(client.get("/api_crowe_bizcheck/tests").data)
        zones = body["tests"][0]["scoring_zones"]
        assert set(zones) == {"safe", "developing", "warn", "risk"}
        assert zones["safe"] >= zones["developing"] >= zones["warn"] >= zones["risk"]

    def test_missing_column_yields_the_defaults(self, env, monkeypatch):
        client, _, routes_tests = env
        monkeypatch.setattr(routes_tests, "list_all_tests", lambda: [{
            "id": 1, "slug": "s", "name_uk": "a", "name_en": "a",
            "description_uk": "", "description_en": "", "is_active": True,
        }])
        body = json.loads(client.get("/api_crowe_bizcheck/tests").data)
        assert body["tests"][0]["scoring_zones"] == DEFAULT_ZONES


class TestAdminZoneValidation:
    def test_valid_zones_reach_the_service(self, env):
        client, captured, _ = env
        r = client.post("/api_crowe_bizcheck/admin/tests", headers=_hdr(), json={
            "name_uk": "X",
            "scoring_zones": {"safe": 90, "developing": 60, "warn": 30, "risk": 0},
        })
        assert r.status_code == 201
        assert captured["create"]["scoring_zones"] == \
            {"safe": 90.0, "developing": 60.0, "warn": 30.0, "risk": 0.0}

    def test_inverted_zones_are_rejected_with_400(self, env):
        client, captured, _ = env
        r = client.post("/api_crowe_bizcheck/admin/tests", headers=_hdr(), json={
            "name_uk": "X",
            "scoring_zones": {"safe": 60, "developing": 70, "warn": 80, "risk": 0},
        })
        assert r.status_code == 400
        assert "create" not in captured

    def test_equal_zones_are_rejected_with_400(self, env):
        client, captured, _ = env
        r = client.post("/api_crowe_bizcheck/admin/tests", headers=_hdr(), json={
            "name_uk": "X",
            "scoring_zones": {"safe": 70, "developing": 70, "warn": 65, "risk": 0},
        })
        assert r.status_code == 400
        assert "create" not in captured

    def test_update_validates_too(self, env):
        client, captured, _ = env
        r = client.put("/api_crowe_bizcheck/admin/tests/7", headers=_hdr(), json={
            "scoring_zones": {"safe": 10, "developing": 90, "warn": 5, "risk": 0},
        })
        assert r.status_code == 400
        assert "update" not in captured

    def test_update_with_valid_zones_is_filled_out(self, env):
        client, captured, _ = env
        r = client.put("/api_crowe_bizcheck/admin/tests/7", headers=_hdr(),
                       json={"scoring_zones": {"safe": 85}})
        assert r.status_code == 200
        assert captured["update"]["scoring_zones"] == \
            {"safe": 85.0, "developing": 70.0, "warn": 65.0, "risk": 0.0}
