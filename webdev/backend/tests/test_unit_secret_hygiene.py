"""Secrets stay out of logs and out of a production boot.

No DB, no server. Covers utils/secret_hygiene.py, its wiring in server.py, the
export-job log lines, and the nginx access-log redaction map (its regex is
replayed here with Python's `re`, since the two engines agree on this pattern).
"""
import io
import logging
import os
import re

import pytest

from utils.secret_hygiene import (
    REDACTED,
    RedactingFormatter,
    install_redaction,
    mask_token,
    placeholder_secret_vars,
    redact,
)

_BACKEND = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_WEBDEV = os.path.dirname(_BACKEND)

# Shapes only — never a real credential.
FAKE_BOT_TOKEN = "123456789:AAH" + "x" * 32
FAKE_SUB_TOKEN = "Q" * 43


def _read(*parts):
    with open(os.path.join(*parts), encoding="utf-8") as fh:
        return fh.read()


# ---------------------------------------------------------------------------
# redact() / RedactingFormatter
# ---------------------------------------------------------------------------
class TestRedact:
    def test_bot_token_in_a_bot_api_url_is_masked(self):
        line = f"POST https://api.telegram.org/bot{FAKE_BOT_TOKEN}/sendMessage failed"
        out = redact(line)
        assert FAKE_BOT_TOKEN not in out
        assert f"bot{REDACTED}/sendMessage" in out

    def test_report_link_token_is_masked_but_the_path_is_kept(self):
        url = f"https://bizcheck.com.ua/api_crowe_bizcheck/submissions/7/report.pdf?t={FAKE_SUB_TOKEN}"
        out = redact(url)
        assert FAKE_SUB_TOKEN not in out
        assert out.endswith(f"/submissions/7/report.pdf?t={REDACTED}")

    @pytest.mark.parametrize("param", ["t", "token", "key", "api_key", "apikey", "secret", "KEY"])
    def test_credential_query_params_are_masked_others_kept(self, param):
        out = redact(f"/x?since_id=5&{param}=s3cr3tvalue&limit=10")
        assert "s3cr3tvalue" not in out
        assert "since_id=5" in out and "limit=10" in out

    def test_token_urlsafe_32_anywhere_keeps_a_prefix_only(self):
        import secrets
        tok = secrets.token_urlsafe(32)
        line = f"No such file or directory: '/var/spool/bizcheck_exports/{tok}/.state.json.tmp'"
        out = redact(line)
        assert tok not in out
        assert f"/bizcheck_exports/{tok[:6]}…{REDACTED}/.state.json.tmp" in out

    def test_jwt_signature_is_masked(self):
        sig = "S" * 43  # HS256 → 32 bytes → 43 base64url chars
        out = redact(f"token eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZG1pbiJ9.{sig}")
        assert sig not in out

    def test_shorter_and_longer_runs_are_not_masked(self):
        line = "x" * 42 + " " + "y" * 44 + " " + "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
        assert redact(line) == line

    def test_ordinary_text_is_untouched(self):
        line = "[crm] could not load submission 42 — webhook skipped"
        assert redact(line) == line

    def test_formatter_masks_the_traceback_too(self):
        logger = logging.getLogger("test.secret_hygiene.tb")
        stream = io.StringIO()
        handler = logging.StreamHandler(stream)
        handler.setFormatter(RedactingFormatter("%(levelname)s %(message)s"))
        logger.addHandler(handler)
        logger.propagate = False
        try:
            try:
                raise ValueError(f"URL can't contain control characters. "
                                 f"'/bot{FAKE_BOT_TOKEN}\r/sendMessage'")
            except ValueError:
                logger.exception("[sales] createForumTopic error")
        finally:
            logger.removeHandler(handler)
        text = stream.getvalue()
        assert "createForumTopic error" in text and "Traceback" in text
        assert FAKE_BOT_TOKEN not in text

    def test_install_redaction_keeps_the_existing_format(self):
        logger = logging.getLogger("test.secret_hygiene.install")
        stream = io.StringIO()
        handler = logging.StreamHandler(stream)
        handler.setFormatter(logging.Formatter("FMT|%(name)s|%(message)s"))
        logger.addHandler(handler)
        logger.propagate = False
        try:
            install_redaction(logger)
            logger.warning("link ?t=%s", FAKE_SUB_TOKEN)
        finally:
            logger.removeHandler(handler)
        assert stream.getvalue().strip() == f"FMT|test.secret_hygiene.install|link ?t={REDACTED}"


def test_mask_token_keeps_a_short_prefix_only():
    assert mask_token(FAKE_SUB_TOKEN) == "QQQQQQ…"
    assert mask_token("abc") == REDACTED
    assert mask_token(None) == REDACTED


# ---------------------------------------------------------------------------
# Production boot refuses public placeholder secrets
# ---------------------------------------------------------------------------
def _compose_secret_defaults():
    """`VAR: ${VAR:-default}` pairs of docker-compose.yml for the guarded vars."""
    compose = _read(_WEBDEV, "docker-compose.yml")
    pairs = re.findall(
        r"^\s*(JWT_SECRET|JWT_REFRESH_SECRET|ADMIN_PASSWORD|PII_ENCRYPTION_KEY):\s*"
        r"\$\{\1:-([^}]*)\}", compose, re.M)
    assert pairs, "docker-compose.yml no longer has ${VAR:-default} for the secrets?"
    return pairs


def _env_example_values(*parts):
    pairs = re.findall(
        r"^(JWT_SECRET|JWT_REFRESH_SECRET|ADMIN_PASSWORD|PII_ENCRYPTION_KEY)=(.+)$",
        _read(*parts), re.M)
    assert pairs
    return pairs


@pytest.mark.parametrize("source", ["compose", "root-example", "backend-example"])
def test_every_shipped_placeholder_is_refused(source):
    pairs = {
        "compose": _compose_secret_defaults,
        "root-example": lambda: _env_example_values(_WEBDEV, ".env.example"),
        "backend-example": lambda: _env_example_values(_BACKEND, ".env.example"),
    }[source]()
    env = dict(pairs)
    assert sorted(placeholder_secret_vars(env)) == sorted(env), \
        f"a {source} placeholder would boot production unnoticed"


def test_real_looking_secrets_pass():
    env = {
        "JWT_SECRET": "pJ3x9-k2LwQ7_rT0vZ8mN5bY1cH4fG6s",
        "JWT_REFRESH_SECRET": "Yt8sKq2Lm5Np7Rx0Vb3Cz6Dw9Fh1Gj4k",
        "ADMIN_PASSWORD": "correct horse battery staple",
        "PII_ENCRYPTION_KEY": "c2VjcmV0LWtleS1zaG91bGQtYmUtNDQtY2hhcnMtbG9uZz0=",
    }
    assert placeholder_secret_vars(env) == []


def test_unset_vars_are_left_to_the_required_env_check():
    assert placeholder_secret_vars({}) == []


def test_server_py_wires_the_redaction_and_the_production_guard():
    src = _read(_BACKEND, "server.py")
    assert "install_redaction()" in src
    guard = re.search(
        r'if os\.getenv\("NODE_ENV"\) == "production":\s*\n(?:\s*#.*\n)*'
        r"\s*for _var in placeholder_secret_vars\(os\.environ\):.*?sys\.exit\(1\)",
        src, re.S)
    assert guard, "server.py must exit in production on a placeholder secret"


# ---------------------------------------------------------------------------
# Export-job tokens are capabilities: logs carry a prefix only
# ---------------------------------------------------------------------------
def test_export_job_state_failure_logs_a_masked_token(monkeypatch, tmp_path, caplog):
    from services import export_jobs as ej

    monkeypatch.setenv("EXPORT_SPOOL_DIR", str(tmp_path / "spool"))
    token = "J" * 43  # valid alphabet/length, but its job dir does not exist
    with caplog.at_level(logging.WARNING, logger=ej.log.name):
        assert ej._write_state(token, {"state": "running"}) is False
    assert "could not persist state for JJJJJJ…" in caplog.text
    assert token not in caplog.text


# ---------------------------------------------------------------------------
# nginx access logs: same redaction for $request and Referer
# ---------------------------------------------------------------------------
def _nginx_maps(conf_text):
    """(pcre, replacement) per `map` that rewrites a value for the log."""
    out = re.findall(r'^\s*"~\*([^"]+)"\s+"([^"]+)";', conf_text, re.M)
    assert len(out) == 2, "expected the $request and $http_referer maps"
    return out


def _apply_nginx_map(pattern, replacement, value):
    py = pattern.replace("(?<", "(?P<")
    m = re.match(py, value, re.I)
    if not m:
        return value
    return re.sub(r"\$\{(\w+)\}", lambda g: m.group(g.group(1)), replacement)


@pytest.mark.parametrize("conf", ["nginx.conf", "nginx-proxy.conf.example"])
def test_nginx_log_maps_redact_the_report_token(conf):
    text = _read(_WEBDEV, conf)
    req = f"GET /api_crowe_bizcheck/submissions/7/report.pdf?t={FAKE_SUB_TOKEN} HTTP/1.1"
    for pattern, replacement in _nginx_maps(text):
        out = _apply_nginx_map(pattern, replacement, req)
        assert FAKE_SUB_TOKEN not in out
        assert out == "GET /api_crowe_bizcheck/submissions/7/report.pdf?t=REDACTED HTTP/1.1"
        # Unrelated query strings are logged verbatim.
        plain = "GET /api_crowe_bizcheck/crm/leads?since_id=5&limit=10 HTTP/1.1"
        assert _apply_nginx_map(pattern, replacement, plain) == plain
        # A param that merely ENDS in "t" is not a credential.
        assert _apply_nginx_map(pattern, replacement, "GET /x?sort=asc HTTP/1.1") \
            == "GET /x?sort=asc HTTP/1.1"


@pytest.mark.parametrize("conf, fmt", [
    ("nginx.conf", "bizcheck_redacted"),
    ("nginx-proxy.conf.example", "bizcheck_ua_redacted"),
])
def test_every_logging_server_block_uses_the_redacted_format(conf, fmt):
    text = _read(_WEBDEV, conf)
    servers = text.count("\nserver {")
    on = re.findall(r"^\s*access_log\s+(\S+)\s+(\S+);", text, re.M)
    assert len(on) == servers, "one redacted access_log per server block"
    assert all(f == fmt for _, f in on)
