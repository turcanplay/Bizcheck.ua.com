# 03 — Botul de grup (`groupbot/`)

Fișier: `webdev/groupbot/bot.py`. Bibliotecă: **python-telegram-bot 21.7**, mod
**polling** pe `SALES_BOT_TOKEN`. Rolul: oferă echipei, la cerere, exporturile Excel și
PDF direct în grupul intern.

## De ce este un proces SEPARAT

Notificările automate „test finalizat" sunt trimise de **backend**
(`services/sales_notify.py`) — vezi 04. Acelea NU trec prin acest bot.

`groupbot` este partea **interactivă**: ascultă comenzi (`getUpdates`) și răspunde. Backend-ul
folosește același `SALES_BOT_TOKEN` doar ca să **trimită**, deci nu există conflict de
polling (vezi 01, regula „un singur poller per token"). Separarea ține logica
interactivă (cozi, callback-uri, fișiere mari) în afara procesului web.

## Unde trăiește

În **grupul echipei** — un grup de tip **forum (cu topicuri)**. Botul:

- Răspunde DOAR în chat-ul din `SALES_CHAT_ID` (`_allowed`); comenzile din alte chat-uri
  sunt ignorate. Dacă `SALES_CHAT_ID` e gol (dev), nu se blochează, dar datele rămân
  protejate de secretul backend.
- Trimite fișierul **în același topic** din care a venit comanda, prin
  `message_thread_id`.

## Comanda `/excel` (cu perioadă)

1. Cere lista testelor: `GET /tg/exports/tests` → butoane `xls:<id>`.
2. La alegerea testului → afișează **meniul de perioadă** (butoane `xp:<id>:<period>`):
   Azi / Ultimele 7 zile / Ultimele 30 zile / Luna curentă / Tot.
3. La alegerea perioadei → `GET /tg/exports/excel/<id>?period=<period>` → trimite
   `.xlsx`-ul filtrat în topic. Perioada ține fișierul mic — nu mai e niciodată „prea mare".

## Comanda `/client` (o singură persoană)

1. Alegi testul (`cl:<id>`) → `GET /tg/exports/submissions/<id>` (max 20, recente).
2. Vezi butoane „Nume Prenume / @user" (`clp:<sub_id>`); poți **scrie un nume** ca să
   cauți (handlerul de text → `?q=<text>`).
3. La alegere → `GET /tg/exports/pdf/<sub_id>` → DOAR PDF-ul acelei persoane
   (denumire cu datele de contact). 404 → „fără PDF".

## Comanda `/pdf` (doar link)

Arhiva PDF în masă **nu se mai trimite prin Telegram** (risc de OOM). `/pdf` răspunde
cu un link spre **panoul admin** (`ADMIN_PANEL_URL`), de unde se descarcă tot.

## Restricții și limite

- **50 MB**: guard `_MAX_UPLOAD` (~49 MB); peste → cere restrângerea perioadei /
  descărcarea din panoul admin.
- Timeout generos (180s) la export.

## Endpoint-uri backend (gated pe secret)

Toate sub `http://backend:4001/api_crowe_bizcheck/tg/exports/`, cu header
`X-Bot-Secret: <BOT_SHARED_SECRET>`:

| Rută | Rol |
|------|-----|
| `GET tests` | lista testelor (id + nume) |
| `GET excel/<id>?period=…` | Excel filtrat pe perioadă |
| `GET submissions/<id>?q=…` | listă persoane pentru `/client` |
| `GET pdf/<sub_id>` | PDF-ul unei persoane |

Secretul (`BOT_SHARED_SECRET`) trebuie identic pe `groupbot` și `backend`;
altfel exporturile sunt respinse.

## Robustețe

- `AIORateLimiter` pentru limitele de flood.
- `error_handler` tratează `Conflict` (alt poller pe `SALES_BOT_TOKEN`) și erorile de
  rețea tranzitorii.
- `run_polling(drop_pending_updates=True)` la pornire.
