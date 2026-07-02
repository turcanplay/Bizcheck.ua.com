# Documentație tehnică — Subsistemul Telegram (BizCheck `webdev/`)

Această documentație acoperă tot ce ține de **Telegram** în aplicația web BizCheck
(`webdev/`): cei **doi boți**, **notificările** automate către echipă, **exporturile**
Excel/PDF, **endpoint-urile backend** care îi deservesc, **baza de date**, aspectele de
**securitate** și **deploy**-ul.

> Atenție: documentația se referă DOAR la codebase-ul `webdev/` (aplicația web de la
> https://bizcheck.md). Botul standalone din `src/` este un proiect separat și NU este
> documentat aici.

## Cuprins

| # | Fișier | Subiect |
|---|--------|---------|
| 01 | [01-arhitectura-generala.md](01-arhitectura-generala.md) | Imaginea de ansamblu: 3 procese, 2 tokenuri, backend |
| 02 | [02-bot-client.md](02-bot-client.md) | Botul pentru clienți (`tgbot/`) — livrare rapoarte |
| 03 | [03-bot-grup.md](03-bot-grup.md) | Botul de grup (`groupbot/`) — comenzile `/excel` și `/pdf` |
| 04 | [04-notificari-vanzari.md](04-notificari-vanzari.md) | Notificările automate către echipă (`services/sales_notify.py`) |
| 05 | [05-export-excel.md](05-export-excel.md) | Generarea și structura exportului Excel |
| 06 | [06-export-pdf.md](06-export-pdf.md) | Generarea PDF-urilor și arhiva ZIP |
| 07 | [07-backend-endpoints-tg.md](07-backend-endpoints-tg.md) | Toate rutele `/api_crowe_bizcheck/tg/*` |
| 08 | [08-baza-de-date.md](08-baza-de-date.md) | Tabele și coloane relevante pentru Telegram |
| 09 | [09-securitate-tokenuri.md](09-securitate-tokenuri.md) | Tokenuri, `X-Bot-Secret`, gating |
| 10 | [10-deploy-docker.md](10-deploy-docker.md) | Servicii Docker Compose și deploy |
| 11 | [11-variabile-mediu.md](11-variabile-mediu.md) | Variabilele de mediu necesare |
| 12 | [12-depanare.md](12-depanare.md) | Probleme frecvente și soluții |

## Dacă vrei X → citește fișierul Y

| Vrei să... | Citește |
|------------|---------|
| înțelegi cum se leagă toate piesele | 01 |
| afli cum ajunge raportul la client în Telegram | 02 |
| descarci Excel/PDF din grupul echipei | 03 |
| afli de ce echipa primește o notificare la fiecare test | 04 |
| modifici conținutul exportului Excel | 05 |
| modifici PDF-ul / arhiva ZIP | 06 |
| adaugi sau modifici o rută backend pentru boți | 07 |
| știi unde se salvează contactele Telegram | 08 |
| înțelegi de ce backend-ul și groupbot-ul împart un token | 09, 01 |
| pornești/oprești serviciile pe server | 10 |
| configurezi un bot nou (tokenuri, chat id) | 11 |
| depanezi un conflict `getUpdates` sau notificări lipsă | 12 |
