"""
Email delivery service for BizCheck reports.

Sends the generated PDF to the user's email asynchronously via SMTP
(Office 365 — smtp.office365.com:587 with STARTTLS). Runs in a background
thread so the HTTP request returns immediately with 202 Accepted.

Configuration (read from env vars — see .env.example):
    SMTP_HOST          smtp.office365.com
    SMTP_PORT          587
    SMTP_USER          office@bizcheck.md          (this is the From address)
    SMTP_PASSWORD      <Office 365 app password — 16 chars>
    SMTP_FROM_NAME     Crowe Turcan Mikhailenko
    SMTP_REPLY_TO      office@bizcheck.md           (user replies go here)
    EMAIL_LOGO_URL     https://bizcheck.md/logo_email.png

Not configured? Sending is skipped and the queued task logs a warning.
"""
import logging
import os
import smtplib
import ssl
import threading
import urllib.request
from email.message import EmailMessage
from email.utils import formataddr, formatdate, make_msgid

from services.email_templates import render as render_email

log = logging.getLogger(__name__)

# Content-ID used for the inline (embedded) logo. Embedding the logo as a
# `cid:` part instead of a remote <img src="https://..."> removes two spam
# signals: an external image fetch, and a cross-domain image. Fetched once,
# then cached. (Logo + From + links all stay on bizcheck.md.)
_LOGO_CID = "reportlogo"
_logo_cache: dict[str, bytes | None] = {}


def _env(name: str, default: str = "") -> str:
    return (os.getenv(name) or default).strip()


def _smtp_configured() -> bool:
    return bool(_env("SMTP_HOST") and _env("SMTP_USER") and _env("SMTP_PASSWORD"))


def _load_logo_bytes(url: str) -> bytes | None:
    """Fetch the logo once and cache it. Returns None on any failure so the
    caller falls back to the remote <img> URL (email still sends fine)."""
    if not url or not url.startswith(("http://", "https://")):
        return None
    if url in _logo_cache:
        return _logo_cache[url]
    data: bytes | None = None
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "BizCheck-Mailer"})
        with urllib.request.urlopen(req, timeout=8) as resp:  # noqa: S310 — fixed https logo URL
            raw = resp.read(2 * 1024 * 1024)  # cap at 2 MB
            if raw:
                data = raw
    except Exception as e:
        log.warning("[email] could not fetch logo %s for inlining: %s", url, e)
    _logo_cache[url] = data
    return data


def _build_message(
    *,
    to_email: str,
    subject: str,
    html_body: str,
    text_body: str,
    pdf_bytes: bytes,
    pdf_filename: str,
    logo_bytes: bytes | None = None,
) -> EmailMessage:
    """Build a multipart email: text fallback + HTML body + PDF attachment.

    The Message-ID domain MUST match the From domain (DKIM/DMARC alignment) —
    a mismatch is a classic spam signal.
    """
    msg = EmailMessage()
    from_name = _env("SMTP_FROM_NAME", "Crowe Turcan Mikhailenko")
    from_addr = _env("SMTP_USER")
    reply_to = _env("SMTP_REPLY_TO") or from_addr
    from_domain = from_addr.split("@")[-1] if "@" in from_addr else "bizcheck.md"

    msg["Subject"] = subject
    msg["From"] = formataddr((from_name, from_addr))
    msg["To"] = to_email
    msg["Reply-To"] = reply_to
    msg["Date"] = formatdate(localtime=False)
    msg["Message-ID"] = make_msgid(domain=from_domain)
    # Transactional, system-generated — tells filters this is not a mailing list.
    msg["Auto-Submitted"] = "auto-generated"

    # Real plain-text alternative (mirrors the HTML — see email_templates).
    msg.set_content(text_body)
    msg.add_alternative(html_body, subtype="html")

    # Embed the logo inline (cid:) on the HTML part when we have the bytes, so
    # there is no remote image fetch and no cross-domain image.
    if logo_bytes:
        html_part = msg.get_payload()[-1]
        try:
            html_part.add_related(
                logo_bytes, maintype="image", subtype="png", cid=f"<{_LOGO_CID}>"
            )
        except Exception as e:
            log.warning("[email] could not inline logo: %s", e)

    # Attach the PDF report (only if the caller explicitly passed bytes)
    if pdf_bytes:
        msg.add_attachment(
            pdf_bytes,
            maintype="application",
            subtype="pdf",
            filename=pdf_filename,
        )

    return msg


def _deliver(
    *,
    to_email: str,
    subject: str,
    html_body: str,
    text_body: str,
    pdf_bytes: bytes,
    pdf_filename: str,
    logo_bytes: bytes | None,
) -> bool:
    """Build + send one message over SMTP. Returns True on success, else False."""
    if not _smtp_configured():
        log.warning("[email] SMTP not configured — skipping send to %s", to_email)
        return False

    host = _env("SMTP_HOST", "smtp.office365.com")
    port = int(_env("SMTP_PORT", "587"))
    user = _env("SMTP_USER")
    password = _env("SMTP_PASSWORD")

    msg = _build_message(
        to_email=to_email,
        subject=subject,
        html_body=html_body,
        text_body=text_body,
        pdf_bytes=pdf_bytes,
        pdf_filename=pdf_filename,
        logo_bytes=logo_bytes,
    )

    # Port 465 = implicit SSL (SMTPS, e.g. cPanel/topost). Port 587/25 = STARTTLS
    # (e.g. Office 365). Pick the right transport based on the port.
    context = ssl.create_default_context()
    try:
        if port == 465:
            with smtplib.SMTP_SSL(host, port, timeout=30, context=context) as server:
                server.login(user, password)
                server.send_message(msg)
        else:
            with smtplib.SMTP(host, port, timeout=30) as server:
                server.ehlo()
                server.starttls(context=context)
                server.ehlo()
                server.login(user, password)
                server.send_message(msg)
        log.info("[email] sent to %s (%s)", to_email,
                 f"pdf {len(pdf_bytes) // 1024} KB attached" if pdf_bytes else "download link, no attachment")
        return True
    except smtplib.SMTPAuthenticationError as e:
        log.error("[email] SMTP auth failed for %s: %s — check SMTP_USER/SMTP_PASSWORD (app password)", user, e)
    except smtplib.SMTPException as e:
        log.error("[email] SMTP error sending to %s: %s", to_email, e)
    except Exception as e:
        log.exception("[email] unexpected error sending to %s: %s", to_email, e)
    return False


def send_report_email_sync(
    *,
    to_email: str,
    first_name: str,
    lang: str,
    test_name: str,
    date_str: str,
    score: int,
    pdf_bytes: bytes | None = None,
    pdf_filename: str = "BizCheck_Report.pdf",
    logo_url: str | None = None,
    download_url: str | None = None,
) -> bool:
    """Render + send the report email synchronously. Returns True on success.

    Use this from scripts/tests where you want the result. The web/Telegram
    paths use the async wrapper below.
    """
    if not to_email:
        log.warning("[email] missing to_email — skipping")
        return False

    effective_logo = logo_url or _env("EMAIL_LOGO_URL", "https://bizcheck.md/logo_email.png")
    reply_to = _env("SMTP_REPLY_TO") or _env("SMTP_USER") or "office@bizcheck.md"

    # Inline the logo when we can fetch it; otherwise reference it remotely.
    logo_bytes = _load_logo_bytes(effective_logo)
    logo_src = f"cid:{_LOGO_CID}" if logo_bytes else effective_logo

    subject, html_body, text_body = render_email(
        lang=lang,
        first_name=first_name,
        test_name=test_name,
        date_str=date_str,
        score=score,
        logo_url=logo_src,
        download_url=download_url,
        reply_to=reply_to,
    )

    return _deliver(
        to_email=to_email,
        subject=subject,
        html_body=html_body,
        text_body=text_body,
        pdf_bytes=pdf_bytes or b"",
        pdf_filename=pdf_filename,
        logo_bytes=logo_bytes,
    )


def send_report_email_async(
    *,
    to_email: str,
    first_name: str,
    lang: str,
    test_name: str,
    date_str: str,
    score: int,
    pdf_bytes: bytes | None = None,
    pdf_filename: str = "BizCheck_Report.pdf",
    logo_url: str | None = None,
    download_url: str | None = None,
) -> None:
    """Fire-and-forget email send. Returns immediately; actual delivery
    happens in a daemon thread. Errors are logged, not propagated.

    The report is delivered as a secure download LINK (``download_url``), not as
    an attachment — this keeps the message small (a multi-MB PDF from a young
    domain trips spam filters). Pass ``pdf_bytes`` only if you explicitly want
    the file attached as well; normally leave it None.

    Caller should have already validated that `to_email` is non-empty.
    """
    if not to_email:
        log.warning("[email] missing to_email — skipping")
        return

    # Daemon=True so a stuck send doesn't prevent backend shutdown.
    t = threading.Thread(
        target=send_report_email_sync,
        kwargs=dict(
            to_email=to_email,
            first_name=first_name,
            lang=lang,
            test_name=test_name,
            date_str=date_str,
            score=score,
            pdf_bytes=pdf_bytes,
            pdf_filename=pdf_filename,
            logo_url=logo_url,
            download_url=download_url,
        ),
        daemon=True,
        name=f"email-{to_email[:20]}",
    )
    t.start()
