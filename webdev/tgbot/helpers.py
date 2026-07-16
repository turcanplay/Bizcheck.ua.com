"""
Small presentation helpers for the report summary.

Zone thresholds (kept in sync with the frontend/report): 🟢≥80 🟡70–79 🟠65–69 🔴<65.
"""

from strings import _t


def _zone(score: int, lang: str = "uk") -> tuple[str, str]:
    """Emoji + localized label for a score."""
    if score >= 80:
        return "🟢", _t(lang, "zone_high")
    if score >= 70:
        return "🟡", _t(lang, "zone_mid")
    if score >= 65:
        return "🟠", _t(lang, "zone_warn")
    return "🔴", _t(lang, "zone_low")
