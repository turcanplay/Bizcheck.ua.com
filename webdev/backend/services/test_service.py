"""Test service — business logic for multi-test support."""

import re
from models.test import Test

_SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9_-]{0,63}$")


def _serialize(t):
    if not t:
        return t
    t = dict(t)
    t["created_at"] = str(t["created_at"])
    return t


def _auto_slug(name_ro, name_ru):
    base = (name_ro or name_ru or "").lower().strip()
    base = re.sub(r"[^a-z0-9]+", "-", base).strip("-")
    return (base or "test")[:64]


def list_active_tests():
    return [_serialize(t) for t in (Test.find_active() or [])]


def list_all_tests():
    return [_serialize(t) for t in (Test.find_all() or [])]


def get_test_by_slug(slug):
    return _serialize(Test.find_by_slug(slug))


def get_test_by_id(test_id):
    return _serialize(Test.find_by_id(test_id))


def _norm_price(value):
    if value in (None, ""):
        return None
    try:
        v = float(value)
        if v < 0 or v > 99999999.99:
            raise ValueError("Price out of range")
        return round(v, 2)
    except (TypeError, ValueError):
        raise ValueError("Invalid price")


def _norm_currency(value, default="MDL"):
    s = (value or default).strip().upper()[:3] or default
    if not s.isalpha() or len(s) != 3:
        raise ValueError("Invalid currency (3-letter code)")
    return s


def _norm_category(value):
    if value is None:
        return None
    s = str(value).strip()[:50]
    return s or None


def _norm_features(value):
    if value is None:
        return None
    if isinstance(value, str):
        items = [s.strip() for s in value.split("\n")]
    elif isinstance(value, (list, tuple)):
        items = [str(x).strip() for x in value]
    else:
        items = []
    items = [x[:200] for x in items if x]
    return items[:20]


# Three distinct report layouts:
#   - bizcheck: cover + blocks + zones + per-BLOCK detail pages (in-depth, 4 sections each)
#   - standard: cover + blocks + zones + per-QUESTION checklist (pass/fail per item)
#   - premium:  cover + blocks + zones only (no details, short format)
CANONICAL_REPORT_TYPES = {"bizcheck", "standard", "premium"}
ACCEPTED_REPORT_TYPES = CANONICAL_REPORT_TYPES

def _norm_report_type(value, default="bizcheck"):
    s = (value or default).strip().lower()
    if s not in ACCEPTED_REPORT_TYPES:
        raise ValueError(
            f"Invalid report_type (must be one of: {sorted(CANONICAL_REPORT_TYPES)})"
        )
    return s


def _norm_order(value, default=0):
    try:
        n = int(value)
        return max(0, min(100000, n))
    except (TypeError, ValueError):
        return default


def create_test(slug, name_ro, name_ru, description_ro="", description_ru="",
                is_active=True, is_paid=False, price=None, currency="MDL",
                category=None, features=None, scoring_zones=None, zone_recommendations=None,
                report_type="bizcheck", is_coming_soon=False, order_index=0):
    name_ro = (name_ro or "").strip()
    name_ru = (name_ru or "").strip()
    if not name_ro and not name_ru:
        raise ValueError("At least one name (RO or RU) is required")

    slug = (slug or "").strip().lower() or _auto_slug(name_ro, name_ru)
    if not _SLUG_RE.match(slug):
        raise ValueError("Invalid slug (lowercase letters, digits, _ and -, max 64 chars)")
    if Test.find_by_slug(slug):
        raise ValueError("Slug already exists")

    norm_price = _norm_price(price) if is_paid else None
    norm_currency = _norm_currency(currency)

    return _serialize(Test.create(
        slug, name_ro[:255], name_ru[:255],
        (description_ro or "").strip(),
        (description_ru or "").strip(),
        bool(is_active), bool(is_paid),
        norm_price, norm_currency,
        _norm_category(category),
        _norm_features(features),
        scoring_zones, zone_recommendations,
        _norm_report_type(report_type),
        is_coming_soon=bool(is_coming_soon),
        order_index=_norm_order(order_index),
    ))


def update_test(test_id, data):
    existing = Test.find_by_id(test_id)
    if not existing:
        raise ValueError("Test not found")
    slug = (data.get("slug") or existing["slug"]).strip().lower()
    if not _SLUG_RE.match(slug):
        raise ValueError("Invalid slug")
    if slug != existing["slug"] and Test.find_by_slug(slug):
        raise ValueError("Slug already exists")

    is_paid = bool(data.get("is_paid", existing.get("is_paid", False)))
    raw_price = data.get("price") if "price" in data else existing.get("price")
    price = _norm_price(raw_price) if is_paid else None
    currency = _norm_currency(
        data.get("currency") if "currency" in data else existing.get("currency", "MDL")
    )

    features = _norm_features(data.get("features")) if "features" in data else None
    return _serialize(Test.update(
        test_id,
        slug,
        (data.get("name_ro") or existing["name_ro"]).strip()[:255],
        (data.get("name_ru") or existing["name_ru"]).strip()[:255],
        (data.get("description_ro") if data.get("description_ro") is not None
            else existing["description_ro"]).strip(),
        (data.get("description_ru") if data.get("description_ru") is not None
            else existing["description_ru"]).strip(),
        bool(data.get("is_active", existing["is_active"])),
        is_paid,
        price, currency,
        _norm_category(data.get("category") if "category" in data else existing.get("category")),
        features,
        data.get("scoring_zones"),
        data.get("zone_recommendations"),
        _norm_report_type(data.get("report_type")) if "report_type" in data else None,
        is_coming_soon=bool(data.get("is_coming_soon", existing.get("is_coming_soon", False))),
        order_index=_norm_order(data["order_index"]) if "order_index" in data else None,
    ))


def reorder_tests(items):
    """Persist a new manual order. `items` is a list of {id, order_index} dicts;
    order_index values are assigned by the caller (the admin drag-and-drop list).
    Invalid / duplicate ids are skipped. Returns the number of rows updated."""
    if not isinstance(items, list):
        raise ValueError("items must be a list")
    norm = []
    seen = set()
    for it in items:
        if not isinstance(it, dict):
            continue
        try:
            tid = int(it.get("id"))
        except (TypeError, ValueError):
            continue
        if tid in seen:
            continue
        seen.add(tid)
        norm.append((tid, _norm_order(it.get("order_index"))))
    if not norm:
        raise ValueError("No valid items to reorder")
    Test.reorder(norm)
    return len(norm)


def delete_test(test_id):
    existing = Test.find_by_id(test_id)
    if not existing:
        raise ValueError("Test not found")
    Test.delete(test_id)
    return True
