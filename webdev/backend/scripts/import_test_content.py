#!/usr/bin/env python3
"""Import one test's whole content (blocks -> questions -> answers) through the
ADMIN HTTP API — never through SQL.

    cd webdev/backend
    venv/bin/python scripts/import_test_content.py --json content/gdpr.json --dry-run
    ADMIN_USERNAME=admin ADMIN_PASSWORD=... \
        venv/bin/python scripts/import_test_content.py --json content/gdpr.json

WHY THE API AND NOT `INSERT INTO`
---------------------------------
A fresh install starts EMPTY on purpose: `migrate()` only creates tables, it
never seeds (see CLAUDE.md, "Don'ts"), and quiz content is typed into the admin
panel. This script is the PROGRAMMATIC EQUIVALENT OF THAT PANEL, nothing more —
it clicks the same buttons faster. Going through HTTP means the import inherits,
for free and without duplicating a line of it:

  * sanitization — every authored string passes `clean_authored` /
    `clean_authored_optional` (bleach strip + control-char removal + length
    cap). Raw INSERTs would put unsanitized text in front of the PDF report,
    the Excel export and the Telegram messages, none of which escape on render;
  * validation — slug regex (`clean_slug`), the canonical `report_type` set
    from `services/test_service.py`, "at least 2 answers per question",
    `clean_int` on every id/index, `_clean_score` on every weight;
  * cache invalidation — `invalidate_quiz_cache()` fires inside the services.
    A direct INSERT leaves the public `/blocks/quiz` payload stale until the
    next restart;
  * the auth model — admin cookie + CSRF double-submit, exactly like a browser.

A SQL importer would have to re-implement all four and would silently rot the
day any of them changes.

WHY TWO PASSES
--------------
Branching is a forward reference: an answer on question 1 can send the user to
question 7, which does not exist yet when question 1 is created. Same for
`parent_question_id`. So:

  pass 1  create test -> blocks -> every question WITHOUT parent_question_id and
          with every answer's `next_question_id` left NULL; remember ref -> id
  pass 2  PUT only the questions that actually carry a link, now that every ref
          resolves to a real id

`next_question_id` IS a first-class field of the answer payload —
`routes/questions._clean_answers` validates it with `clean_int(min_value=1)` and
`models.answer.Answer.create_many` persists it — so pass 2 needs no backend
change and no workaround.

Note that PUT /questions/<id> REPLACES the answer set (the service deletes and
re-creates them) and always writes `parent_question_id` from the body. Pass 2
therefore re-sends the full answer list AND the resolved parent for every
question it touches, otherwise it would clear what pass 1 stored.

INPUT
-----
See --help and `_validate_plan` below. Refs (`"1"`, `"1.2"`, `"3.1"`) are logical
ids from the source spreadsheet; `parent_ref` / `next_ref` point at other refs
and are resolved to real database ids by this script.

SAFETY
------
Nothing is ever deleted implicitly. If the slug already exists the script stops.
`--replace` (explicit, never a default) deletes that test first — the
tests -> blocks -> questions -> answers ON DELETE CASCADE chain takes the rest
with it.
"""

from __future__ import annotations

import argparse
import http.cookiejar
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

DEFAULT_BASE_URL = "http://localhost:4001"
API = "/api_crowe_bizcheck"

# --- Rate limits this script has to live under (webdev/backend/server.py) ---
#   admin_bp            POST            5/min  + 40/hour   -> the login, once
#   admin_tests_bp      POST/PUT/DELETE 5/min              -> 1 create (+1 delete with --replace)
#   blocks_bp           (default)       200/min            -> one POST per block
#   questions_bp        (default)       200/min            -> one POST + at most one PUT per question
# The binding constraint is therefore the 200/min default bucket, which the
# blocks/questions traffic shares: 60/200 s = 0.3 s between requests is the
# break-even point. 0.4 s keeps ~25% headroom (150 req/min) so a ~25-question
# import — roughly 60 requests, ~25 s — never reaches a 429.
DEFAULT_DELAY = 0.4

# 429 is still handled: the limits are per-minute, so back off in seconds that
# actually outlast a full window rather than milliseconds.
RETRY_BACKOFF = (5.0, 15.0, 30.0, 60.0, 65.0)

# utils/validators.py caps, mirrored here only to fail BEFORE the network call
# with a message that names the field. The backend stays the authority.
MAX_TITLE = 255
MAX_LONG = 10_000
# services/test_service._SLUG_RE
SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9_-]{0,63}$")

# services/test_service.CANONICAL_REPORT_TYPES. Imported when the backend
# package is importable (running from webdev/backend, as documented above), so a
# new layout added there is picked up without touching this file; the literal is
# only the fallback for a copy of the script run outside the tree.
try:
    from services.test_service import CANONICAL_REPORT_TYPES
except Exception:  # noqa: BLE001 - backend package not importable from here
    CANONICAL_REPORT_TYPES = {"bizcheck", "standard", "premium", "gdpr"}


class ImportAbort(Exception):
    """Fail-fast carrier. Its message is the whole error report for the user."""


# ---------------------------------------------------------------------------
# HTTP — cookie jar + automatic CSRF double-submit
# ---------------------------------------------------------------------------

class Response:
    """Normalized HTTP response. `status == 0` means the request never landed."""

    def __init__(self, status, body=None, raw=b"", headers=None, error=None):
        self.status = status
        self.json = body
        self.body = body if isinstance(body, dict) else {}
        self.raw = raw or b""
        self.headers = {str(k).lower(): v for k, v in (headers or {}).items()}
        self.error = error

    @property
    def ok(self):
        return 200 <= self.status < 300

    def describe(self):
        """What to print when this response is the reason we are stopping."""
        if self.error:
            return f"transport error: {self.error}"
        body = self.raw.decode("utf-8", "replace").strip()
        return f"HTTP {self.status} {body[:1000] or '(empty body)'}"


SESSION_COOKIE = "admin_session"
CSRF_COOKIE = "admin_csrf"


class _ContainerCookiePolicy(http.cookiejar.DefaultCookiePolicy):
    """Allow the admin cookies to travel over plain HTTP on the docker network.

    In production `routes/admin._set_admin_cookies` marks `admin_session` and
    `admin_csrf` as Secure (NODE_ENV=production). TLS, however, is terminated by
    the EXTERNAL nginx — the backend itself only ever speaks plain HTTP on
    `backend:4001`, which is `expose:`-only with no host port (CLAUDE.md,
    "Network shape"), and that is exactly where this script has to run.

    http.cookiejar's default policy would happily STORE the session cookie and
    then silently refuse to send it back over http://, so every request after
    the login would come back 401 with no hint as to why. Relaxing this single
    rule is safe here: the hop never leaves the container network.
    """

    def return_ok_secure(self, cookie, request):
        return True


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    """Turn a 3xx into a loud error instead of a silently rewritten request.

    Pointing --base-url at the public nginx instead of the backend would hit an
    http->https 301; urllib would follow it and downgrade the POST to a GET,
    producing a baffling 404/405. Returning None makes urllib raise the
    HTTPError for the 301 itself, which the fail-fast reporter prints verbatim.
    """

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class AdminSession:
    """Stdlib HTTP client that behaves like the admin SPA.

    `http.cookiejar.CookieJar` + `HTTPCookieProcessor` is the stdlib equivalent
    of `requests.Session()`: it parses Set-Cookie, honours expiry/deletion and
    replays the cookies on every subsequent request. On top of that this class
    does the one thing a cookie jar cannot do by itself — read `admin_csrf` back
    OUT of the jar and echo it as the `X-CSRF-Token` header on every unsafe
    method. That double-submit pair IS the admin auth model; there is no Bearer
    fallback, by design (CLAUDE.md).

    `requests` is deliberately NOT used: it is absent from
    backend/requirements.txt AND from the backend image, and this script must
    not add a dependency. urllib is what scripts/e2e_check.py uses for the same
    reason. Everything here is standard library, so the script runs under the
    image's bare `python`.
    """

    SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}

    def __init__(self, base_url=DEFAULT_BASE_URL, timeout=20.0, delay=DEFAULT_DELAY,
                 verbose=False):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.delay = max(0.0, delay)
        self.verbose = verbose
        self.jar = http.cookiejar.CookieJar(policy=_ContainerCookiePolicy())
        # HTTPCookieProcessor.handler_order (500) is below HTTPErrorProcessor's
        # (1000), so cookies are harvested even from a 4xx response.
        self.opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(self.jar), _NoRedirect())
        self._csrf_from_body = ""
        self.request_count = 0
        self._last_sent = 0.0

    # -- cookies -----------------------------------------------------------

    def cookie(self, name):
        """Current value of a cookie in the jar, or ''."""
        for c in self.jar:
            if c.name == name:
                return c.value or ""
        return ""

    @property
    def csrf(self):
        """The CSRF token to echo back as X-CSRF-Token.

        The `admin_csrf` cookie is the source of truth — it is what the server
        compares the header against. The copy returned in the login body is the
        fallback for an environment that strips Set-Cookie.
        """
        return self.cookie(CSRF_COOKIE) or self._csrf_from_body

    # -- low level ---------------------------------------------------------

    def _throttle(self):
        if not self._last_sent:
            return
        wait = self.delay - (time.monotonic() - self._last_sent)
        if wait > 0:
            time.sleep(wait)

    def _send(self, method, path, body):
        headers = {"Accept": "application/json"}
        data = None
        if body is not None:
            data = json.dumps(body, ensure_ascii=False).encode("utf-8")
            headers["Content-Type"] = "application/json"
        # The Cookie header is added by HTTPCookieProcessor; the CSRF header is
        # ours to set, and only matters on the methods the server checks.
        if method not in self.SAFE_METHODS:
            token = self.csrf
            if token:
                headers["X-CSRF-Token"] = token

        req = urllib.request.Request(self.base_url + path, data=data,
                                     method=method, headers=headers)
        self.request_count += 1
        try:
            with self.opener.open(req, timeout=self.timeout) as resp:
                return self._read(resp)
        except urllib.error.HTTPError as exc:
            # urllib raises on >=400 where requests would just return. The body
            # is still on the exception object and it is the useful half of the
            # error (Flask answers with {"error": ...} / {"errors": [...]}),
            # so read it here — the fail-fast message depends on it.
            return self._read(exc)
        except Exception as exc:                     # noqa: BLE001 - transport
            return Response(0, error=f"{type(exc).__name__}: {exc}")
        finally:
            self._last_sent = time.monotonic()

    @staticmethod
    def _read(resp):
        raw = resp.read()
        try:
            parsed = json.loads(raw.decode("utf-8"))
        except Exception:                            # noqa: BLE001 - non-JSON body
            parsed = None
        status = getattr(resp, "status", None) or getattr(resp, "code", 0)
        return Response(status, parsed, raw, dict(resp.headers.items()))

    # -- public ------------------------------------------------------------

    def request(self, method, path, body=None, what=""):
        """Send, pacing to stay under the rate limits, retrying only on 429."""
        for attempt, backoff in enumerate((None,) + RETRY_BACKOFF):
            if backoff is not None:
                # server.py's errorhandler(429) rebuilds the response, dropping
                # flask-limiter's Retry-After — honour it when present anyway,
                # otherwise use our own window-sized backoff.
                wait = backoff
                try:
                    wait = max(wait, float(resp.headers.get("retry-after", 0)))
                except (TypeError, ValueError):
                    pass
                print(f"      rate limited (429) — waiting {wait:.0f}s "
                      f"before retry {attempt}/{len(RETRY_BACKOFF)}", flush=True)
                time.sleep(wait)
            else:
                self._throttle()
            resp = self._send(method, path, body)
            if self.verbose:
                print(f"      {method} {path} -> {resp.status or resp.error}", flush=True)
            if resp.status != 429:
                return resp
        raise ImportAbort(
            f"Still rate limited after {len(RETRY_BACKOFF)} retries while {what or path}.\n"
            f"  Raise --delay and run again."
        )

    def expect(self, method, path, body, what, ok_status=(200, 201)):
        """Fail-fast wrapper: any non-2xx stops the import with the full body."""
        resp = self.request(method, path, body, what=what)
        if resp.status in ok_status:
            return resp
        raise ImportAbort(
            f"{what} FAILED.\n"
            f"  {method} {self.base_url}{path}\n"
            f"  {resp.describe()}\n"
            f"  payload: {json.dumps(body, ensure_ascii=False)[:600] if body is not None else '(none)'}"
        )

    def login(self, username, password):
        resp = self.request("POST", f"{API}/admin/login",
                            {"username": username, "password": password},
                            what="logging in")
        if resp.status != 200:
            raise ImportAbort(
                "Admin login FAILED.\n"
                f"  POST {self.base_url}{API}/admin/login\n"
                f"  {resp.describe()}\n"
                "  Check ADMIN_USERNAME / ADMIN_PASSWORD and --base-url."
            )
        self._csrf_from_body = resp.body.get("csrf_token") or ""
        # Prove the jar actually captured the pair. Without this, a stripped
        # Set-Cookie would only show up much later as an unexplained 401/403 in
        # the middle of the import.
        if not self.cookie(SESSION_COOKIE):
            raise ImportAbort("Login returned 200 but the cookie jar holds no "
                              f"`{SESSION_COOKIE}` — is something rewriting Set-Cookie "
                              "in front of the backend?")
        if not self.csrf:
            raise ImportAbort("Login returned 200 but no CSRF token was issued — "
                              "every write would be rejected with 403.")


# ---------------------------------------------------------------------------
# Plan — the validated, in-memory shape of the JSON file
# ---------------------------------------------------------------------------

class PlannedAnswer:
    __slots__ = ("text_uk", "text_en", "score", "next_ref")

    def __init__(self, text_uk, text_en, score, next_ref):
        self.text_uk = text_uk
        self.text_en = text_en
        self.score = score
        self.next_ref = next_ref


class PlannedQuestion:
    __slots__ = ("ref", "parent_ref", "order_index", "text_uk", "text_en",
                 "note_uk", "note_en", "answers", "block_index", "question_id")

    def __init__(self, ref, parent_ref, order_index, text_uk, text_en,
                 note_uk, note_en, answers, block_index):
        self.ref = ref
        self.parent_ref = parent_ref
        self.order_index = order_index
        self.text_uk = text_uk
        self.text_en = text_en
        self.note_uk = note_uk
        self.note_en = note_en
        self.answers = answers
        self.block_index = block_index
        self.question_id = None          # filled by pass 1

    @property
    def needs_update(self):
        """True when pass 2 has something to write for this question."""
        return bool(self.parent_ref) or any(a.next_ref for a in self.answers)

    def label(self, width=60):
        text = (self.text_uk or self.text_en or "").replace("\n", " ")
        return text[:width] + ("…" if len(text) > width else "")


class PlannedBlock:
    __slots__ = ("order_index", "title_uk", "title_en", "questions", "block_id")

    def __init__(self, order_index, title_uk, title_en, questions):
        self.order_index = order_index
        self.title_uk = title_uk
        self.title_en = title_en
        self.questions = questions
        self.block_id = None             # filled by pass 1


class Plan:
    def __init__(self, test, blocks, source):
        self.test = test
        self.blocks = blocks
        self.source = source
        self.test_id = None

    @property
    def questions(self):
        for block in self.blocks:
            for question in block.questions:
                yield question

    @property
    def counts(self):
        questions = list(self.questions)
        return {
            "blocks": len(self.blocks),
            "questions": len(questions),
            "answers": sum(len(q.answers) for q in questions),
            "parent_links": sum(1 for q in questions if q.parent_ref),
            "next_links": sum(1 for q in questions for a in q.answers if a.next_ref),
            "updates": sum(1 for q in questions if q.needs_update),
        }


# ---------------------------------------------------------------------------
# Loading + validation (no network, no database)
# ---------------------------------------------------------------------------

def _text(value, field, errors, *, max_len=MAX_LONG, required=False):
    if value is None:
        if required:
            errors.append(f"{field}: required")
        return ""
    if not isinstance(value, str):
        errors.append(f"{field}: must be a string, got {type(value).__name__}")
        return ""
    value = value.strip()
    if required and not value:
        errors.append(f"{field}: required (empty string)")
    if len(value) > max_len:
        errors.append(f"{field}: {len(value)} chars, the backend caps it at {max_len}")
    return value


def _optional_text(value, field, errors, *, max_len=MAX_LONG):
    if value in (None, ""):
        return None
    return _text(value, field, errors, max_len=max_len) or None


def _index(value, field, errors, default=0):
    if value is None:
        return default
    if isinstance(value, bool) or not isinstance(value, int):
        errors.append(f"{field}: must be an integer, got {value!r}")
        return default
    if value < 0 or value > 100_000:
        errors.append(f"{field}: must be between 0 and 100000, got {value}")
        return default
    return value


def _ref(value, field, errors, *, required=True):
    if value in (None, ""):
        if required:
            errors.append(f"{field}: required")
        return None
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        value = str(value)          # a spreadsheet ref may arrive as a number
    if not isinstance(value, str):
        errors.append(f"{field}: must be a string, got {type(value).__name__}")
        return None
    value = value.strip()
    if not value:
        errors.append(f"{field}: required (empty string)")
        return None
    return value


def load_plan(path):
    """Read + validate the JSON file. Raises ImportAbort listing EVERY problem."""
    try:
        with open(path, "r", encoding="utf-8") as fh:
            raw = json.load(fh)
    except FileNotFoundError:
        raise ImportAbort(f"Input file not found: {path}")
    except json.JSONDecodeError as exc:
        raise ImportAbort(f"{path} is not valid JSON: {exc}")
    except OSError as exc:
        raise ImportAbort(f"Cannot read {path}: {exc}")
    return _validate_plan(raw, path)


def _validate_plan(raw, source):
    """Turn the parsed JSON into a Plan, or raise with the full list of errors.

    Collects everything instead of stopping at the first problem: fixing a
    content file one error per run is the slowest possible loop.
    """
    errors = []
    if not isinstance(raw, dict):
        raise ImportAbort("Top level of the JSON must be an object with `test` and `blocks`.")

    # -- test --------------------------------------------------------------
    raw_test = raw.get("test")
    if not isinstance(raw_test, dict):
        raise ImportAbort("`test` is missing or is not an object.")

    slug = _text(raw_test.get("slug"), "test.slug", errors, max_len=80, required=True)
    if slug and not SLUG_RE.match(slug):
        errors.append(f"test.slug: {slug!r} is not a valid slug "
                      "(lowercase letters, digits, _ and -, max 64 chars)")
    name_uk = _text(raw_test.get("name_uk"), "test.name_uk", errors, max_len=MAX_TITLE)
    name_en = _text(raw_test.get("name_en"), "test.name_en", errors, max_len=MAX_TITLE)
    if not name_uk and not name_en:
        errors.append("test: at least one of name_uk / name_en is required")
    report_type = _text(raw_test.get("report_type") or "bizcheck",
                        "test.report_type", errors, max_len=32)
    if report_type and report_type not in CANONICAL_REPORT_TYPES:
        errors.append(f"test.report_type: {report_type!r} is not one of "
                      f"{sorted(CANONICAL_REPORT_TYPES)}")

    test = {
        "slug": slug,
        "name_uk": name_uk,
        "name_en": name_en,
        "description_uk": _text(raw_test.get("description_uk"), "test.description_uk", errors),
        "description_en": _text(raw_test.get("description_en"), "test.description_en", errors),
        "report_type": report_type,
    }
    # Optional catalog fields — passed through untouched when present so the
    # importer can carry a full test row, not a stub. The API validates them.
    for key in ("is_active", "is_coming_soon", "is_paid", "price", "currency",
                "category", "features", "scoring_zones", "zone_recommendations",
                "order_index"):
        if key in raw_test:
            test[key] = raw_test[key]

    # -- blocks / questions / answers --------------------------------------
    raw_blocks = raw.get("blocks")
    if not isinstance(raw_blocks, list) or not raw_blocks:
        raise ImportAbort("`blocks` must be a non-empty list.")

    blocks = []
    by_ref = {}
    for b_i, raw_block in enumerate(raw_blocks):
        where = f"blocks[{b_i}]"
        if not isinstance(raw_block, dict):
            errors.append(f"{where}: must be an object")
            continue
        title_uk = _text(raw_block.get("title_uk"), f"{where}.title_uk", errors, max_len=MAX_TITLE)
        title_en = _text(raw_block.get("title_en"), f"{where}.title_en", errors, max_len=MAX_TITLE)
        if not title_uk and not title_en:
            errors.append(f"{where}: at least one of title_uk / title_en is required")

        raw_questions = raw_block.get("questions")
        if not isinstance(raw_questions, list) or not raw_questions:
            errors.append(f"{where}.questions: must be a non-empty list")
            raw_questions = []

        questions = []
        for q_i, raw_q in enumerate(raw_questions):
            q_where = f"{where}.questions[{q_i}]"
            if not isinstance(raw_q, dict):
                errors.append(f"{q_where}: must be an object")
                continue
            ref = _ref(raw_q.get("ref"), f"{q_where}.ref", errors)
            if ref and ref in by_ref:
                errors.append(f"{q_where}.ref: duplicate ref {ref!r} — refs must be unique "
                              "across the whole file")
                ref = None
            text_uk = _text(raw_q.get("text_uk"), f"{q_where}.text_uk", errors)
            text_en = _text(raw_q.get("text_en"), f"{q_where}.text_en", errors)
            if not text_uk and not text_en:
                errors.append(f"{q_where}: at least one of text_uk / text_en is required")

            raw_answers = raw_q.get("answers")
            if not isinstance(raw_answers, list):
                errors.append(f"{q_where}.answers: must be a list")
                raw_answers = []
            # services/question_service.create_question rejects fewer than 2.
            if len(raw_answers) < 2:
                errors.append(f"{q_where}.answers: {len(raw_answers)} given, the backend "
                              "requires at least 2 answer options")

            answers = []
            for a_i, raw_a in enumerate(raw_answers):
                a_where = f"{q_where}.answers[{a_i}]"
                if not isinstance(raw_a, dict):
                    errors.append(f"{a_where}: must be an object")
                    continue
                a_uk = _text(raw_a.get("text_uk"), f"{a_where}.text_uk", errors)
                a_en = _text(raw_a.get("text_en"), f"{a_where}.text_en", errors)
                if not a_uk and not a_en:
                    errors.append(f"{a_where}: at least one of text_uk / text_en is required")
                score = raw_a.get("score", 0)
                if isinstance(score, bool) or not isinstance(score, (int, float)):
                    errors.append(f"{a_where}.score: must be a number, got {score!r}")
                    score = 0
                elif score != score or score in (float("inf"), float("-inf")):
                    errors.append(f"{a_where}.score: must be a finite number")
                    score = 0
                answers.append(PlannedAnswer(
                    a_uk, a_en, float(score),
                    _ref(raw_a.get("next_ref"), f"{a_where}.next_ref", errors, required=False),
                ))

            question = PlannedQuestion(
                ref=ref,
                parent_ref=_ref(raw_q.get("parent_ref"), f"{q_where}.parent_ref",
                                errors, required=False),
                order_index=_index(raw_q.get("order_index"), f"{q_where}.order_index",
                                   errors, default=q_i),
                text_uk=text_uk,
                text_en=text_en,
                note_uk=_optional_text(raw_q.get("note_uk"), f"{q_where}.note_uk", errors),
                note_en=_optional_text(raw_q.get("note_en"), f"{q_where}.note_en", errors),
                answers=answers,
                block_index=b_i,
            )
            questions.append(question)
            if ref:
                by_ref[ref] = question

        blocks.append(PlannedBlock(
            order_index=_index(raw_block.get("order_index"), f"{where}.order_index",
                               errors, default=b_i),
            title_uk=title_uk,
            title_en=title_en,
            questions=questions,
        ))

    _validate_refs(blocks, by_ref, errors)

    if errors:
        raise ImportAbort(
            f"{len(errors)} problem(s) in {source} — nothing was sent:\n  · "
            + "\n  · ".join(errors)
        )
    return Plan(test, blocks, source)


def _validate_refs(blocks, by_ref, errors):
    """Every parent_ref / next_ref must resolve, and parents must not loop."""
    for block in blocks:
        for question in block.questions:
            here = f"question ref={question.ref!r}"
            if question.parent_ref:
                if question.parent_ref not in by_ref:
                    errors.append(f"{here}: parent_ref {question.parent_ref!r} "
                                  "does not match any question ref in this file")
                elif question.parent_ref == question.ref:
                    errors.append(f"{here}: parent_ref points at itself")
            for a_i, answer in enumerate(question.answers):
                if answer.next_ref and answer.next_ref not in by_ref:
                    errors.append(f"{here} answers[{a_i}]: next_ref {answer.next_ref!r} "
                                  "does not match any question ref in this file")

    # `questions.parent_question_id` is a self-FK; a cycle would be accepted by
    # Postgres and then hang the client walking the tree. Catch it here.
    for question in by_ref.values():
        seen, cursor = [], question
        while cursor is not None and cursor.parent_ref:
            if cursor.parent_ref == cursor.ref:
                break                    # self-parent, already reported above
            if cursor.parent_ref in seen:
                errors.append(f"question ref={question.ref!r}: parent_ref chain is a cycle "
                              f"({' -> '.join(seen + [cursor.parent_ref])})")
                break
            seen.append(cursor.parent_ref)
            cursor = by_ref.get(cursor.parent_ref)


# ---------------------------------------------------------------------------
# Payload builders — one place that knows the API's field names
# ---------------------------------------------------------------------------

def _answer_payload(answer, resolve=None):
    """`next_question_id` is a real field of the answer payload.

    routes/questions._clean_answers keeps exactly four keys:
        text_uk, text_en, score, next_question_id
    and validates the last one with clean_int(min_value=1). Pass 1 sends None
    (refs are not resolvable yet), pass 2 sends the resolved id.
    """
    payload = {
        "text_uk": answer.text_uk,
        "text_en": answer.text_en,
        "score": answer.score,
        "next_question_id": None,
    }
    if resolve is not None and answer.next_ref:
        payload["next_question_id"] = resolve(answer.next_ref)
    return payload


def _question_payload(question, block_id):
    return {
        "block_id": block_id,
        "text_uk": question.text_uk,
        "text_en": question.text_en,
        "note_uk": question.note_uk,
        "note_en": question.note_en,
        "order_index": question.order_index,
        # Pass 1: no parent yet — the target question may not exist.
        "parent_question_id": None,
        "answers": [_answer_payload(a) for a in question.answers],
    }


# ---------------------------------------------------------------------------
# Dry run
# ---------------------------------------------------------------------------

def print_plan(plan, base_url, delay, replace):
    counts = plan.counts
    print()
    print("=" * 72)
    print("DRY RUN — nothing will be sent, nothing will be written")
    print("=" * 72)
    print(f"source   : {plan.source}")
    print(f"target   : {base_url}")
    print(f"on slug conflict: {'DELETE the existing test (--replace)' if replace else 'stop'}")
    print()
    print("TEST")
    print(f"  slug        : {plan.test['slug']}")
    print(f"  name_uk     : {plan.test['name_uk'] or '(empty)'}")
    print(f"  name_en     : {plan.test['name_en'] or '(empty)'}")
    print(f"  report_type : {plan.test['report_type']}")
    print(f"  description : {len(plan.test['description_uk'])} chars uk / "
          f"{len(plan.test['description_en'])} chars en")
    extra = sorted(k for k in plan.test if k not in
                   {"slug", "name_uk", "name_en", "description_uk", "description_en", "report_type"})
    if extra:
        print(f"  also sent   : {', '.join(extra)}")

    print()
    print(f"CONTENT — {counts['blocks']} block(s), {counts['questions']} question(s), "
          f"{counts['answers']} answer(s)")
    n_blocks = len(plan.blocks)
    for b_i, block in enumerate(plan.blocks, 1):
        print(f"  [{b_i}/{n_blocks}] block order={block.order_index} "
              f"\"{block.title_uk or block.title_en}\" — {len(block.questions)} question(s)")
        n_q = len(block.questions)
        for q_i, question in enumerate(block.questions, 1):
            parent = f" parent={question.parent_ref}" if question.parent_ref else ""
            print(f"        [{q_i}/{n_q}] ref={question.ref} order={question.order_index}"
                  f"{parent} — \"{question.label()}\"")
            for answer in question.answers:
                nxt = f"  -> next ref={answer.next_ref}" if answer.next_ref else ""
                label = (answer.text_uk or answer.text_en or "").replace("\n", " ")
                print(f"              · score={answer.score:g}  \"{label[:40]}\"{nxt}")

    print()
    print("BRANCHING")
    print(f"  parent links : {counts['parent_links']}")
    for question in plan.questions:
        if question.parent_ref:
            print(f"      ref {question.ref}  parent_question_id -> ref {question.parent_ref}")
    print(f"  next links   : {counts['next_links']}")
    for question in plan.questions:
        for a_i, answer in enumerate(question.answers):
            if answer.next_ref:
                print(f"      ref {question.ref} answer[{a_i}]  "
                      f"next_question_id -> ref {answer.next_ref}")

    requests = 1 + (1 if replace else 0) + 1 + counts["blocks"] \
        + counts["questions"] + counts["updates"]
    print()
    print("PLANNED REQUESTS")
    print(f"  1 login"
          + (" + 1 admin GET/DELETE for --replace" if replace else "")
          + f" + 1 POST /admin/tests + {counts['blocks']} POST /blocks")
    print(f"  pass 1: {counts['questions']} POST /questions (no links)")
    print(f"  pass 2: {counts['updates']} PUT /questions/<id> (parent + next_question_id)")
    print(f"  ~{requests} requests, --delay {delay}s -> ~{requests * delay:.0f}s")
    print()
    print("Re-run without --dry-run to write it.")


# ---------------------------------------------------------------------------
# Import
# ---------------------------------------------------------------------------

def find_test_by_slug(session, slug):
    resp = session.expect("GET", f"{API}/admin/tests", None,
                          f"listing existing tests (looking for slug {slug!r})",
                          ok_status=(200,))
    for test in resp.body.get("tests") or []:
        if test.get("slug") == slug:
            return test
    return None


def run_import(session, plan, replace=False):
    slug = plan.test["slug"]

    existing = find_test_by_slug(session, slug)
    if existing and not replace:
        raise ImportAbort(
            f"A test with slug {slug!r} already exists (id={existing.get('id')}, "
            f"name={existing.get('name_uk') or existing.get('name_en')!r}).\n"
            "  Nothing was written. Choose another slug, or re-run with --replace to\n"
            "  DELETE that test first — the cascade takes its blocks, questions and\n"
            "  answers with it, and that is irreversible."
        )
    if existing:
        print(f"--replace: deleting existing test id={existing['id']} slug={slug!r} "
              "(blocks/questions/answers cascade)", flush=True)
        session.expect("DELETE", f"{API}/admin/tests/{existing['id']}", None,
                       f"deleting the existing test {slug!r}", ok_status=(200,))

    # -- test --------------------------------------------------------------
    resp = session.expect("POST", f"{API}/admin/tests", plan.test,
                          f"creating the test {slug!r}")
    plan.test_id = resp.body["test"]["id"]
    print(f"test  #{plan.test_id}  slug={slug}  report_type={plan.test['report_type']}",
          flush=True)

    # -- pass 1: blocks, questions, answers (no links) ----------------------
    counts = plan.counts
    print(f"\npass 1/2 — creating {counts['blocks']} block(s), "
          f"{counts['questions']} question(s), {counts['answers']} answer(s)", flush=True)
    by_ref = {}
    q_done = 0
    for b_i, block in enumerate(plan.blocks, 1):
        resp = session.expect("POST", f"{API}/blocks", {
            "test_id": plan.test_id,
            "title_uk": block.title_uk,
            "title_en": block.title_en,
            "order_index": block.order_index,
        }, f"creating block {b_i}/{counts['blocks']} "
           f"\"{block.title_uk or block.title_en}\"")
        block.block_id = resp.body["block"]["id"]
        print(f"  [{b_i}/{counts['blocks']}] block #{block.block_id} "
              f"\"{block.title_uk or block.title_en}\"", flush=True)

        for question in block.questions:
            q_done += 1
            resp = session.expect(
                "POST", f"{API}/questions", _question_payload(question, block.block_id),
                f"creating question {q_done}/{counts['questions']} (ref={question.ref})")
            question.question_id = resp.body["question"]["id"]
            by_ref[question.ref] = question.question_id
            print(f"        [{q_done}/{counts['questions']}] question #{question.question_id} "
                  f"ref={question.ref} ({len(question.answers)} answers) "
                  f"\"{question.label(48)}\"", flush=True)

    # -- pass 2: resolve refs ----------------------------------------------
    if not counts["updates"]:
        print("\npass 2/2 — no parent_ref / next_ref in this file, nothing to link", flush=True)
    else:
        print(f"\npass 2/2 — linking {counts['parent_links']} parent(s) and "
              f"{counts['next_links']} branch(es) across {counts['updates']} question(s)",
              flush=True)

        def resolve(ref):
            qid = by_ref.get(ref)
            if qid is None:      # unreachable: _validate_refs already proved it
                raise ImportAbort(f"Internal error: ref {ref!r} has no created question id.")
            return qid

        done = 0
        for question in plan.questions:
            if not question.needs_update:
                continue
            done += 1
            # PUT replaces the answer set and always rewrites
            # parent_question_id, so BOTH have to be re-sent in full even when
            # only one of them changed — see the module docstring.
            payload = {
                "block_id": plan.blocks[question.block_index].block_id,
                "order_index": question.order_index,
                "parent_question_id": resolve(question.parent_ref) if question.parent_ref else None,
                "answers": [_answer_payload(a, resolve) for a in question.answers],
            }
            session.expect("PUT", f"{API}/questions/{question.question_id}", payload,
                           f"linking question {done}/{counts['updates']} "
                           f"(ref={question.ref}, id={question.question_id})")
            links = [f"answer[{i}]->#{payload['answers'][i]['next_question_id']}"
                     for i, a in enumerate(question.answers) if a.next_ref]
            if question.parent_ref:
                links.insert(0, f"parent->#{payload['parent_question_id']}")
            print(f"  [{done}/{counts['updates']}] question #{question.question_id} "
                  f"ref={question.ref}: {', '.join(links)}", flush=True)

    print()
    print("=" * 72)
    print(f"Imported test #{plan.test_id} ({slug}): {counts['blocks']} blocks, "
          f"{counts['questions']} questions, {counts['answers']} answers, "
          f"{counts['parent_links']} parent links, {counts['next_links']} branches.")
    print(f"HTTP requests sent: {session.request_count}")
    print("=" * 72)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

EPILOG = """\
input JSON
----------
  {
    "test":   { "slug": "gdpr-audit", "name_uk": "...", "name_en": "...",
                "description_uk": "...", "description_en": "...",
                "report_type": "bizcheck" },
    "blocks": [
      { "order_index": 0, "title_uk": "...", "title_en": "...",
        "questions": [
          { "ref": "1", "parent_ref": null, "order_index": 0,
            "text_uk": "...", "text_en": "...",
            "note_uk": null, "note_en": null,
            "answers": [
              { "text_uk": "...", "text_en": "...", "score": 1, "next_ref": "2" },
              { "text_uk": "...", "text_en": "...", "score": 0 }
            ] }
        ] }
    ]
  }

`ref` is a logical id from the source sheet ("1", "1.2", "3.1"); it must be
unique in the file. `parent_ref` and `next_ref` point at other refs and are
resolved to real database ids in pass 2. Every question needs at least 2
answers. `test` may also carry is_active / is_coming_soon / is_paid / price /
currency / category / features / scoring_zones / zone_recommendations /
order_index — they are forwarded to the admin API as-is.

credentials
-----------
  ADMIN_USERNAME / ADMIN_PASSWORD (environment, or backend/.env). Never flags —
  a password on the command line ends up in the shell history and in `ps`.

examples
--------
  venv/bin/python scripts/import_test_content.py --json content/gdpr.json --dry-run
  venv/bin/python scripts/import_test_content.py --json content/gdpr.json
  venv/bin/python scripts/import_test_content.py --json content/gdpr.json --replace
  venv/bin/python scripts/import_test_content.py --json c.json --base-url http://backend:4001
"""


def _load_dotenv_quietly():
    """Pick up backend/.env when running on a dev box; a no-op in the container
    (where the env is already populated) and when python-dotenv is absent."""
    try:
        from dotenv import load_dotenv
    except Exception:                                # noqa: BLE001
        return
    load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env"))


def build_parser():
    parser = argparse.ArgumentParser(
        prog="import_test_content.py",
        description="Import a test's blocks/questions/answers through the admin API "
                    "(the programmatic equivalent of typing them into the admin panel). "
                    "Never touches the database directly.",
        epilog=EPILOG,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--json", required=True, metavar="PATH",
                        help="path to the content JSON file (see below)")
    parser.add_argument("--base-url", default=os.getenv("IMPORT_BASE_URL", DEFAULT_BASE_URL),
                        help=f"backend base URL (default: {DEFAULT_BASE_URL})")
    parser.add_argument("--dry-run", action="store_true",
                        help="validate the file and print the full plan; sends nothing, "
                             "needs no credentials and no network")
    parser.add_argument("--replace", action="store_true",
                        help="if a test with this slug exists, DELETE it first "
                             "(blocks/questions/answers cascade). Irreversible; never "
                             "happens without this flag")
    parser.add_argument("--delay", type=float, default=DEFAULT_DELAY, metavar="SECONDS",
                        help=f"pause between HTTP requests, to stay under the backend rate "
                             f"limits (default: {DEFAULT_DELAY}; the binding limit is the "
                             f"200/min default bucket shared by /blocks and /questions)")
    parser.add_argument("--timeout", type=float, default=20.0, metavar="SECONDS",
                        help="per-request timeout (default: 20)")
    parser.add_argument("-v", "--verbose", action="store_true",
                        help="echo every request's method, path and status")
    return parser


def main(argv=None):
    args = build_parser().parse_args(argv)
    try:
        plan = load_plan(args.json)

        if args.dry_run:
            print_plan(plan, args.base_url, args.delay, args.replace)
            return 0

        _load_dotenv_quietly()
        username = os.getenv("ADMIN_USERNAME")
        password = os.getenv("ADMIN_PASSWORD")
        missing = [n for n, v in (("ADMIN_USERNAME", username),
                                  ("ADMIN_PASSWORD", password)) if not v]
        if missing:
            raise ImportAbort(
                f"{' and '.join(missing)} not set.\n"
                "  Admin credentials come from the environment (or backend/.env) — there is\n"
                "  deliberately no default and no command-line flag for them. Example:\n"
                "    ADMIN_USERNAME=admin ADMIN_PASSWORD=... "
                f"{os.path.basename(sys.argv[0])} --json {args.json}"
            )

        session = AdminSession(args.base_url, timeout=args.timeout,
                               delay=args.delay, verbose=args.verbose)
        counts = plan.counts
        print(f"BizCheck content import -> {session.base_url}")
        print(f"source: {plan.source}")
        print(f"plan  : {counts['blocks']} blocks, {counts['questions']} questions, "
              f"{counts['answers']} answers, {counts['parent_links']} parent links, "
              f"{counts['next_links']} branches  (--delay {args.delay}s)")
        session.login(username, password)
        print(f"logged in as {username!r} (admin_session + admin_csrf cookies held)", flush=True)
        run_import(session, plan, replace=args.replace)
        return 0
    except ImportAbort as exc:
        print(f"\nABORTED: {exc}", file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        print("\nABORTED: interrupted. The rows created so far were NOT rolled back — "
              "re-run with --replace once you have decided what to do.", file=sys.stderr)
        return 130


if __name__ == "__main__":
    sys.exit(main())
