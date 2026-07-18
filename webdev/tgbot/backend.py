"""
Thin async client for the backend's `/tg/*` endpoints.

Each function performs one request and returns the raw ``httpx.Response`` so the
handlers keep full control over status-code branching (which user message to
show). Network failures raise ``httpx.RequestError`` for the caller to catch.
Timeouts and the shared-secret header match the original inline calls exactly.
"""

import httpx

from config import BACKEND_URL, API_PREFIX, bot_headers


def _url(path: str) -> str:
    return f"{BACKEND_URL}{API_PREFIX}{path}"


async def get_report(token: str) -> httpx.Response:
    """Fetch report data + base64 PDF for a delivery token."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        return await client.get(_url(f"/report/{token}"))


async def report_failed(token: str, reason: str, payload: dict) -> httpx.Response:
    """Tell the backend the report could NOT be delivered so it can alert the
    sales team. Best-effort — the caller swallows any error (the user already
    sees the failure message)."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        return await client.post(_url(f"/report/{token}/failed"),
                                 json={"reason": reason, **payload})


async def save_contact(token: str, payload: dict) -> httpx.Response:
    """Persist the user's Telegram identity for follow-up."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        return await client.post(_url(f"/contact/{token}"), json=payload)


async def send_email(token: str, email: str) -> httpx.Response:
    """Ask the backend to email the report (200 sent / 409 pending / 404 expired)."""
    async with httpx.AsyncClient(timeout=20.0) as client:
        return await client.post(_url(f"/email/{token}"), json={"email": email})


async def save_lead(token: str, payload: dict) -> httpx.Response:
    """Save a sales lead — ``{"email", "phone"}`` or phone-only ``{"phone"}``."""
    async with httpx.AsyncClient(timeout=20.0) as client:
        return await client.post(_url(f"/lead/{token}"), json=payload)


async def feedback_open(payload: dict) -> httpx.Response:
    """Bind a chat to a feedback-outreach token (bot-secret gated)."""
    async with httpx.AsyncClient(timeout=20.0) as client:
        return await client.post(_url("/feedback/open"), json=payload, headers=bot_headers())


async def feedback_reply(payload: dict) -> httpx.Response:
    """Submit a free-text reply to an open feedback question (bot-secret gated)."""
    async with httpx.AsyncClient(timeout=20.0) as client:
        return await client.post(_url("/feedback/reply"), json=payload, headers=bot_headers())
