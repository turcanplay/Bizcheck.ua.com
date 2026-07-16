"""Template service — business logic for document templates."""

import re
from models.template import Template
from models.template_file import TemplateFile

_SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9_-]{0,63}$")


def _serialize(t):
    if not t:
        return t
    t = dict(t)
    t["created_at"] = str(t["created_at"])
    if t.get("price") is not None:
        t["price"] = float(t["price"])
    return t


def _serialize_file(f):
    if not f:
        return f
    f = dict(f)
    f["created_at"] = str(f["created_at"])
    return f


def _auto_slug(title_uk, title_ru):
    base = (title_uk or title_ru or "").lower().strip()
    base = re.sub(r"[^a-z0-9]+", "-", base).strip("-")
    return (base or "sablon")[:64]


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


# ---- Templates ----

def list_active_templates():
    return [_serialize(t) for t in (Template.find_active() or [])]


def list_all_templates():
    return [_serialize(t) for t in (Template.find_all() or [])]


def get_template_with_files(template_id):
    t = Template.find_by_id(template_id)
    if not t:
        return None
    result = _serialize(t)
    result["files"] = [_serialize_file(f) for f in (TemplateFile.find_by_template(template_id) or [])]
    return result


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


def create_template(slug, title_uk, title_ru, description_uk="", description_ru="",
                    is_active=True, is_paid=False, price=None, currency="MDL",
                    category=None, features=None, is_coming_soon=False):
    title_uk = (title_uk or "").strip()
    title_ru = (title_ru or "").strip()
    if not title_uk and not title_ru:
        raise ValueError("At least one title (RO or RU) is required")
    slug = (slug or "").strip().lower() or _auto_slug(title_uk, title_ru)
    if not _SLUG_RE.match(slug):
        raise ValueError("Invalid slug (lowercase letters, digits, _ and -, max 64 chars)")
    if Template.find_by_slug(slug):
        raise ValueError("Slug already exists")

    norm_price = _norm_price(price) if is_paid else None
    norm_currency = _norm_currency(currency)

    return _serialize(Template.create(
        slug, title_uk[:255], title_ru[:255],
        (description_uk or "").strip(),
        (description_ru or "").strip(),
        bool(is_active), bool(is_paid),
        norm_price, norm_currency,
        _norm_category(category),
        _norm_features(features),
        is_coming_soon=bool(is_coming_soon),
    ))


def update_template(template_id, data):
    existing = Template.find_by_id(template_id)
    if not existing:
        raise ValueError("Template not found")
    slug = (data.get("slug") or existing["slug"]).strip().lower()
    if not _SLUG_RE.match(slug):
        raise ValueError("Invalid slug")
    if slug != existing["slug"] and Template.find_by_slug(slug):
        raise ValueError("Slug already exists")

    is_paid = bool(data.get("is_paid", existing.get("is_paid", False)))
    raw_price = data.get("price") if "price" in data else existing.get("price")
    price = _norm_price(raw_price) if is_paid else None
    currency = _norm_currency(
        data.get("currency") if "currency" in data else existing.get("currency", "MDL")
    )

    features = _norm_features(data.get("features")) if "features" in data else None
    return _serialize(Template.update(
        template_id,
        slug,
        (data.get("title_uk") or existing["title_uk"]).strip()[:255],
        (data.get("title_ru") or existing["title_ru"]).strip()[:255],
        (data.get("description_uk") if data.get("description_uk") is not None
            else existing["description_uk"]).strip(),
        (data.get("description_ru") if data.get("description_ru") is not None
            else existing["description_ru"]).strip(),
        bool(data.get("is_active", existing["is_active"])),
        is_paid, price, currency,
        _norm_category(data.get("category") if "category" in data else existing.get("category")),
        features,
        is_coming_soon=bool(data.get("is_coming_soon", existing.get("is_coming_soon", False))),
    ))


def delete_template(template_id):
    existing = Template.find_by_id(template_id)
    if not existing:
        raise ValueError("Template not found")
    Template.delete(template_id)
    return True


# ---- Files ----

def add_file(template_id, filename, pdf_bytes):
    if not Template.find_by_id(template_id):
        raise ValueError("Template not found")
    if not pdf_bytes or not pdf_bytes.startswith(b"%PDF"):
        raise ValueError("File is not a valid PDF")
    safe_name = re.sub(r"[^\w\-. ()]+", "_", filename or "document.pdf").strip() or "document.pdf"
    if not safe_name.lower().endswith(".pdf"):
        safe_name += ".pdf"
    existing_files = TemplateFile.find_by_template(template_id) or []
    order = len(existing_files)
    return _serialize_file(TemplateFile.create(template_id, safe_name[:255], pdf_bytes, order))


def delete_file(file_id):
    existing = TemplateFile.find_by_id(file_id)
    if not existing:
        raise ValueError("File not found")
    TemplateFile.delete(file_id)
    return True


def get_file_raw(file_id):
    """Return (filename, bytes) for a single file, or None."""
    row = TemplateFile.find_by_id(file_id)
    if not row or not row.get("pdf_data"):
        return None
    data = row["pdf_data"]
    data = bytes(data) if isinstance(data, memoryview) else bytes(data)
    return row["filename"], data


def iter_template_files_raw(template_id):
    """Yield (filename, bytes) for each file attached to a template."""
    from database.db import query as _q
    rows = _q(
        """SELECT filename, pdf_data FROM template_files
           WHERE template_id = %s
           ORDER BY order_index ASC, id ASC""",
        (template_id,), fetch_all=True,
    ) or []
    for r in rows:
        data = r["pdf_data"]
        data = bytes(data) if isinstance(data, memoryview) else bytes(data)
        yield r["filename"], data
