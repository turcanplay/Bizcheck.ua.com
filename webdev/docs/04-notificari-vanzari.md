# 04 — Notificări automate către echipa de vânzări

Sursă: `backend/services/sales_notify.py`

Când un vizitator completează un test pe bizcheck.md și lasă date de contact,
echipa primește automat o notificare TEXT într-un grup Telegram privat.

## Când se declanșează

Totul trece prin funcția `maybe_notify_sales(submission_id)`, apelată pe căile
de scriere ale unui lead:

- `PATCH` pe submission (formularul web salvează contactul),
- `/tg/contact` (utilizatorul lasă contactul prin botul de web),
- `/tg/lead`.

Notificarea pleacă DOAR când leadul e complet, adică are:

- **nume** (`first_name` sau `last_name`), ȘI
- **cel puțin un canal de contact** — `email`, `phone` sau `tg_chat_id`.

Dacă lipsește una dintre condiții, funcția iese în tăcere și așteaptă următoarea
scriere (`has_name and has_contact`).

## Fire-once: o singură notificare per lead

Riscul real: aceeași submisie e scrisă de mai multe ori (web + bot), aproape
simultan → duplicate în grup.

Soluția e o revendicare atomică pe coloana `submissions.sales_notified`:

- `Submission.claim_sales_notification(id)` — cine „câștigă" revendicarea trimite
  PRIMUL mesaj.
- Toate apelurile ulterioare NU mai trimit; în schimb **editează** mesajul deja
  existent (`get_sales_message` → `editMessageText`), ca să apară datele noi
  (ex. email adăugat mai târziu) fără spam.
- Dacă trimiterea eșuează real, revendicarea e eliberată
  (`release_sales_notification`) ca leadul să nu se piardă definitiv — o scriere
  viitoare reîncearcă.

## De ce un singur worker serializat

Trimiterea nu se face direct în firul cererii HTTP. Se pune un job într-o coadă
(`queue.Queue`, maxsize 2000) iar **un singur thread de fundal** (`sales-notify`,
pornit lazy prin `_ensure_worker`) golește coada job cu job.

Motivul: la un val de lead-uri NU vrem un thread per submisie (thread storm /
OOM). Un singur worker:

- spațiază mesajele la ~1.1s/mesaj (`_SEND_SPACING_SEC`) ca să respecte limita
  Telegram (~1 msg/s per chat),
- reîncearcă pe `429` folosind `retry_after` (`_MAX_SEND_RETRY`).

Dacă coada e plină, jobul e abandonat (nu blochează cererea) și revendicarea e
eliberată pentru reîncercare ulterioară.

## Doar TEXT, fără PDF

Notificarea conține NUMAI text — nu se atașează PDF-ul raportului. Intenționat:
un val de rapoarte grele ar putea umfla grupul sau provoca OOM la worker.
Arhiva PDF se trage la cerere (vezi `06-export-excel-pdf.md`).

Conținutul mesajului (`_build_caption`):

- nume complet, telefon, email, `@username` Telegram,
- numele testului,
- scor `%` + zona de risc (`Risc scăzut/moderat/ridicat/critic`),
- data completării.

## Configurare (env, NU în cod)

| Variabilă | Rol |
|-----------|-----|
| `SALES_BOT_TOKEN` | tokenul botului notificator (placeholder: `123456:ABC...`) |
| `SALES_CHAT_ID` | id-ul grupului de vânzări (negativ, ex. `-1001234567890`) |

`_configured()` verifică prezența ambelor. **Dacă lipsesc → notificarea se sare
în tăcere** (log la nivel info), NU dă eroare.

> Atenție: dacă env-ul e greșit/lipsă, totul „pare că nu merge" deși aplicația
> nu raportează nicio eroare. Verifică întâi aceste două variabile.
