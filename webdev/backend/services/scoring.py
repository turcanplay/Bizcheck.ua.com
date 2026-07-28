"""Scoring zones — the ONE place the report's colour bands are decided.

`tests.scoring_zones` is a JSONB column edited from the admin panel. Everything
that turns a percentage into a zone (report email, sales notification, the
public /tests payload the SPA scores against) goes through this module — there
used to be a hard-coded 80/70/65 ladder copied into every consumer, so editing
the thresholds in the admin panel changed nothing.

Two entry points, deliberately asymmetric:

* :func:`validate_zones` — WRITE path. Strict: rejects a payload whose
  thresholds are not strictly ordered, so an admin gets a 400 instead of a
  report with an unreachable band.
* :func:`resolve_zones` — READ path. Never raises. A row written before this
  validation existed (or by hand in SQL) must still render a report, so missing
  / non-numeric / out-of-order values are repaired rather than rejected.

Key naming trap: the DB (and the admin UI) call the third band ``warn``; the
frontend `Zone` type calls it ``warning``. :func:`zone_of` returns the FRONTEND
spelling — the mapping is explicit in :data:`ZONE_NAME_BY_KEY`, never implicit.
"""

DEFAULT_ZONES = {"safe": 80.0, "developing": 70.0, "warn": 65.0, "risk": 0.0}

# Descending order — this is also the order zone_of() tests the thresholds in.
ZONE_KEYS = ("safe", "developing", "warn", "risk")

# DB key -> zone name used by the frontend / report copy.
ZONE_NAME_BY_KEY = {
    "safe": "safe",
    "developing": "developing",
    "warn": "warning",
    "risk": "risk",
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
    """Return a complete, monotonically ordered zone dict. NEVER raises.

    Repairs, in this order:
      * not a dict / None            → the defaults
      * missing or non-numeric value → that key's default
      * out of range                 → clamped to [0, 100]
      * not descending               → each band clamped to the one above it,
        so `safe >= developing >= warn >= risk` always holds

    Clamping (rather than falling back wholesale) keeps the admin's intent where
    it is unambiguous: setting `developing` above `safe` collapses the band to
    empty, which is deterministic, instead of silently reinstating 80/70/65.
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


def validate_zones(raw):
    """Write-path validation. Returns a complete 4-key dict or raises ValueError.

    Unknown keys are dropped (closed allow-list). Absent keys fall back to the
    default so a partial payload from the admin modal is still storable, and the
    stored row always carries all four thresholds.

    The order must be STRICT for the three upper bands — two equal thresholds
    would silently delete a zone from every report of that test, which is never
    what someone typing numbers into the modal means. `risk` may equal `warn`
    (it is the floor, not a band boundary).
    """
    if raw is None:
        return None
    if not isinstance(raw, dict):
        raise ValueError("scoring_zones must be an object")

    out = {}
    for key in ZONE_KEYS:
        if key in raw:
            value = _as_float(raw[key])
            if value is None:
                raise ValueError(f"scoring_zones.{key} must be a number between 0 and 100")
            out[key] = float(value)
        else:
            out[key] = DEFAULT_ZONES[key]

    if not (out["safe"] > out["developing"] > out["warn"] >= out["risk"]):
        raise ValueError(
            "scoring_zones must be ordered: safe > developing > warn >= risk "
            f"(got safe={out['safe']:g}, developing={out['developing']:g}, "
            f"warn={out['warn']:g}, risk={out['risk']:g})"
        )
    return out


def zone_of(pct, zones=None):
    """Zone name ('safe' | 'developing' | 'warning' | 'risk') for a percentage.

    `zones` is the RAW column value — it is passed through resolve_zones() here
    so no caller has to remember to repair it first.
    """
    z = resolve_zones(zones)
    try:
        value = float(pct)
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
    """Percentage as SHOWN to a user — a computed 0 is floored to 1.

    Product decision: "0%" reads like a broken calculation rather than a result,
    so the report/email/notification prints 1% instead. This is presentation
    ONLY — it must never feed zone_of() or be written back to
    `submissions.total_score`, otherwise a 0 would climb out of the risk zone.

    Returns None when the value is not a number, so callers can print "—".
    """
    try:
        n = int(round(float(value)))       # NaN/inf raise here → None
    except (TypeError, ValueError, OverflowError):
        return None
    return 1 if n <= 0 else n
