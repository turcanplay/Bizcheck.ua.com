"""
Thin async client for the backend's `/tg/*` endpoints.

Each function performs one request and returns the raw ``httpx.Response`` so the
handlers keep full control over status-code branching (which user message to
show). Network failures raise ``httpx.RequestError`` for the caller to catch.

Every call goes through ``_request()``, which retries **transient** failures
only:

  * ``httpx.RequestError`` — connect / read / write timeouts, DNS, refused
    connections. The backend may simply be restarting.
  * ``5xx`` responses — the backend is up but broke on this request.

4xx responses are returned as-is on the first try: 403/404/409 are legitimate
answers ("wrong token", "link expired", "PDF not ready yet") and retrying them
would only make the user wait for the same error.

The shared secret (``X-Bot-Secret``) is sent on every call. The backend gates
the bot-only endpoints with it; the token-scoped ones ignore an extra header,
so sending it unconditionally is safe and keeps the bot working if/when more
endpoints get gated.
"""

import asyncio
import random

import httpx

from config import (
    BACKEND_URL, API_PREFIX, bot_headers, logger,
    RETRY_ATTEMPTS, RETRY_BASE_DELAY, RETRY_MAX_DELAY, RETRY_JITTER,
)


def _url(path: str) -> str:
    return f"{BACKEND_URL}{API_PREFIX}{path}"


def _backoff(attempt: int) -> float:
    """Delay before retry #attempt (0-based): 0.5s, 1s, 2s… plus jitter."""
    delay = min(RETRY_BASE_DELAY * (2 ** attempt), RETRY_MAX_DELAY)
    return delay + random.uniform(-RETRY_JITTER, RETRY_JITTER) * delay


async def _request(method: str, path: str, *, timeout: float, **kwargs) -> httpx.Response:
    """One backend call with retry/backoff on transient failures.

    Returns the last response (even a 5xx, so the caller can branch on the
    status code as before) or re-raises the last ``httpx.RequestError`` when
    every attempt failed to reach the backend at all.
    """
    url = _url(path)
    headers = {**bot_headers(), **(kwargs.pop("headers", None) or {})}
    resp = None
    last_exc = None

    for attempt in range(RETRY_ATTEMPTS):
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                resp = await getattr(client, method)(url, headers=headers, **kwargs)
            if resp.status_code < 500:
                return resp                       # success or a real 4xx answer
            last_exc = None
        except httpx.RequestError as exc:
            resp = None
            last_exc = exc

        if attempt == RETRY_ATTEMPTS - 1:
            break
        delay = _backoff(attempt)
        logger.warning(
            "backend %s %s failed (%s), retry %d/%d in %.1fs",
            method.upper(), path,
            last_exc if last_exc is not None else f"HTTP {resp.status_code}",
            attempt + 1, RETRY_ATTEMPTS - 1, delay,
        )
        await asyncio.sleep(delay)

    if resp is not None:
        return resp                               # exhausted retries on a 5xx
    raise last_exc                                # exhausted retries on network errors


async def get_report(token: str) -> httpx.Response:
    """Fetch report data + base64 PDF for a delivery token."""
    return await _request("get", f"/report/{token}", timeout=30.0)


async def report_failed(token: str, reason: str, payload: dict) -> httpx.Response:
    """Tell the backend the report could NOT be delivered so it can alert the
    sales team. Best-effort — the caller swallows any error (the user already
    sees the failure message)."""
    return await _request("post", f"/report/{token}/failed", timeout=10.0,
                          json={"reason": reason, **payload})


async def save_contact(token: str, payload: dict) -> httpx.Response:
    """Persist the user's Telegram identity for follow-up."""
    return await _request("post", f"/contact/{token}", timeout=10.0, json=payload)


async def send_email(token: str, email: str) -> httpx.Response:
    """Ask the backend to email the report (200 sent / 409 pending / 404 expired)."""
    return await _request("post", f"/email/{token}", timeout=20.0, json={"email": email})


async def save_lead(token: str, payload: dict) -> httpx.Response:
    """Save a sales lead — ``{"email", "phone"}`` or phone-only ``{"phone"}``."""
    return await _request("post", f"/lead/{token}", timeout=20.0, json=payload)


async def feedback_open(payload: dict) -> httpx.Response:
    """Bind a chat to a feedback-outreach token (bot-secret gated)."""
    return await _request("post", "/feedback/open", timeout=20.0, json=payload)


async def feedback_reply(payload: dict) -> httpx.Response:
    """Submit a free-text reply to an open feedback question (bot-secret gated)."""
    return await _request("post", "/feedback/reply", timeout=20.0, json=payload)
