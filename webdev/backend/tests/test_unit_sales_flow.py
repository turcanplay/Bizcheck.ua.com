"""End-to-end unit tests for the sales notification chain.

   /register  →  per-test forum topic  →  Telegram notification

No database, no running backend, no real Telegram API. Three seams are faked:

  * ``sales_notify._post_json``  → a recorder that captures every (method,
    payload) pair and hands back realistic Bot API responses.
  * the model layer (Submission / Test / SiteSettings) → plain in-memory dicts.
    ``sales_notify`` imports these lazily *inside* the functions, so the real
    class attributes are what must be patched.
  * ``_SEND_SPACING_SEC`` → 0.0, so nothing ever sleeps for seconds.

Draining strategy
-----------------
The queue worker is a real daemon thread that sleeps ``_SEND_SPACING_SEC``
(3.0s by default) after every job. Waiting on that thread would make the suite
slow and time-dependent, so almost every test here captures the enqueued job
(``_enqueue`` is patched, exactly as tests/test_sales_notify.py does) and then
calls the private ``_process_send`` / ``_process_update`` **synchronously** on
the test thread. That drains deterministically: no sleeps, no joins, no
scheduler races, and it still exercises the identical code path the worker
runs. ``TestWorkerDrains`` is the single test that proves the queue → worker →
``_process_send`` wiring itself, and it does so with the spacing neutralised and
a bounded ``_QUEUE.join()``.

This file deliberately does not re-test the pure formatters (_esc,
_zone_label_uk, _build_keyboard, _retry_after) or the chat-id resolution
helper — tests/test_sales_notify.py and tests/test_unit_tg_group.py own those.

Run with:
    cd webdev/backend
    venv/bin/python -m pytest tests/test_unit_sales_flow.py -v
"""
import copy
import io
import os
import sys
import urllib.error

_HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(_HERE))

import pytest

from services import sales_notify as sn


# ---------------------------------------------------------------------------
# Fake Telegram Bot API
# ---------------------------------------------------------------------------

def _http_error(code: int, body: bytes) -> urllib.error.HTTPError:
    """A urllib HTTPError whose .read() yields `body`, like a real API error."""
    return urllib.error.HTTPError(
        "https://api.telegram.org/botTEST/method", code, "Bad Request", {},
        io.BytesIO(body),
    )


class FakeTelegram:
    """Records every Bot API call and replies like the real thing.

    ``fail`` maps a method name → an exception to raise instead of replying. It
    is a blunt instrument: it kills EVERY call to that method, so it cannot
    express "the topic is gone but the group is fine". ``dead_threads`` is the
    tool for that — a sendMessage carrying one of those message_thread_id values
    gets the real "message thread not found" 400, while the same sendMessage
    without a thread id (the General fallback) goes through.

    Payloads are snapshotted on the way in: ``_do_send`` mutates its payload dict
    in place (it pops message_thread_id before the General retry), so recording
    the live reference would rewrite the history of the earlier calls.
    """

    def __init__(self):
        self.calls = []            # [(method, payload_snapshot), ...]
        self.fail = {}             # {"createForumTopic": HTTPError(...)}
        self.dead_threads = set()  # message_thread_ids deleted on the group side
        self._next_thread_id = 42
        self._next_message_id = 1001

    # the _post_json replacement
    def __call__(self, method, payload):
        self.calls.append((method, copy.deepcopy(payload)))
        exc = self.fail.get(method)
        if exc is not None:
            raise exc
        if method == "sendMessage" and payload.get("message_thread_id") in self.dead_threads:
            # Fresh exception per call: HTTPError.read() drains its body, so a
            # shared instance would hand back b"" the second time around.
            raise _http_error(
                400, b'{"ok":false,"description":"Bad Request: message thread not found"}')
        if method == "createForumTopic":
            tid, self._next_thread_id = self._next_thread_id, self._next_thread_id + 1
            return {"ok": True, "result": {"message_thread_id": tid}}
        if method == "sendMessage":
            mid, self._next_message_id = self._next_message_id, self._next_message_id + 1
            return {"ok": True, "result": {"message_id": mid}}
        if method in ("editMessageText", "editMessageCaption"):
            return {"ok": True, "result": {}}
        return {"ok": True, "result": {}}

    # --- assertions helpers -------------------------------------------------
    def methods(self):
        return [m for m, _ in self.calls]

    def count(self, method):
        return self.methods().count(method)

    def payloads(self, method):
        return [p for m, p in self.calls if m == method]

    def only(self, method):
        got = self.payloads(method)
        assert len(got) == 1, f"expected exactly 1 {method}, got {len(got)}"
        return got[0]


# ---------------------------------------------------------------------------
# Fake model layer
# ---------------------------------------------------------------------------

class FakeWorld:
    """In-memory stand-in for submissions / tests / site_settings."""

    def __init__(self):
        self.settings = {}                 # site_settings key/value
        self.tests = {}                    # test_id -> row dict
        self.submissions = {}              # sub_id -> row dict
        self.claimed = set()               # ids whose notification was claimed
        self.released = []                 # release_sales_notification calls
        self.sales_msgs = {}               # sub_id -> (msg_id, is_doc)
        self.topic_writes = []             # (test_id, topic_id) set_topic_id calls

    # --- seeding ------------------------------------------------------------
    def add_test(self, test_id, name_uk, topic_id=None):
        self.tests[test_id] = {"id": test_id, "name_uk": name_uk,
                               "name_en": name_uk, "tg_topic_id": topic_id}
        return test_id

    def add_lead(self, sub_id=1, test_id=1, **over):
        row = {
            "id": sub_id, "test_id": test_id,
            "first_name": "Ion", "last_name": "Popescu",
            "email": "ion.popescu@example.md", "phone": "+37379123456",
            "tg_chat_id": None, "tg_username": None,
            "total_score": 85, "sector": "IT", "company_revenue": "1-5M",
        }
        row.update(over)
        self.submissions[sub_id] = row
        return sub_id

    def register_chat(self, chat_id):
        """Exactly what routes/tg_group.py::register writes."""
        self.settings["sales_chat_id"] = str(chat_id)
        self.settings["sales_chat_title"] = "Sales Team"


@pytest.fixture
def world(monkeypatch):
    """Patch the model layer + the module globals sales_notify mutates."""
    w = FakeWorld()

    import models.site_settings as ss_mod
    import models.test as test_mod
    import models.submission as sub_mod

    monkeypatch.setattr(ss_mod.SiteSettings, "get",
                        staticmethod(lambda k, d="": w.settings.get(k, d)))
    monkeypatch.setattr(ss_mod.SiteSettings, "set",
                        staticmethod(lambda k, v: w.settings.__setitem__(k, v)))

    monkeypatch.setattr(test_mod.Test, "find_by_id",
                        staticmethod(lambda i: w.tests.get(i)))
    monkeypatch.setattr(test_mod.Test, "get_topic_id",
                        staticmethod(lambda i: (w.tests.get(i) or {}).get("tg_topic_id")))

    def _set_topic_id(test_id, topic_id):
        w.topic_writes.append((test_id, topic_id))
        w.tests.setdefault(test_id, {})["tg_topic_id"] = topic_id
        return True
    monkeypatch.setattr(test_mod.Test, "set_topic_id", staticmethod(_set_topic_id))

    monkeypatch.setattr(sub_mod.Submission, "find_by_id",
                        staticmethod(lambda i: w.submissions.get(i)))

    def _claim(sub_id):
        if sub_id in w.claimed:
            return None                    # someone already claimed → lost
        w.claimed.add(sub_id)
        return sub_id                      # won
    monkeypatch.setattr(sub_mod.Submission, "claim_sales_notification",
                        staticmethod(_claim))

    def _release(sub_id):
        w.released.append(sub_id)
        w.claimed.discard(sub_id)
    monkeypatch.setattr(sub_mod.Submission, "release_sales_notification",
                        staticmethod(_release))

    monkeypatch.setattr(sub_mod.Submission, "set_sales_message",
                        staticmethod(lambda i, m, d: w.sales_msgs.__setitem__(i, (m, bool(d)))))
    monkeypatch.setattr(sub_mod.Submission, "get_sales_message",
                        staticmethod(lambda i: w.sales_msgs.get(i)))

    return w


@pytest.fixture(autouse=True)
def reset_module_globals(monkeypatch):
    """sales_notify keeps process-wide state. Snapshot and restore the state
    that is safe to rewind, so these tests pass in any order and when the file
    is run repeatedly.

    _worker_started / _QUEUE are deliberately NOT rewound. They guard a real
    daemon thread: forcing _worker_started back to False while that thread is
    alive makes the next _ensure_worker() spawn a SECOND sender, and swapping
    _QUEUE strands the running worker blocked on the old queue's get(). The
    worker is a genuine per-process singleton, so the tests treat it as one.
    """
    saved_disabled = sn._topics_disabled
    saved_spacing = sn._SEND_SPACING_SEC
    saved_retry = sn._MAX_SEND_RETRY

    sn._topics_disabled = False
    # Neutralise the 3s inter-send spacing: _worker_loop looks this up as a
    # module global on every iteration, so patching the attribute is enough
    # even for an already-running worker thread.
    sn._SEND_SPACING_SEC = 0.0
    yield
    sn._topics_disabled = saved_disabled
    sn._SEND_SPACING_SEC = saved_spacing
    sn._MAX_SEND_RETRY = saved_retry


@pytest.fixture(autouse=True)
def clean_env(monkeypatch):
    """A known-empty config baseline: nothing leaks in from the real shell."""
    for var in ("SALES_CHAT_ID", "SALES_TOPIC_ID", "SALES_BOT_TOKEN"):
        monkeypatch.delenv(var, raising=False)
    monkeypatch.setenv("PUBLIC_BASE_URL", "https://bizcheck.ua.com")


@pytest.fixture
def tg(monkeypatch):
    fake = FakeTelegram()
    monkeypatch.setattr(sn, "_post_json", fake)
    return fake


@pytest.fixture
def jobs(monkeypatch):
    """Capture enqueued jobs instead of handing them to the worker thread."""
    captured = []
    monkeypatch.setattr(sn, "_enqueue",
                        lambda job, **kw: captured.append(job))
    monkeypatch.setattr(sn, "_ensure_worker", lambda: None)
    return captured


def drain(jobs):
    """Run captured jobs synchronously — same code the worker thread runs."""
    for job in list(jobs):
        if job[0] == "send":
            sn._process_send(job[1])
        elif job[0] == "update":
            sn._process_update(job[1], job[2], job[3])
    jobs.clear()


def notify(sub_id, jobs):
    """Full public entrypoint + deterministic drain."""
    sn.maybe_notify_sales(sub_id)
    drain(jobs)


# ---------------------------------------------------------------------------
# 1-2. Where the lead lands: SALES_CHAT_ID env wins, /register is the fallback
# ---------------------------------------------------------------------------

class TestChatIdPrecedenceDrivesDestination:

    def test_registered_chat_receives_the_lead(self, world, tg, jobs, monkeypatch):
        """THE core of the feature: no SALES_CHAT_ID env anywhere — the chat
        that ran /register is where sendMessage lands."""
        monkeypatch.setenv("SALES_BOT_TOKEN", "test-token")
        world.register_chat(-1001112223334)
        world.add_test(1, "BizCheck")
        world.add_lead(1, test_id=1)

        notify(1, jobs)

        assert tg.count("sendMessage") == 1
        assert tg.only("sendMessage")["chat_id"] == "-1001112223334"

    def test_unregistering_leaves_the_env_chat_serving(self, world, tg, jobs, monkeypatch):
        """/unregister writes an EMPTY string (not a delete) — with the env var
        set the notification keeps landing rather than being lost."""
        monkeypatch.setenv("SALES_BOT_TOKEN", "test-token")
        monkeypatch.setenv("SALES_CHAT_ID", "-999888777")
        world.settings["sales_chat_id"] = ""          # post-/unregister state
        world.add_test(1, "BizCheck")
        world.add_lead(1, test_id=1)

        notify(1, jobs)

        assert tg.only("sendMessage")["chat_id"] == "-999888777"

    def test_env_chat_id_wins_over_registration(self, world, tg, jobs, monkeypatch):
        """SALES_CHAT_ID is an operator kill-switch and outranks /register:
        whoever can edit .env on the server is a higher authority than a group
        owner who can type a Telegram command. An operator pinning leads back to
        a known-good group after a bad/hostile /register must actually get them
        there. Matches webdev/.env.example:36-37.
        """
        monkeypatch.setenv("SALES_BOT_TOKEN", "test-token")
        monkeypatch.setenv("SALES_CHAT_ID", "-999888777")
        world.register_chat(-1001112223334)
        world.add_test(1, "BizCheck")
        world.add_lead(1, test_id=1)

        notify(1, jobs)

        assert tg.only("sendMessage")["chat_id"] == "-999888777"


# ---------------------------------------------------------------------------
# 3-5. Per-test forum topics
# ---------------------------------------------------------------------------

class TestPerTestTopics:

    @pytest.fixture(autouse=True)
    def configured(self, world, monkeypatch):
        monkeypatch.setenv("SALES_BOT_TOKEN", "test-token")
        world.register_chat(-1001112223334)

    def test_first_lead_creates_the_topic_and_posts_into_it(self, world, tg, jobs):
        world.add_test(7, "BizCheck Fiscal")
        world.add_lead(1, test_id=7)

        notify(1, jobs)

        # created once, named after the test
        topic = tg.only("createForumTopic")
        assert topic["name"] == "BizCheck Fiscal"
        assert topic["chat_id"] == "-1001112223334"
        # persisted
        assert world.topic_writes == [(7, 42)]
        assert world.tests[7]["tg_topic_id"] == 42
        # and the lead was posted INTO that topic
        assert tg.only("sendMessage")["message_thread_id"] == 42

    def test_second_lead_reuses_the_cached_topic(self, world, tg, jobs):
        world.add_test(7, "BizCheck Fiscal")
        world.add_lead(1, test_id=7)
        world.add_lead(2, test_id=7)

        notify(1, jobs)
        notify(2, jobs)

        assert tg.count("createForumTopic") == 1, "topic must not be recreated"
        assert tg.count("sendMessage") == 2
        assert [p["message_thread_id"] for p in tg.payloads("sendMessage")] == [42, 42]
        assert world.topic_writes == [(7, 42)], "no redundant DB write"

    def test_preexisting_topic_id_skips_creation_entirely(self, world, tg, jobs):
        """A topic already cached in tests.tg_topic_id (e.g. from a previous
        process) must be used without any API call."""
        world.add_test(7, "BizCheck Fiscal", topic_id=99)
        world.add_lead(1, test_id=7)

        notify(1, jobs)

        assert "createForumTopic" not in tg.methods()
        assert tg.only("sendMessage")["message_thread_id"] == 99

    def test_two_tests_get_two_topics(self, world, tg, jobs):
        world.add_test(7, "BizCheck Fiscal")
        world.add_test(8, "BizCheck HR")
        world.add_lead(1, test_id=7)
        world.add_lead(2, test_id=8)

        notify(1, jobs)
        notify(2, jobs)

        assert [p["name"] for p in tg.payloads("createForumTopic")] == \
            ["BizCheck Fiscal", "BizCheck HR"]
        threads = [p["message_thread_id"] for p in tg.payloads("sendMessage")]
        assert threads == [42, 43]
        assert len(set(threads)) == 2, "each test needs its OWN topic"
        assert world.topic_writes == [(7, 42), (8, 43)]

    def test_submission_without_test_id_goes_to_general(self, world, tg, jobs):
        world.add_lead(1, test_id=None)

        notify(1, jobs)

        assert "createForumTopic" not in tg.methods()
        assert "message_thread_id" not in tg.only("sendMessage")


# ---------------------------------------------------------------------------
# 6. SALES_TOPIC_ID pins everything to one topic
# ---------------------------------------------------------------------------

class TestFixedTopicPrecedence:

    @pytest.fixture(autouse=True)
    def configured(self, world, monkeypatch):
        monkeypatch.setenv("SALES_BOT_TOKEN", "test-token")
        world.register_chat(-1001112223334)

    def test_fixed_topic_collapses_all_tests_and_creates_none(self, world, tg, jobs, monkeypatch):
        """The trap documented in .env.example:39-44 — setting SALES_TOPIC_ID
        takes priority and no per-test topic is ever created."""
        monkeypatch.setenv("SALES_TOPIC_ID", "555")
        world.add_test(7, "BizCheck Fiscal")
        world.add_test(8, "BizCheck HR")
        world.add_lead(1, test_id=7)
        world.add_lead(2, test_id=8)

        notify(1, jobs)
        notify(2, jobs)

        assert "createForumTopic" not in tg.methods()
        assert world.topic_writes == []
        assert [p["message_thread_id"] for p in tg.payloads("sendMessage")] == [555, 555]

    def test_fixed_topic_beats_a_cached_per_test_topic(self, world, tg, jobs, monkeypatch):
        monkeypatch.setenv("SALES_TOPIC_ID", "555")
        world.add_test(7, "BizCheck Fiscal", topic_id=99)
        world.add_lead(1, test_id=7)

        notify(1, jobs)

        assert tg.only("sendMessage")["message_thread_id"] == 555

    def test_non_numeric_fixed_topic_is_ignored_and_per_test_resumes(self, world, tg, jobs, monkeypatch):
        monkeypatch.setenv("SALES_TOPIC_ID", "not-a-number")
        world.add_test(7, "BizCheck Fiscal")
        world.add_lead(1, test_id=7)

        notify(1, jobs)

        assert tg.count("createForumTopic") == 1
        assert tg.only("sendMessage")["message_thread_id"] == 42


# ---------------------------------------------------------------------------
# 7. Group is not a forum → General fallback, latched off
# ---------------------------------------------------------------------------

class TestNotAForumGroup:

    @pytest.fixture(autouse=True)
    def configured(self, world, monkeypatch):
        monkeypatch.setenv("SALES_BOT_TOKEN", "test-token")
        world.register_chat(-1001112223334)

    def test_falls_back_to_general_and_stops_trying(self, world, tg, jobs):
        tg.fail["createForumTopic"] = _http_error(
            400, b'{"ok":false,"description":"Bad Request: the chat is not a forum"}')
        world.add_test(7, "BizCheck Fiscal")
        world.add_test(8, "BizCheck HR")
        world.add_lead(1, test_id=7)
        world.add_lead(2, test_id=8)

        notify(1, jobs)

        assert sn._topics_disabled is True
        assert world.topic_writes == [], "nothing to persist — no topic exists"
        first = tg.only("sendMessage")
        assert "message_thread_id" not in first, "must land in General"
        assert first["chat_id"] == "-1001112223334"

        # ...and a second lead (different test) must not retry createForumTopic
        notify(2, jobs)

        assert tg.count("createForumTopic") == 1, "must latch off after one refusal"
        assert tg.count("sendMessage") == 2
        assert all("message_thread_id" not in p for p in tg.payloads("sendMessage"))

    def test_missing_manage_topics_right_also_latches_off(self, world, tg, jobs):
        tg.fail["createForumTopic"] = _http_error(
            400, b'{"ok":false,"description":"Bad Request: not enough rights to manage topics"}')
        world.add_test(7, "BizCheck Fiscal")
        world.add_lead(1, test_id=7)

        notify(1, jobs)

        assert sn._topics_disabled is True
        assert "message_thread_id" not in tg.only("sendMessage")

    def test_unrelated_topic_error_does_not_latch_off(self, world, tg, jobs):
        """A transient 500 must NOT permanently disable topics for the process."""
        tg.fail["createForumTopic"] = _http_error(
            500, b'{"ok":false,"description":"Internal Server Error"}')
        world.add_test(7, "BizCheck Fiscal")
        world.add_lead(1, test_id=7)

        notify(1, jobs)

        assert sn._topics_disabled is False
        assert "message_thread_id" not in tg.only("sendMessage")   # this lead → General

    def test_topics_disabled_does_not_leak_between_tests(self):
        """Companion to the above: the autouse fixture resets the global."""
        assert sn._topics_disabled is False


# ---------------------------------------------------------------------------
# 8. Fire-once: send first, EDIT afterwards
# ---------------------------------------------------------------------------

class TestFireOnce:

    @pytest.fixture(autouse=True)
    def configured(self, world, monkeypatch):
        monkeypatch.setenv("SALES_BOT_TOKEN", "test-token")
        world.register_chat(-1001112223334)
        world.add_test(7, "BizCheck Fiscal")

    def test_second_write_edits_instead_of_duplicating(self, world, tg, jobs):
        world.add_lead(1, test_id=7, phone=None)

        notify(1, jobs)                       # 1st write: claim won → send
        assert tg.count("sendMessage") == 1
        assert world.sales_msgs[1] == (1001, False), "message id remembered, text not doc"

        # the lead later leaves a phone number in the bot → second write path
        world.submissions[1]["phone"] = "+37360111222"
        notify(1, jobs)                       # claim LOST → edit

        assert tg.count("sendMessage") == 1, "must NOT send a duplicate"
        assert tg.count("editMessageText") == 1
        edit = tg.only("editMessageText")
        assert edit["message_id"] == 1001
        assert edit["chat_id"] == "-1001112223334"
        assert "+37360111222" in edit["text"], "edit carries the fresh contact data"

    def test_edit_uses_caption_method_for_a_legacy_document_message(self, world, tg, jobs):
        world.add_lead(1, test_id=7)
        world.claimed.add(1)                       # already notified
        world.sales_msgs[1] = (900, True)          # legacy PDF-document message

        notify(1, jobs)

        assert "sendMessage" not in tg.methods()
        assert tg.count("editMessageCaption") == 1
        assert "caption" in tg.only("editMessageCaption")

    def test_claim_lost_and_no_known_message_does_nothing(self, world, tg, jobs):
        world.add_lead(1, test_id=7)
        world.claimed.add(1)
        # no entry in world.sales_msgs

        notify(1, jobs)

        assert tg.calls == []

    def test_identical_edit_returning_not_modified_is_swallowed(self, world, tg, jobs):
        """Telegram 400s an unchanged edit; that is harmless and must not raise."""
        world.add_lead(1, test_id=7)
        world.claimed.add(1)
        world.sales_msgs[1] = (1001, False)
        tg.fail["editMessageText"] = _http_error(
            400, b'{"ok":false,"description":"Bad Request: message is not modified"}')

        notify(1, jobs)      # no exception == pass

        assert tg.count("editMessageText") == 1


# ---------------------------------------------------------------------------
# 9. Incomplete leads are never sent
# ---------------------------------------------------------------------------

class TestIncompleteLeadIsNotSent:

    @pytest.fixture(autouse=True)
    def configured(self, world, monkeypatch):
        monkeypatch.setenv("SALES_BOT_TOKEN", "test-token")
        world.register_chat(-1001112223334)
        world.add_test(7, "BizCheck Fiscal")

    def test_name_but_no_contact_channel(self, world, tg, jobs):
        world.add_lead(1, test_id=7, email=None, phone=None, tg_chat_id=None)

        notify(1, jobs)

        assert tg.calls == []
        assert world.claimed == set(), "must not burn the fire-once claim"

    def test_contact_but_no_name(self, world, tg, jobs):
        world.add_lead(1, test_id=7, first_name=None, last_name=None)

        notify(1, jobs)

        assert tg.calls == []
        assert world.claimed == set()

    def test_telegram_chat_id_alone_counts_as_a_contact_channel(self, world, tg, jobs):
        world.add_lead(1, test_id=7, email=None, phone=None, tg_chat_id=777123)

        notify(1, jobs)

        assert tg.count("sendMessage") == 1

    def test_unknown_submission_is_a_no_op(self, world, tg, jobs):
        notify(4242, jobs)
        assert tg.calls == []


# ---------------------------------------------------------------------------
# 10. A failed send releases the claim so a later write retries
# ---------------------------------------------------------------------------

class TestFailureReleasesTheClaim:

    @pytest.fixture(autouse=True)
    def configured(self, world, monkeypatch):
        monkeypatch.setenv("SALES_BOT_TOKEN", "test-token")
        world.register_chat(-1001112223334)
        world.add_test(7, "BizCheck Fiscal", topic_id=42)

    def test_api_error_releases(self, world, tg, jobs):
        tg.fail["sendMessage"] = _http_error(
            403, b'{"ok":false,"description":"Forbidden: bot was kicked"}')
        world.add_lead(1, test_id=7)

        notify(1, jobs)

        assert world.released == [1]
        assert 1 not in world.claimed, "the flag must be back to FALSE"
        assert 1 not in world.sales_msgs

    def test_a_later_write_retries_after_the_release(self, world, tg, jobs):
        tg.fail["sendMessage"] = _http_error(500, b'{"ok":false}')
        world.add_lead(1, test_id=7)
        notify(1, jobs)
        assert world.released == [1]

        # the group is reachable again → the next write must genuinely re-send,
        # not fall into the edit path.
        tg.fail.pop("sendMessage")
        notify(1, jobs)

        assert tg.count("sendMessage") == 2
        assert "editMessageText" not in tg.methods()
        assert world.sales_msgs[1][0] == 1001

    def test_vanished_submission_releases(self, world, tg, jobs):
        """The row disappeared between enqueue and drain."""
        world.add_lead(1, test_id=7)
        sn.maybe_notify_sales(1)
        del world.submissions[1]
        drain(jobs)

        assert world.released == [1]
        assert tg.calls == []


# ---------------------------------------------------------------------------
# 11. Unconfigured → silent no-op
# ---------------------------------------------------------------------------

class TestUnconfigured:

    def test_no_bot_token_sends_nothing(self, world, tg, jobs):
        world.register_chat(-1001112223334)     # chat registered...
        world.add_test(7, "BizCheck Fiscal")
        world.add_lead(1, test_id=7)
        # ...but SALES_BOT_TOKEN is absent (clean_env deletes it)

        notify(1, jobs)                          # must not raise

        assert tg.calls == []
        assert jobs == []
        assert world.claimed == set()

    def test_token_but_no_chat_anywhere_sends_nothing(self, world, tg, jobs, monkeypatch):
        monkeypatch.setenv("SALES_BOT_TOKEN", "test-token")
        world.add_test(7, "BizCheck Fiscal")
        world.add_lead(1, test_id=7)

        notify(1, jobs)

        assert tg.calls == []
        assert world.claimed == set()

    def test_a_sick_settings_table_cannot_stop_the_env_pinned_chat(self, world, tg, jobs, monkeypatch):
        """A DB blip must not lose the lead. With SALES_CHAT_ID set the settings
        table is never consulted at all, so the kill-switch keeps working while
        the DB is down (the fake below raises if it is touched)."""
        import models.site_settings as ss_mod

        def boom(k, d=""):
            raise RuntimeError("db down")

        monkeypatch.setattr(ss_mod.SiteSettings, "get", staticmethod(boom))
        monkeypatch.setenv("SALES_BOT_TOKEN", "test-token")
        monkeypatch.setenv("SALES_CHAT_ID", "-999888777")
        world.add_test(7, "BizCheck Fiscal", topic_id=42)
        world.add_lead(1, test_id=7)

        notify(1, jobs)

        assert tg.only("sendMessage")["chat_id"] == "-999888777"


# ---------------------------------------------------------------------------
# The notification body actually carries the lead
# ---------------------------------------------------------------------------

class TestNotificationBody:

    @pytest.fixture(autouse=True)
    def configured(self, world, monkeypatch):
        monkeypatch.setenv("SALES_BOT_TOKEN", "test-token")
        world.register_chat(-1001112223334)

    def test_sent_text_contains_name_email_phone_and_test_name(self, world, tg, jobs):
        world.add_test(7, "BizCheck Fiscal", topic_id=42)
        world.add_lead(1, test_id=7, tg_username="@ionel")

        notify(1, jobs)

        p = tg.only("sendMessage")
        text = p["text"]
        assert "Ion Popescu" in text
        assert "ion.popescu@example.md" in text
        assert "+37379123456" in text
        assert "BizCheck Fiscal" in text
        assert "85% — Низький ризик" in text
        assert "IT" in text and "1-5M" in text
        assert p["parse_mode"] == "HTML"
        # actionable buttons, and the admin panel link
        urls = [b["url"] for row in p["reply_markup"]["inline_keyboard"] for b in row]
        assert any("t.me/ionel" in u for u in urls)
        assert any("mail.google.com" in u for u in urls)
        assert "https://bizcheck.ua.com/admin_bizcheck_md_crowe/" in text

    def test_html_in_lead_data_is_escaped_not_injected(self, world, tg, jobs):
        world.add_test(7, "BizCheck <Fiscal>", topic_id=42)
        world.add_lead(1, test_id=7, first_name="<b>Ion", last_name="Pop&Co")

        notify(1, jobs)

        text = tg.only("sendMessage")["text"]
        assert "&lt;b&gt;Ion Pop&amp;Co" in text
        assert "<b>Ion" not in text
        assert "BizCheck &lt;Fiscal&gt;" in text


# ---------------------------------------------------------------------------
# The real queue → worker wiring (single test; spacing neutralised)
# ---------------------------------------------------------------------------

class TestWorkerDrains:

    def test_enqueued_job_is_processed_by_the_background_worker(self, world, tg, monkeypatch):
        """Everything above drives _process_send directly for determinism. This
        one proves the queue/worker plumbing that gets it there.

        _SEND_SPACING_SEC is already 0.0 (autouse fixture) and _worker_loop
        re-reads it as a module global each iteration, so the worker does not
        sleep. _QUEUE.join() returns as soon as task_done() fires — before the
        spacing sleep — so this is bounded and not a timing race.
        """
        monkeypatch.setenv("SALES_BOT_TOKEN", "test-token")
        world.register_chat(-1001112223334)
        world.add_test(7, "BizCheck Fiscal", topic_id=42)
        world.add_lead(1, test_id=7)

        sn.maybe_notify_sales(1)      # real _enqueue + real _ensure_worker
        sn._QUEUE.join()              # blocks only until the job is done

        assert tg.count("sendMessage") == 1
        assert tg.only("sendMessage")["chat_id"] == "-1001112223334"
        assert world.sales_msgs[1] == (1001, False)

    def test_ensure_worker_is_idempotent(self):
        sn._ensure_worker()
        sn._ensure_worker()
        import threading
        workers = [t for t in threading.enumerate() if t.name == "sales-notify"]
        assert len(workers) == 1, "never more than one sender thread per process"


# ---------------------------------------------------------------------------
# A deleted topic must not burn a failing round-trip forever
# ---------------------------------------------------------------------------

class TestDeletedTopicIsForgotten:

    @pytest.fixture(autouse=True)
    def configured(self, world, monkeypatch):
        monkeypatch.setenv("SALES_BOT_TOKEN", "test-token")
        world.register_chat(-1001112223334)

    def test_thread_not_found_falls_back_to_general_and_clears_the_cache(self, world, tg, jobs):
        """Someone deleted the topic on the group side. The lead must still land
        (General), and the dead id must be cleared so the NEXT lead recreates a
        topic instead of repeating the same doomed send forever."""
        world.add_test(7, "BizCheck Fiscal", topic_id=42)
        world.add_lead(1, test_id=7)
        tg.dead_threads.add(42)

        notify(1, jobs)

        # tried the dead topic, then retried into General
        sends = tg.payloads("sendMessage")
        assert len(sends) == 2
        assert sends[0]["message_thread_id"] == 42
        assert "message_thread_id" not in sends[1], "the lead must still land in General"
        # ...the General retry actually succeeded — the lead is in the group
        assert world.sales_msgs[1][0] == 1001
        assert world.released == [], "delivered → the claim stays"
        # ...and the stale id is gone
        assert (7, None) in world.topic_writes
        assert world.tests[7]["tg_topic_id"] is None

    def test_next_lead_creates_a_fresh_topic(self, world, tg, jobs):
        """The point of clearing: lead #2 must NOT repeat the failing attempt."""
        world.add_test(7, "BizCheck Fiscal", topic_id=42)
        world.add_lead(1, test_id=7)
        world.add_lead(2, test_id=7)
        tg.dead_threads.add(42)

        notify(1, jobs)
        assert "createForumTopic" not in tg.methods(), "lead #1 used the cached id"
        assert world.tests[7]["tg_topic_id"] is None, "lead #1 cleared the dead id"

        tg.dead_threads.clear()               # the topic the group hands us next works
        notify(2, jobs)

        assert tg.count("createForumTopic") == 1, "lead #2 must create a NEW topic"
        new_tid = 42                          # FakeTelegram hands out 42 first
        assert world.tests[7]["tg_topic_id"] == new_tid, "the fresh id is cached again"
        last = tg.payloads("sendMessage")[-1]
        assert last["message_thread_id"] == new_tid, "posted into the newly created topic"
        # lead #2 sent exactly once — no repeat of lead #1's doomed round-trip
        assert tg.count("sendMessage") == 3

    def test_fixed_topic_id_does_not_clobber_the_per_test_cache(self, world, tg, jobs, monkeypatch):
        """With SALES_TOPIC_ID pinning the thread, the failing id came from the
        env — the innocent per-test cache entry must not be collateral damage."""
        monkeypatch.setenv("SALES_TOPIC_ID", "555")
        world.add_test(7, "BizCheck Fiscal", topic_id=99)
        world.add_lead(1, test_id=7)
        tg.dead_threads.add(555)

        notify(1, jobs)

        assert world.topic_writes == [], "must not touch tests.tg_topic_id"
        assert world.tests[7]["tg_topic_id"] == 99

    def test_clear_failing_does_not_lose_the_lead(self, world, tg, jobs, monkeypatch):
        """If clearing the cache blows up, the General fallback must still send."""
        import models.test as test_mod

        def boom(test_id, topic_id):
            raise RuntimeError("db down")

        monkeypatch.setattr(test_mod.Test, "set_topic_id", staticmethod(boom))
        world.add_test(7, "BizCheck Fiscal", topic_id=42)
        world.add_lead(1, test_id=7)
        tg.dead_threads.add(42)

        notify(1, jobs)      # must not raise

        assert "message_thread_id" not in tg.payloads("sendMessage")[-1]
        assert world.sales_msgs[1][0] == 1001, "lead delivered despite the clear failing"
        assert world.released == [], "the lead landed — nothing to retry"


# ---------------------------------------------------------------------------
# sendMessage success with no message_id — delivered, but not editable
# ---------------------------------------------------------------------------

class TestSendWithoutMessageId:

    @pytest.fixture(autouse=True)
    def configured(self, world, monkeypatch):
        monkeypatch.setenv("SALES_BOT_TOKEN", "test-token")
        world.register_chat(-1001112223334)
        world.add_test(7, "BizCheck Fiscal", topic_id=42)

    @pytest.fixture
    def mute_tg(self, tg):
        """A 200 OK carrying no message_id (Telegram always returns one, so this
        is a can't-happen defensive path)."""
        real = tg.__call__

        def call(method, payload):
            resp = real(method, payload)
            if method == "sendMessage":
                return {"ok": True, "result": {}}
            return resp
        return call

    def test_claim_is_kept_so_no_duplicate_is_ever_sent(self, world, tg, jobs, mute_tg, monkeypatch):
        """The lead HAS been delivered. Releasing the claim would make the next
        write send the group a SECOND copy of the same lead, so we keep it."""
        monkeypatch.setattr(sn, "_post_json", mute_tg)
        world.add_lead(1, test_id=7)

        notify(1, jobs)

        assert tg.count("sendMessage") == 1
        assert world.released == [], "must NOT release — the lead already landed"
        assert 1 in world.claimed, "the fire-once flag stays claimed"
        assert 1 not in world.sales_msgs, "no message id to remember"

        # a later write must not duplicate; with no known msg id it does nothing
        world.submissions[1]["phone"] = "+37360111222"
        notify(1, jobs)

        assert tg.count("sendMessage") == 1, "no duplicate lead in the group"
        assert "editMessageText" not in tg.methods()

    def test_it_is_logged_as_a_warning(self, world, jobs, mute_tg, monkeypatch, caplog):
        """The trade-off is silent otherwise: in-place updates are lost for this
        submission, so an operator has to be able to see it happened."""
        monkeypatch.setattr(sn, "_post_json", mute_tg)
        world.add_lead(1, test_id=7)

        with caplog.at_level("WARNING", logger="services.sales_notify"):
            notify(1, jobs)

        # getMessage() does the %-interpolation once; r.message is ALREADY
        # interpolated, so formatting it again against r.args is a TypeError.
        warnings = [r.getMessage() for r in caplog.records if r.levelname == "WARNING"]
        assert any("no message_id" in m for m in warnings), warnings
        assert any(str(1) in m for m in warnings if "no message_id" in m), \
            "the warning must name the submission an operator has to chase"
