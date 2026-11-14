"""Telegram bot tokens must never reach log output (message, args, traceback)."""
import io
import logging

from utils.secret_hygiene import install_redaction

# Built at runtime so no token-looking literal is committed.
SECRET = "A" * 35
BARE = "123456789:" + SECRET
URL = "https://api.telegram.org/bot" + BARE + "/sendMessage"


def _logger(name):
    stream = io.StringIO()
    handler = logging.StreamHandler(stream)
    handler.setFormatter(logging.Formatter("%(levelname)s %(name)s: %(message)s"))
    lg = logging.getLogger(name)
    lg.handlers = [handler]
    lg.propagate = False
    lg.setLevel(logging.INFO)
    install_redaction(lg)
    return lg, stream


def test_message_args_and_traceback_are_redacted():
    lg, stream = _logger("t.redact.all")
    lg.info("calling " + URL)
    lg.info("arg %s", URL)
    lg.info("bare %s", BARE)
    try:
        raise RuntimeError("failed: " + URL)
    except RuntimeError:
        lg.exception("send failed")
    out = stream.getvalue()
    assert SECRET not in out
    assert "123456789:" not in out
    assert "bot<redacted>" in out


def test_bare_token_is_masked():
    lg, stream = _logger("t.redact.bare")
    lg.warning("token=%s end", BARE)
    assert SECRET not in stream.getvalue()


def test_gunicorn_loggers_get_redacted_handlers():
    lg = logging.getLogger("gunicorn.error")
    old = lg.handlers[:]
    stream = io.StringIO()
    lg.handlers = [logging.StreamHandler(stream)]
    try:
        install_redaction()
        lg.error("boom " + URL)
        assert SECRET not in stream.getvalue()
    finally:
        lg.handlers = old
