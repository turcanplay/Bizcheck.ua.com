"""Test fakes for the client bot.

Same posture as webdev/groupbot/tests/conftest.py — nothing here touches the
network or the real Telegram API:

  * the telegram objects (Update/Chat/User/Message/CallbackQuery/Contact) are
    hand-rolled duck-typed fakes — handlers.py only reads a handful of
    attributes off them;
  * httpx.AsyncClient is replaced by FakeHttp, which records every request and
    replays a scripted response (or raises an httpx error);
  * the retry backoff is set to 0 so the retry LOGIC is exercised without the
    suite ever sleeping.
"""
import os
import sys

import httpx
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import backend  # noqa: E402
import handlers  # noqa: E402


# ---------------------------------------------------------------------------
# Fake telegram objects
# ---------------------------------------------------------------------------

class FakeUser:
    def __init__(self, id=42, username="olga", first_name="Olga",
                 last_name="Kovalenko", language_code="uk"):
        self.id = id
        self.username = username
        self.first_name = first_name
        self.last_name = last_name
        self.language_code = language_code


class FakeContact:
    def __init__(self, phone_number="+380671234567"):
        self.phone_number = phone_number


class FakeMessage:
    """Records replies / edits / deletions instead of sending them."""

    def __init__(self, chat=None, text="", contact=None):
        self.chat = chat
        self.text = text
        self.contact = contact
        self.replies = []
        self.edits = []
        self.deleted = False

    async def reply_text(self, text, **kwargs):
        self.replies.append({"text": text, **kwargs})
        return FakeMessage(chat=self.chat, text=text)

    async def edit_text(self, text, **kwargs):
        self.edits.append({"text": text, **kwargs})
        self.text = text
        return self

    async def delete(self):
        self.deleted = True

    @property
    def last_reply(self):
        return self.replies[-1]["text"] if self.replies else None

    @property
    def last_edit(self):
        return self.edits[-1]["text"] if self.edits else None


class FakeChat:
    """Records every outgoing message / document."""

    def __init__(self, id=42, type="private"):
        self.id = id
        self.type = type
        self.messages = []
        self.documents = []

    async def send_message(self, text, **kwargs):
        msg = FakeMessage(chat=self, text=text)
        self.messages.append({"text": text, "msg": msg, **kwargs})
        return msg

    async def send_document(self, document=None, filename=None, **kwargs):
        self.documents.append({
            "bytes": document.getvalue() if hasattr(document, "getvalue") else document,
            "filename": filename,
            **kwargs,
        })

    @property
    def texts(self):
        return [m["text"] for m in self.messages]


class FakeCallbackQuery:
    def __init__(self, data="", chat=None):
        self.data = data
        self.message = FakeMessage(chat=chat)
        self.answered = False

    async def answer(self, *args, **kwargs):
        self.answered = True


class FakeUpdate:
    """Duck-type of telegram.Update — only what handlers.py actually reads."""

    def __init__(self, chat=None, user=None, text="", contact=None,
                 callback_data=None):
        self.effective_chat = chat if chat is not None else FakeChat()
        self.effective_user = user if user is not None else FakeUser()
        self.message = FakeMessage(chat=self.effective_chat, text=text,
                                   contact=contact)
        self.effective_message = self.message
        self.callback_query = (
            FakeCallbackQuery(callback_data, chat=self.effective_chat)
            if callback_data is not None else None
        )


class FakeContext:
    def __init__(self, args=None):
        self.args = args or []
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

    Script with `http.get_result = ...` / `http.post_result = ...`:
      * a FakeResponse is returned,
      * an Exception instance is raised,
      * a callable is invoked with (url, kwargs) and its return value used, so a
        test can vary the answer per attempt (used by the retry tests).
    """

    def __init__(self):
        self.calls = []
        self.get_result = FakeResponse(200, {})
        self.post_result = FakeResponse(200, {})

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


class Scripted:
    """Callable result that returns/raises the next item on each attempt.

    The last item is repeated once the script runs out.
    """

    def __init__(self, *results):
        self.results = list(results)
        self.n = 0

    def __call__(self, url, kwargs):
        item = self.results[min(self.n, len(self.results) - 1)]
        self.n += 1
        return item


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def no_backoff(monkeypatch):
    """Keep the retry logic, drop the waiting — the suite must never sleep."""
    monkeypatch.setattr(backend, "RETRY_BASE_DELAY", 0.0)
    monkeypatch.setattr(backend, "RETRY_MAX_DELAY", 0.0)
    monkeypatch.setattr(backend, "BOT_SHARED_SECRET", "test-secret", raising=False)
    monkeypatch.setattr(backend, "bot_headers", lambda: {"X-Bot-Secret": "test-secret"})


@pytest.fixture
def http(monkeypatch):
    fake = FakeHttp()
    monkeypatch.setattr(backend.httpx, "AsyncClient", fake)
    return fake


@pytest.fixture
def connect_error():
    return httpx.ConnectError("connection refused")


@pytest.fixture
def handlers_mod():
    return handlers
