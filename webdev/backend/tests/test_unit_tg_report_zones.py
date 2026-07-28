"""GET /tg/report/<token> must publish the test's scoring zones.

The client bot (webdev/tgbot) prints the score's zone next to the percentage.
It used to decide that zone with its own hard-coded 80/70/65 ladder — a third
copy of the bug fixed in services/scoring.py — partly because this endpoint did
not return `tests.scoring_zones` at all, so the bot had nothing to obey.

These tests pin the endpoint's half of the contract:

  * the bands travel on the SAME row as the submission (LEFT JOIN, no second
    query), so a bot delivery is still one backend round-trip;
  * the payload ALWAYS carries a complete, ordered 4-key dict — a legacy row, a
    submission with no test, or broken JSON yields the defaults, never null.

No DB and no live server: `query` is monkeypatched on the blueprint module.
"""
import json

import pytest
from flask import Flask

from services.scoring import DEFAULT_ZONES, ZONE_KEYS


TOKEN = "deadbeef"


@pytest.fixture
def tg_report(monkeypatch):
    """Return (client, set_row) — set_row(**cols) scripts the submission row."""
    import routes.telegram as tg

    state = {"row": None, "sql": []}

    def fake_query(sql, params=None, **kwargs):
        state["sql"].append(" ".join(sql.split()))
        return state["row"]

    monkeypatch.setattr(tg, "query", fake_query)
    monkeypatch.setattr(tg, "execute", lambda *a, **k: None)
    # PII columns are Fernet-encrypted in production; the fixture stores plain
    # strings, which decrypt_value() already passes through unchanged.

    app = Flask(__name__)
    app.register_blueprint(tg.tg_bp)

    def set_row(**cols):
        row = {
            "id": 1, "first_name": "Olga", "last_name": "Kovalenko",
            "total_score": 72, "block_scores_json": [],
            "tg_token_expires": None, "pdf_data": None, "language": "uk",
            "scoring_zones": None,
        }
        row.update(cols)
        state["row"] = row

    set_row()
    return app.test_client(), set_row, state


def _get(client):
    r = client.get(f"/api_crowe_bizcheck/tg/report/{TOKEN}")
    assert r.status_code == 200
    return json.loads(r.data)


class TestReportPayloadZones:

    def test_custom_zones_reach_the_bot(self, tg_report):
        client, set_row, _ = tg_report
        set_row(scoring_zones={"safe": 90, "developing": 60, "warn": 30, "risk": 0})
        assert _get(client)["scoring_zones"] == \
            {"safe": 90.0, "developing": 60.0, "warn": 30.0, "risk": 0.0}

    def test_missing_column_yields_the_defaults_not_null(self, tg_report):
        """Submission with no test_id (LEFT JOIN → NULL) still renders."""
        client, set_row, _ = tg_report
        set_row(scoring_zones=None)
        assert _get(client)["scoring_zones"] == DEFAULT_ZONES

    def test_broken_json_is_repaired_never_null(self, tg_report):
        client, set_row, _ = tg_report
        set_row(scoring_zones={"safe": "abc", "developing": 70})
        zones = _get(client)["scoring_zones"]
        assert set(zones) == set(ZONE_KEYS)
        assert zones["safe"] >= zones["developing"] >= zones["warn"] >= zones["risk"]

    def test_key_is_always_present_and_complete(self, tg_report):
        client, set_row, _ = tg_report
        for raw in (None, {}, "80", [], {"warn": 99}):
            set_row(scoring_zones=raw)
            zones = _get(client)["scoring_zones"]
            assert zones is not None
            assert set(zones) == set(ZONE_KEYS)

    def test_zones_come_from_the_submission_row_without_a_second_query(self, tg_report):
        """REGRESSION: no extra SELECT on tests — delivery stays one round-trip."""
        client, set_row, state = tg_report
        set_row(scoring_zones={"safe": 90, "developing": 60, "warn": 30, "risk": 0})
        _get(client)
        assert len(state["sql"]) == 1, state["sql"]
        sql = state["sql"][0].lower()
        assert "left join tests" in sql
        assert "scoring_zones" in sql

    def test_unknown_token_is_still_404(self, tg_report):
        client, _, state = tg_report
        state["row"] = None
        r = client.get(f"/api_crowe_bizcheck/tg/report/{TOKEN}")
        assert r.status_code == 404
