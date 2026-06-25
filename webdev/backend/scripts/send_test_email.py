"""Send ONE test report email to verify SMTP + deliverability (inbox vs spam).

Reuses the exact same template/sender as the real flow, so what lands in your
inbox is byte-for-byte what a real user receives. Reads SMTP_* from the
environment (the backend container's .env), so run it where those are set.

Usage (inside the backend dir / container):

    venv/Scripts/python -m scripts.send_test_email --to you@gmail.com
    # or:
    python -m scripts.send_test_email --to you@gmail.com --lang ru --score 72

Send to a few providers (gmail.com, outlook.com, yahoo, a corporate one) and
check the Spam folder in each — that tells you the real inbox placement.
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from services.email_service import send_report_email_sync, _smtp_configured, _env  # noqa: E402


def main() -> int:
    p = argparse.ArgumentParser(description="Send a BizCheck test report email.")
    p.add_argument("--to", required=True, help="Recipient email address")
    p.add_argument("--lang", default="uk", choices=["uk", "en"], help="Email language")
    p.add_argument("--name", default="Test", help="First name in the greeting")
    p.add_argument("--score", type=int, default=78, help="Score shown in the ring (0-100)")
    p.add_argument(
        "--link",
        default="https://bizcheck.md",
        help="URL the 'open report' button points to (any reachable URL is fine for a test)",
    )
    args = p.parse_args()

    print("── SMTP config in use ──────────────────────────────")
    print(f"  SMTP_HOST     : {_env('SMTP_HOST') or '(unset)'}")
    print(f"  SMTP_PORT     : {_env('SMTP_PORT') or '(default 587)'}")
    print(f"  SMTP_USER/From: {_env('SMTP_USER') or '(unset)'}")
    print(f"  SMTP_REPLY_TO : {_env('SMTP_REPLY_TO') or '(falls back to From)'}")
    print(f"  SMTP_FROM_NAME: {_env('SMTP_FROM_NAME') or '(default)'}")
    print(f"  password set  : {'yes' if _env('SMTP_PASSWORD') else 'NO — sending will be skipped'}")
    print("────────────────────────────────────────────────────")

    if not _smtp_configured():
        print("ERROR: SMTP is not fully configured (need SMTP_HOST, SMTP_USER, SMTP_PASSWORD).")
        print("Run this inside the backend container where the real .env is loaded.")
        return 2

    date_str = "4 iunie 2026" if args.lang == "uk" else "4 июня 2026"
    test_name = "Raport BizCheck — TEST" if args.lang == "uk" else "Отчёт BizCheck — ТЕСТ"

    print(f"Sending test email to {args.to} (lang={args.lang}, score={args.score}) ...")
    ok = send_report_email_sync(
        to_email=args.to,
        first_name=args.name,
        lang=args.lang,
        test_name=test_name,
        date_str=date_str,
        score=args.score,
        download_url=args.link,
    )

    if ok:
        print("✅ SENT. Now check the inbox AND the Spam folder of:", args.to)
        print("   Tip: open the message → 'Show original' (Gmail) and confirm")
        print("   SPF=pass, DKIM=pass, DMARC=pass, and that From domain == bizcheck.md.")
        return 0

    print("❌ FAILED. Check the logs above / SMTP credentials (app password).")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
