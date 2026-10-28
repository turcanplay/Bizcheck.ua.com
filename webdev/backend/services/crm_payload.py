"""
Lead payload shared by the two CRM integration paths.

Both the outbound webhook (services/crm_notify.py — we PUSH each new lead to the
CRM) and the pull API (routes/crm.py — the CRM FETCHES leads with an API key)
emit exactly the same JSON object per lead, so a CRM mapping written for one
works for the other. The shape is a public contract documented for the client:
add fields freely, never rename or drop one.

`sub` must come from the model layer (Submission.find_by_id / list queries that
go through decrypt_row) — PII columns are Fernet-encrypted at rest and raw SQL
rows would leak ciphertext into the CRM.
"""
from __future__ import annotations

import logging
import os
from datetime import datetime

log = logging.getLogger(__name__)

SCHEMA_VERSION = 1

# Same labels as the Telegram lead card (services/sales_notify.py).
_ZONE_LABEL_UK = {
    "safe": "Низький ризик",
    "developing": "Помірний ризик",
    "warning": "Високий ризик",
    "risk": "Критичний ризик",
}


def _iso(value) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value)


def _admin_url() -> str:
    base = (os.getenv("PUBLIC_BASE_URL") or "https://bizcheck.com.ua").rstrip("/")
    return f"{base}/admin_bizcheck_md_crowe/"


def _load_test(test_id):
    """Test row or None. Never raises: the test is cosmetic for the CRM, losing
    the lead over a DB hiccup reading it would be the wrong trade."""
    if not test_id:
        return None
    try:
        from models.test import Test
        return Test.find_by_id(test_id)
    except Exception:
        log.warning("[crm] could not load test %s", test_id, exc_info=True)
        return None


def build_lead(sub: dict, test: dict | None = None) -> dict:
    """One lead as the CRM sees it. `test` may be passed in by callers that
    already loaded it (bulk listing) to avoid one query per row."""
    if test is None:
        test = _load_test(sub.get("test_id"))

    score = sub.get("total_score")
    zone = zone_label = None
    if score is not None:
        try:
            from services.scoring import zone_of
            zone = zone_of(score, test.get("scoring_zones") if test else None)
            zone_label = _ZONE_LABEL_UK.get(zone)
        except Exception:
            log.warning("[crm] could not resolve the zone for submission %s",
                        sub.get("id"), exc_info=True)

    tg_username = sub.get("tg_username")
    return {
        "id": sub.get("id"),
        "created_at": _iso(sub.get("created_at")),
        "source": "bizcheck.com.ua",
        "language": sub.get("language") or "uk",
        "status": sub.get("status"),
        "contact": {
            "first_name": sub.get("first_name"),
            "last_name": sub.get("last_name"),
            "email": sub.get("email"),
            "phone": sub.get("phone"),
            "telegram_username": f"@{tg_username}" if tg_username else None,
            "telegram_chat_id": sub.get("tg_chat_id"),
        },
        "company": {
            "sector": sub.get("sector"),
            "size": sub.get("company_size"),
            "age": sub.get("company_age"),
            "revenue": sub.get("company_revenue"),
        },
        "test": {
            "id": sub.get("test_id"),
            "slug": test.get("slug") if test else None,
            "name": (test.get("name_uk") or test.get("name_en")) if test else None,
        },
        "result": {
            "score": score,
            "zone": zone,
            "zone_label": zone_label,
            "has_pdf": bool(sub.get("has_pdf")),
        },
        "consent": bool(sub.get("consent")),
        "admin_url": _admin_url(),
    }
