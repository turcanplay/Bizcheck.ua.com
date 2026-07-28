"""
Small presentation helpers for the report summary.

The colour bands are NOT decided here. They live in `tests.scoring_zones`
(JSONB, edited from the admin panel) and reach the bot inside the
`/tg/report/<token>` payload as ``scoring_zones``. This module used to carry a
third hard-coded copy of the 80/70/65 ladder, so an admin who moved the
thresholds got one zone in the report/email and a different one from the bot.

This is a deliberate RE-implementation of `webdev/backend/services/scoring.py`
(`resolve_zones` / `zone_of` / `display_pct`), not an import: the bot is a
separate service with its own image and no shared package. Keep the two in sync
— the boundary rules (`>=`, descending clamp, `warn` → `warning`, the 0 → 1
display floor) are the contract, and `tests/test_zones.py` pins them.

Fallback is mandatory: bot and backend deploy independently, so a payload from
an older backend (no `scoring_zones` key), or a row with broken JSON, must still
produce a report — with the documented defaults, never a crash.
"""

from strings import _t

# Same ladder as backend services/scoring.py DEFAULT_ZONES.
DEFAULT_ZONES = {"safe": 80.0, "developing": 70.0, "warn": 65.0, "risk": 0.0}

# DB key -> zone name used by the frontend / report copy. Explicit, never
# implicit: the DB calls the third band `warn`, the report calls it `warning`.
ZONE_NAME_BY_KEY = {
    "safe": "safe",
    "developing": "developing",
    "warn": "warning",
    "risk": "risk",
}

# Zone name -> what the bot actually prints. Labels stay in strings.py (uk/en);
# only the emoji is presentation local to this module.
ZONE_EMOJI = {
    "safe": "🟢",
    "developing": "🟡",
    "warning": "🟠",
    "risk": "🔴",
}

ZONE_LABEL_KEY = {
    "safe": "zone_high",
    "developing": "zone_mid",
    "warning": "zone_warn",
    "risk": "zone_low",
}


def _as_float(value):
    """Coerce to a finite float in [0, 100], or return None."""
    try:
        n = float(value)
    except (TypeError, ValueError):
        return None
    if n != n or n in (float("inf"), float("-inf")):   # NaN / inf
        return None
    return min(100.0, max(0.0, n))


def resolve_zones(raw):
    """Return a complete, descending zone dict. NEVER raises.

    Mirrors backend `services.scoring.resolve_zones`: a missing payload, a
    non-dict, a missing key or a non-numeric value falls back to that key's
    default, values are clamped into [0, 100], and each band is clamped to the
    one above it so `safe >= developing >= warn >= risk` always holds.
    """
    if not isinstance(raw, dict):
        return dict(DEFAULT_ZONES)

    safe = _as_float(raw.get("safe"))
    developing = _as_float(raw.get("developing"))
    warn = _as_float(raw.get("warn"))
    risk = _as_float(raw.get("risk"))

    safe = DEFAULT_ZONES["safe"] if safe is None else safe
    developing = DEFAULT_ZONES["developing"] if developing is None else developing
    warn = DEFAULT_ZONES["warn"] if warn is None else warn
    risk = DEFAULT_ZONES["risk"] if risk is None else risk

    developing = min(developing, safe)
    warn = min(warn, developing)
    risk = min(risk, warn)

    return {"safe": safe, "developing": developing, "warn": warn, "risk": risk}


def zone_of(score, zones=None) -> str:
    """Zone name ('safe' | 'developing' | 'warning' | 'risk') for a score.

    `zones` is the RAW value from the backend payload — repaired here, so no
    caller has to remember to. Boundaries are inclusive (`>=`), exactly like the
    report, the email and the sales notification: a score equal to a threshold
    belongs to the band ABOVE it.
    """
    z = resolve_zones(zones)
    try:
        value = float(score)
    except (TypeError, ValueError):
        value = 0.0
    if value >= z["safe"]:
        return ZONE_NAME_BY_KEY["safe"]
    if value >= z["developing"]:
        return ZONE_NAME_BY_KEY["developing"]
    if value >= z["warn"]:
        return ZONE_NAME_BY_KEY["warn"]
    return ZONE_NAME_BY_KEY["risk"]


def display_pct(value):
    """Percentage as SHOWN to the user — a computed 0 is floored to 1.

    Presentation ONLY. It must never feed :func:`zone_of`, otherwise a 0 would
    climb out of the risk zone whenever `risk < warn <= 1`. Returns None when
    the value is not a number so the caller can print "—".
    """
    try:
        n = int(round(float(value)))       # NaN/inf raise here → None
    except (TypeError, ValueError, OverflowError):
        return None
    return 1 if n <= 0 else n


def _zone(score: int, lang: str = "uk", zones=None) -> tuple[str, str]:
    """Emoji + localized label for a score, using the test's own thresholds.

    `zones` omitted / None (old backend, failed lookup) → the defaults.
    """
    name = zone_of(score, zones)
    return ZONE_EMOJI[name], _t(lang, ZONE_LABEL_KEY[name])
