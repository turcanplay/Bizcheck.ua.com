"""ETAPA 1 — trimite UN mesaj text simplu prin SMTP, ca să verifici că
credentialele merg și unde aterizează (Inbox vs Spam).

Standalone: nu depinde de restul aplicației, citește doar SMTP_* din mediu.
Rulează în containerul backend (unde .env e încărcat):

    docker compose exec backend python -m scripts.smtp_simple_test
    # sau alt destinatar:
    docker compose exec backend python -m scripts.smtp_simple_test --to cineva@exemplu.md
"""
import argparse
import os
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr, formatdate, make_msgid


def main() -> int:
    p = argparse.ArgumentParser(description="Send a simple SMTP test message.")
    p.add_argument("--to", default="chistol.max2004@gmail.com", help="Recipient email")
    p.add_argument("--debug", action="store_true", help="Print the full SMTP conversation (queue id, etc.)")
    args = p.parse_args()

    host = os.environ.get("SMTP_HOST", "smtp.office365.com")
    port = int(os.environ.get("SMTP_PORT", "587"))
    user = os.environ.get("SMTP_USER", "")
    pwd = os.environ.get("SMTP_PASSWORD", "")

    print(f"HOST={host} PORT={port} USER={user or '(unset)'} PWSET={'yes' if pwd else 'NO'}")
    if not (user and pwd):
        print("EROARE: SMTP_USER / SMTP_PASSWORD nu sunt setate in .env pe server.")
        return 2

    domain = user.split("@")[-1]
    msg = EmailMessage()
    msg["Subject"] = "Test BizCheck - mesaj simplu"
    msg["From"] = formataddr((os.environ.get("SMTP_FROM_NAME", "Crowe Turcan Mikhailenko"), user))
    msg["To"] = args.to
    msg["Reply-To"] = os.environ.get("SMTP_REPLY_TO", user)
    msg["Date"] = formatdate(localtime=False)
    msg["Message-ID"] = make_msgid(domain=domain)
    msg.set_content(
        f"Mesaj de test simplu de la {user}.\n"
        "Daca il vezi in Inbox, SMTP si livrarea functioneaza."
    )

    ctx = ssl.create_default_context()
    try:
        if port == 465:
            srv = smtplib.SMTP_SSL(host, port, timeout=30, context=ctx)
        else:
            srv = smtplib.SMTP(host, port, timeout=30)
            srv.ehlo()
            srv.starttls(context=ctx)
            srv.ehlo()
        if args.debug:
            srv.set_debuglevel(1)
        srv.login(user, pwd)
        # send_message returns a dict of REFUSED recipients (empty = all accepted).
        refused = srv.send_message(msg)
        srv.quit()
    except Exception as e:
        print(f"ESUAT: {type(e).__name__}: {e}")
        return 1

    if refused:
        print(f"ATENTIE: server a REFUZAT destinatari: {refused}")
        return 1
    print(f"OK -> acceptat in coada de {host} pentru {args.to} (de la {user})")
    print("NB: 'acceptat' != 'livrat'. Daca nu apare in Gmail (nici Spam),")
    print("    verifica cutia office@bizcheck.md pentru un bounce/Mailer-Daemon.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
