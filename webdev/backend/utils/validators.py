"""
Input sanitization & validation helpers.

Defense-in-depth: React escapes by default, and all SQL is parameterized, but
we still strip HTML tags server-side on user-submitted text (stored XSS guard)
and enforce strict length limits on every field (DoS + storage guard).
"""

import re
import bleach

# Strip ALL HTML — admin & user fields are plain text
_ALLOWED_TAGS: list[str] = []
_ALLOWED_ATTRS: dict = {}

# Hard caps — values above these are rejected at the edge.
MAX_NAME      = 100
MAX_EMAIL     = 254
MAX_PHONE     = 20
MAX_SHORT     = 200          # title, category, role
MAX_URL       = 500
MAX_TEXT      = 2_000        # descriptions, answers, quotes
MAX_LONG      = 10_000       # freeform HTML-free text blocks
MAX_SLUG      = 80
MAX_LANG      = 5


def clean_text(
    value,
    max_len: int = MAX_TEXT,
    *,
    allow_empty: bool = True,
    strip_html: bool = True,
) -> str:
    """
    Normalize a user-submitted string:
      - coerce to str, strip whitespace
      - strip all HTML tags (default) — blocks stored XSS
      - collapse control chars
      - truncate to max_len
    Returns "" if input is None (when allow_empty=True).
    """
    if value is None:
        if allow_empty:
            return ""
        raise ValueError("value is required")
    if not isinstance(value, str):
        value = str(value)
    value = value.strip()
    if strip_html:
        value = bleach.clean(value, tags=_ALLOWED_TAGS, attributes=_ALLOWED_ATTRS, strip=True)
    # remove NULL bytes and other C0 control chars except tab/newline
    value = re.sub(r"[\x00-\x08\x0B\x0C\x0E-\x1F]", "", value)
    return value[:max_len]


def clean_optional(value, max_len: int = MAX_SHORT, **kw) -> str | None:
    """Same as clean_text but returns None instead of empty string."""
    out = clean_text(value, max_len, **kw)
    return out or None


_SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9_-]{0,78}[a-z0-9]$")

def clean_slug(value, max_len: int = MAX_SLUG) -> str:
    """
    Slugs must be `[a-z0-9_-]+`. Anything else is rejected.
    """
    v = (value or "").strip().lower()
    v = v[:max_len]
    if not v or not _SLUG_RE.match(v):
        raise ValueError("invalid slug")
    return v


def clean_int(value, *, min_value: int | None = None, max_value: int | None = None) -> int:
    try:
        n = int(value)
    except (TypeError, ValueError):
        raise ValueError("invalid integer")
    if min_value is not None and n < min_value:
        raise ValueError(f"value must be >= {min_value}")
    if max_value is not None and n > max_value:
        raise ValueError(f"value must be <= {max_value}")
    return n


def clean_float(value, *, min_value: float | None = None, max_value: float | None = None,
                step: float | None = None) -> float:
    """Parse a float, clamp to [min,max], optionally snap to a step grid.

    Used for testimonial ratings (0.5-step, 1..5). Rejects NaN/inf.
    """
    try:
        n = float(value)
    except (TypeError, ValueError):
        raise ValueError("invalid number")
    if n != n or n in (float("inf"), float("-inf")):  # NaN / inf guard
        raise ValueError("invalid number")
    if step:
        n = round(n / step) * step
    if min_value is not None and n < min_value:
        n = min_value
    if max_value is not None and n > max_value:
        n = max_value
    return round(n, 1)


_LANGS = ("uk", "ru")

def clean_lang(value, default: str = "uk") -> str:
    """Whitelist a UI language code. Anything unknown falls back to default."""
    v = (value or "").strip().lower()[:MAX_LANG]
    return v if v in _LANGS else default


def clean_bool(value) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    if isinstance(value, str):
        return value.strip().lower() in ("1", "true", "yes", "on")
    return False
