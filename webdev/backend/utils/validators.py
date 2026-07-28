"""
Input sanitization & validation helpers.

Defense-in-depth: React escapes by default, and all SQL is parameterized, but
we still strip HTML tags server-side on user-submitted text (stored XSS guard)
and enforce strict length limits on every field (DoS + storage guard).
"""

import html
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
MAX_TITLE     = 255          # VARCHAR(255) columns: block/test/template titles
MAX_URL       = 500
MAX_TEXT      = 2_000        # descriptions, answers, quotes
MAX_LONG      = 10_000       # freeform HTML-free text blocks
MAX_SLUG      = 80
MAX_LANG      = 5


class TextTooLong(Exception):
    """A ``strict=True`` field was longer than its column/limit.

    Deliberately NOT a ValueError. Several admin routes already wrap their whole
    body in ``except ValueError`` to emit a generic 400 with ``str(e)``; that
    would flatten this into a plain message and throw away the structured
    payload the SPA needs to point at the offending input. Being its own type,
    it travels untouched to the app-level handler registered in
    middleware/errors.py.

    Carries:
      field            the request key that was too long
      limit            the maximum number of characters accepted
      length           length of the SANITIZED value (what is compared to limit)
      submitted_length length of the raw value as received, after .strip()
    """

    def __init__(self, field, limit, length, submitted_length=None):
        self.field = field or "value"
        self.limit = int(limit)
        self.length = int(length)
        self.submitted_length = int(submitted_length if submitted_length is not None else length)
        super().__init__(
            f"Field '{self.field}' is too long: {self.length} characters after "
            f"sanitization, the maximum is {self.limit}."
        )

    def to_dict(self) -> dict:
        return {
            "error": str(self),
            "code": "field_too_long",
            "field": self.field,
            "limit": self.limit,
            "length": self.length,
            "submitted_length": self.submitted_length,
        }


def _bleach(value: str) -> str:
    return bleach.clean(value, tags=_ALLOWED_TAGS, attributes=_ALLOWED_ATTRS, strip=True)


# --- CPU guard -------------------------------------------------------------
# bleach's HTML parser is superlinear in the input length: clean_content on
# "<>" * n costs ~0.3 s at 40 000 chars, ~4.4 s at 400 000 and ~13 s at 800 000.
# Truncation to max_len happens at the END of clean_text, so before this guard
# the WHOLE raw body was parsed first. server.py caps a request at 25 MB and
# PATCH /submissions/{id} — reachable by anyone, the submission_token is issued
# by the public POST — feeds free text plus every string inside answers_json /
# block_scores_json / selected_answers_json into the sanitizer, at 60 requests
# per minute per IP. That is a one-client CPU-exhaustion lever on a gunicorn
# worker, so the RAW input is cut before it ever reaches the parser.
#
# The budget is deliberately generous. Sanitizing only ever REMOVES markup (the
# escaping path can grow the output, but never the plain text behind it), so a
# field capped at max_len can never legitimately need more than a few times
# max_len of input. 4x plus a 4 KB floor leaves 40 000 chars for a 10 000-char
# description — far above anything a human authors into a plain-text field — and
# holds the worst case to ~0.3 s. Cutting can only hand the sanitizer a
# DIFFERENT string, which is then sanitized in full, so this can never weaken
# the stripping.
_INPUT_HEADROOM = 4
_MIN_INPUT_BUDGET = 4_096


def _cap_raw_input(value: str, max_len: int) -> str:
    budget = max(int(max_len) * _INPUT_HEADROOM, _MIN_INPUT_BUDGET)
    return value if len(value) <= budget else value[:budget]


# How many strip/unescape rounds _strip_to_plain_text may take before it gives
# up and falls back to the (always safe) escaped output. Nested payloads such as
# `<<script>script>x<</script>/script>` need 2; 5 is head-room, not a guess.
_PLAIN_TEXT_ROUNDS = 5


def _strip_to_plain_text(value: str) -> str:
    """Remove markup and return the PLAIN TEXT, with `<`, `>`, `&` literal.

    bleach removes tags but HTML-escapes whatever text is left, so a single pass
    turns "оборот < 500 000" into "оборот &lt; 500 000". Undoing that escaping in
    one shot is NOT safe: bleach's own parser resolves entities, so both
    `&amp;lt;script&amp;gt;` and `<<script>script>x<</script>/script>` come back
    out as `&lt;script&gt;` and would be revived into a live tag.

    So strip and unescape REPEATEDLY until the value stops changing. A complete
    tag can never be a fixed point (bleach would remove it, changing the value),
    while a lone `<` that bleach does not read as a tag opener is stable after
    the first round. If the value is still moving after _PLAIN_TEXT_ROUNDS —
    which no payload in the fuzz corpus manages — we keep the escaped output,
    trading readability for safety.
    """
    escaped = _bleach(html.unescape(value))
    current = html.unescape(escaped)
    for _ in range(_PLAIN_TEXT_ROUNDS):
        nxt = html.unescape(_bleach(current))
        if nxt == current:
            return current
        current = nxt
    return _bleach(current)


def clean_text(
    value,
    max_len: int = MAX_TEXT,
    *,
    allow_empty: bool = True,
    strip_html: bool = True,
    unescape_entities: bool = False,
    strict: bool = False,
    field: str | None = None,
) -> str:
    """
    Normalize a user-submitted string:
      - coerce to str, strip whitespace
      - strip all HTML tags (default) — blocks stored XSS
      - collapse control chars
      - truncate to max_len
    Returns "" if input is None (when allow_empty=True).

    `unescape_entities` — see clean_content() below. Off by default so the
    behavior of every existing caller is unchanged.

    `strict` — raise TextTooLong instead of TRUNCATING when the sanitized value
    is longer than max_len. Off by default: the public write paths (PATCH
    /submissions, the nested answers_json / block_scores_json walk) receive
    machine-generated payloads where clipping an oversized value is the correct,
    non-blocking behavior. Turn it on for content a human AUTHORS in the admin
    panel, where a silent 405 → 255 truncation is data loss the author never
    sees. `field` names the offending key in the error.
    """
    if value is None:
        if allow_empty:
            return ""
        raise ValueError("value is required")
    if not isinstance(value, str):
        value = str(value)
    value = value.strip()
    submitted_length = len(value)
    # Bound the parser's input BEFORE sanitizing — see _cap_raw_input.
    value = _cap_raw_input(value, max_len)
    if strip_html:
        value = _strip_to_plain_text(value) if unescape_entities else _bleach(value)
    # remove NULL bytes and other C0 control chars except tab/newline
    value = re.sub(r"[\x00-\x08\x0B\x0C\x0E-\x1F]", "", value)
    if strict and len(value) > max_len:
        raise TextTooLong(field, max_len, len(value), submitted_length)
    return value[:max_len]


def clean_optional(value, max_len: int = MAX_SHORT, **kw) -> str | None:
    """Same as clean_text but returns None instead of empty string."""
    out = clean_text(value, max_len, **kw)
    return out or None


# ---------------------------------------------------------------------------
# Authored content (quiz blocks / questions / answers, catalog copy)
# ---------------------------------------------------------------------------
# bleach removes tags but HTML-ESCAPES whatever text is left, so `<`, `>` and
# `&` come back as `&lt;`, `&gt;`, `&amp;`. That is correct for something being
# re-injected into HTML and WRONG for something being stored as plain text:
# quiz copy legitimately contains "оборот < 500 000 грн" and "R&D", and those
# rows are re-emitted by consumers that do NOT interpret HTML (the PDF, the
# Excel export, Telegram messages built with their own escaper). Storing the
# entity would show the user a literal "&lt;".
#
# clean_content() therefore strips the markup and then undoes exactly that one
# escaping pass, storing the plain-text content of the input. clean_text() keeps
# its original behavior for every field that already uses it.

def clean_content(value, max_len: int = MAX_LONG, **kw) -> str:
    """clean_text() for authored content — keeps `<`, `>`, `&` literal."""
    return clean_text(value, max_len, unescape_entities=True, **kw)


def clean_content_optional(value, max_len: int = MAX_LONG, **kw) -> str | None:
    """clean_content() that returns None instead of an empty string."""
    out = clean_content(value, max_len, **kw)
    return out or None


# ---------------------------------------------------------------------------
# Authored content, STRICT (admin write paths)
# ---------------------------------------------------------------------------
# clean_content() truncates at the column width and the route answers 200: a
# 405-character block title is stored as 255 and the admin who typed it is told
# nothing. On manually authored quiz copy that is silent data loss.
#
# These two wrappers raise TextTooLong instead, which middleware/errors.py turns
# into a 400 naming the field and the limit. Rejection (rather than "save +
# warn") is the right trade here because the admin SPA already caps every one of
# these inputs with a matching `maxLength` (255 on titles, 2 000 on
# descriptions), and the largest authored value in the production dump is an
# 81-char block title against a 255 limit and a 282-char question against
# 10 000 — so nothing legitimate is anywhere near a cap and a 400 can only ever
# be reached by a client that bypassed the form. Saving a half-value and hoping
# a warning is read would leave a corrupted row behind either way.
#
# Public / machine-generated paths (PATCH /submissions, the answers_json walk in
# clean_json_content) keep the lenient truncating behavior on purpose: they must
# not start failing a visitor's quiz because a payload grew.

def clean_authored(value, max_len: int = MAX_LONG, field: str | None = None) -> str:
    """clean_content() that REJECTS (TextTooLong) instead of truncating."""
    return clean_content(value, max_len, strict=True, field=field)


def clean_authored_optional(value, max_len: int = MAX_LONG,
                            field: str | None = None) -> str | None:
    """clean_content_optional() that REJECTS instead of truncating."""
    return clean_content_optional(value, max_len, strict=True, field=field)


# Depth guard for clean_json_content — a deeply nested payload must not blow the
# Python recursion limit and turn into a 500.
_JSON_MAX_DEPTH = 12

# Total characters ONE clean_json_content() walk may push through the HTML
# parser. _cap_raw_input bounds a single string, but a JSON body can carry
# thousands of them (the request cap is 25 MB), so the per-string bound alone
# still multiplies. Sized from the production dump (bizzcheck_local.sql): the
# largest stored answers_json / block_scores_json / selected_answers_json is
# 763 bytes, so 32 KB is ~40x headroom for authored content while holding the
# worst case to a fraction of a second of CPU.
_JSON_TEXT_BUDGET = 32 * 1024


def clean_json_content(value, max_len: int = MAX_LONG, *, _depth: int = 0, _budget=None):
    """Recursively sanitize every STRING inside a JSON-shaped value.

    Used for the nested payloads: a test's `zone_recommendations`, and a
    submission's `answers_json` / `block_scores_json` / `selected_answers_json`
    (block titles and answer labels from those end up in the Excel export and
    in the admin HTML report).

    Numbers, booleans and None are returned UNTOUCHED — pushing them through a
    text sanitizer would stringify them and corrupt the scoring data. Dict keys
    are sanitized too: they are rendered as labels downstream.

    `_budget` is the shared remaining parser-input allowance for the whole walk
    (see _JSON_TEXT_BUDGET); strings past it are truncated, never left raw.
    """
    if _budget is None:
        _budget = [_JSON_TEXT_BUDGET]
    if _depth > _JSON_MAX_DEPTH:
        return None
    if isinstance(value, str):
        return _clean_json_str(value, max_len, _budget)
    if isinstance(value, dict):
        return {
            _clean_json_str(str(k), MAX_SHORT, _budget):
                clean_json_content(v, max_len, _depth=_depth + 1, _budget=_budget)
            for k, v in value.items()
        }
    if isinstance(value, (list, tuple)):
        return [
            clean_json_content(v, max_len, _depth=_depth + 1, _budget=_budget)
            for v in value
        ]
    # int / float / bool / None — pass through by design.
    return value


def _clean_json_str(value: str, max_len: int, budget: list) -> str:
    """Sanitize one string and charge the walk's shared parser budget."""
    if budget[0] <= 0:
        return ""
    cap = min(max_len, budget[0])
    # Charge what the parser will actually see (clean_text cuts the raw input to
    # cap * _INPUT_HEADROOM before bleaching).
    budget[0] -= min(len(value), max(cap * _INPUT_HEADROOM, _MIN_INPUT_BUDGET))
    return clean_content(value, cap)


# Start and end on an alphanumeric, `_`/`-` only in between — but a slug of
# EXACTLY ONE character is valid (the `(?:...)?` group). services/test_service.py
# and services/template_service.py validate with `^[a-z0-9][a-z0-9_-]{0,63}$`,
# which accepts one character, and those are the regexes that created every
# stored row. clean_slug now runs IN FRONT of them (routes/tests.py,
# routes/templates.py) and the admin edit modal re-sends the stored slug on
# every PUT, so rejecting a 1-char slug here would make such a row permanently
# unsaveable from the admin panel — a 400 on edits that never touch the slug.
_SLUG_RE = re.compile(r"^[a-z0-9](?:[a-z0-9_-]{0,78}[a-z0-9])?$")

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


_LANGS = ("uk", "en")

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
