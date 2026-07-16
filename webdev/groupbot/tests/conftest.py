"""Test fakes for the group bot.

Nothing here touches the network or the real Telegram API:

  * the telegram objects (Update/Chat/User/Message/ChatMember) are hand-rolled
    duck-typed fakes — bot.py only reads a handful of attributes off them;
  * httpx.AsyncClient is replaced by FakeHttp, which records every request and
    replays a scripted response (or raises httpx.RequestError);
  * time.monotonic is replaced by FakeClock — the 60s cache TTL is tested by
    advancing a counter, never by sleeping.
"""
import os
import sys

import httpx
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import bot  # noqa: E402


# ---------------------------------------------------------------------------
# Fake telegram objects
# ---------------------------------------------------------------------------

class FakeUser:
    def __init__(self, id=42, username=None):
        self.id = id
        self.username = username


class FakeChatMember:
    def __init__(self, status):
        self.status = status


class FakeMessage:
    """Records every reply_text() call instead of sending it."""

    def __init__(self, chat=None, text="", message_thread_id=None):
        self.chat = chat
        self.text = text
        self.message_thread_id = message_thread_id
        self.replies = []

    async def reply_text(self, text, **kwargs):
        self.replies.append({"text": text, **kwargs})
        return FakeMessage(chat=self.chat, text=text)

    @property
    def last_reply(self):
        return self.replies[-1]["text"] if self.replies else None


class FakeChat:
    def __init__(self, id=-1001234567890, type="supergroup", title="Sales Team"):
        self.id = id
        self.type = type
        self.title = title


class FakeUpdate:
    """Duck-type of telegram.Update — only what bot.py actually reads."""

    def __init__(self, chat=None, user=None, message_thread_id=None):
        self.effective_chat = chat if chat is not None else FakeChat()
        self.effective_user = user if user is not None else FakeUser()
        self.message = FakeMessage(
            chat=self.effective_chat, message_thread_id=message_thread_id
        )
        self.effective_message = self.message


class FakeBot:
    """context.bot — get_chat_member returns a scripted status or raises."""

    def __init__(self, status="creator", raises=None):
        self.status = status
        self.raises = raises
        self.calls = []

    async def get_chat_member(self, chat_id, user_id):
        self.calls.append((chat_id, user_id))
        if self.raises is not None:
            raise self.raises
        return FakeChatMember(self.status)


class FakeContext:
    def __init__(self, bot=None):
        self.bot = bot if bot is not None else FakeBot()
        self.user_data = {}


# ---------------------------------------------------------------------------
# Fake httpx
# ---------------------------------------------------------------------------

_UNSET = object()


class FakeResponse:
    def __init__(self, status_code=200, json_data=_UNSET, content=b"", headers=None):
        self.status_code = status_code
        self._json = json_data
        self.content = content
        self.headers = headers or {}

    def json(self):
        if self._json is _UNSET:
            raise ValueError("no json body")
        return self._json


class FakeHttp:
    """Stand-in for httpx.AsyncClient. Records calls, replays scripted results.

    Script a result with `http.get_result = ...` / `http.post_result = ...`.
    A FakeResponse is returned; an Exception instance is raised; a callable is
    invoked with (url, kwargs) and its return value used (so a test can vary
    the answer per call).
    """

    def __init__(self):
        self.calls = []
        self.get_result = FakeResponse(200, {})
        self.post_result = FakeResponse(200, {})

    # -- request recording ---------------------------------------------------
    def _record(self, method, url, kwargs):
        self.calls.append({
            "method": method,
            "url": url,
            "json": kwargs.get("json"),
            "params": kwargs.get("params"),
            "headers": kwargs.get("headers") or {},
        })

    def _resolve(self, result, url, kwargs):
        if callable(result) and not isinstance(result, FakeResponse):
            result = result(url, kwargs)
        if isinstance(result, BaseException):
            raise result
        return result

    def calls_to(self, needle, method=None):
        return [c for c in self.calls
                if needle in c["url"] and (method is None or c["method"] == method)]

    # -- AsyncClient surface -------------------------------------------------
    def __call__(self, *args, **kwargs):
        # httpx.AsyncClient(timeout=...) → returns the context manager
        return self

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    async def get(self, url, **kwargs):
        self._record("GET", url, kwargs)
        return self._resolve(self.get_result, url, kwargs)

    async def post(self, url, **kwargs):
        self._record("POST", url, kwargs)
        return self._resolve(self.post_result, url, kwargs)


class FakeClock:
    """Replaces bot's `time` module. monotonic() only moves when told to."""

    def __init__(self, start=1000.0):
        self.now = start

    def monotonic(self):
        return self.now

    def advance(self, seconds):
        self.now += seconds


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def reset_state(monkeypatch):
    """Module-level state is global — reset it so tests pass in any order."""
    def _clear():
        bot._reg_cache["chat_id"] = None
        bot._reg_cache["at"] = 0.0

    _clear()
    # Default posture for every test: no env override, secret configured.
    # (ALLOWED_CHAT_ID is read from SALES_CHAT_ID at import time, so tests set
    # the module attribute rather than the env var.)
    monkeypatch.setattr(bot, "ALLOWED_CHAT_ID", "")
    monkeypatch.setattr(bot, "BOT_SHARED_SECRET", "test-secret")
    yield
    _clear()


@pytest.fixture
def http(monkeypatch):
    fake = FakeHttp()
    monkeypatch.setattr(bot.httpx, "AsyncClient", fake)
    return fake


@pytest.fixture
def clock(monkeypatch):
    fake = FakeClock()
    monkeypatch.setattr(bot, "time", fake)
    return fake


@pytest.fixture
def request_error():
    return httpx.RequestError("connection refused")
