"""Keep secrets out of logs and out of a production boot.

Two small, dependency-free helpers, imported by server.py before anything logs:

* ``RedactingFormatter`` — masks secrets in every formatted log line, traceback
  included. Same idea as the bots' formatter (webdev/tgbot/config.py):
    - a Telegram bot token inside a Bot API URL (`bot<id>:<secret>`), which an
      urllib/http.client exception can carry into `log.exception(...)`;
    - credential-bearing query parameters (`?t=<submission_token>` on the
      emailed report link, `token=`, `key=`, `api_key=`, `secret=`);
    - any standalone 43-char URL-safe run: the exact shape of
      `secrets.token_urlsafe(32)`, which every capability token here uses
      (submission_token, tg deep-link token, CSRF token, export-job id — the
      latter is also a spool directory name, so it shows up in OSError paths).
      An HS256 JWT signature has the same shape. A 6-char prefix is kept so log
      lines can still be correlated.
* ``placeholder_secret_vars`` — names of secret env vars still holding a value
  shipped in `.env.example` or as a docker-compose `${VAR:-default}`. Those
  values are public (they are in git), so a JWT secret left on one would let
  anyone forge an admin session. deploy.sh refuses them already; the backend
  refuses them too, so a manual `docker compose up` can't bypass the check.
"""
import logging
import re

REDACTED = "<redacted>"

_BOT_TOKEN_RE = re.compile(r"bot\d+:[A-Za-z0-9_-]{20,}")
_QUERY_SECRET_RE = re.compile(
    r"([?&](?:t|token|key|api_key|apikey|secret)=)[^&\s\"'#]+", re.IGNORECASE
)
_URLSAFE_TOKEN_RE = re.compile(
    r"(?<![A-Za-z0-9_-])([A-Za-z0-9_-]{6})[A-Za-z0-9_-]{37}(?![A-Za-z0-9_-])"
)


def redact(text: str) -> str:
    """Mask bot tokens, credential query values and token_urlsafe(32) values."""
    text = _BOT_TOKEN_RE.sub("bot" + REDACTED, text)
    text = _QUERY_SECRET_RE.sub(r"\1" + REDACTED, text)
    return _URLSAFE_TOKEN_RE.sub(r"\1…" + REDACTED, text)


def mask_token(token) -> str:
    """Short, non-reusable reference to a capability token, for log context."""
    token = str(token or "")
    return f"{token[:6]}…" if len(token) > 6 else REDACTED


class RedactingFormatter(logging.Formatter):
    def format(self, record):
        return redact(super().format(record))


def install_redaction(logger: logging.Logger | None = None) -> None:
    """Swap the formatter of every handler on ``logger`` (root by default)."""
    logger = logger or logging.getLogger()
    for handler in logger.handlers:
        fmt = handler.formatter._fmt if handler.formatter else None
        datefmt = handler.formatter.datefmt if handler.formatter else None
        handler.setFormatter(RedactingFormatter(fmt, datefmt))


# Prefixes of the placeholder values in webdev/.env.example,
# webdev/backend/.env.example and the `${VAR:-…}` defaults of docker-compose.yml.
_PLACEHOLDER_RE = re.compile(
    r"^(change[_-]?this|change[_-]?me|your[_-]|<|xxx|placeholder)", re.IGNORECASE
)

SECRET_ENV_VARS = (
    "JWT_SECRET",
    "JWT_REFRESH_SECRET",
    "ADMIN_PASSWORD",
    "PII_ENCRYPTION_KEY",
)


def placeholder_secret_vars(env, names=SECRET_ENV_VARS) -> list[str]:
    """Names from ``names`` whose value in ``env`` is a known public placeholder."""
    bad = []
    for name in names:
        value = (env.get(name) or "").strip()
        if value and _PLACEHOLDER_RE.match(value):
            bad.append(name)
    return bad
