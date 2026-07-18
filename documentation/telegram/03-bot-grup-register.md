# 03 — Botul de grup & `/register`

**Serviciu:** `webdev/groupbot/` (container `groupbot` în `webdev/docker-compose.yml:96`).
**Token:** `SALES_BOT_TOKEN` (același ca notificarea, dar groupbot face *polling*, backend-ul doar *trimite*).

Botul intern al echipei, într-un grup privat. Servește comenzi de management (`/register`) și
exporturi PII la cerere (`/excel`, `/pdf`, `/client`).

## Cuprins

- [Comenzile](#comenzile)
- [`/register` — cum funcționează](#register--cum-funcționează)
- [Endpoint-urile backend](#endpoint-urile-backend)
- [Precedența SALES_CHAT_ID ↔ /register](#precedența-sales_chat_id--register)
- [Decizii de securitate](#decizii-de-securitate)

---

## Comenzile

Cablate în `groupbot/bot.py`:

| Comandă | Ce face |
|---|---|
| `/register` | Leagă grupul curent ca țintă a notificărilor (doar proprietarul grupului) |
| `/unregister` | Desface legătura (notificările cad înapoi pe env) |
| `/excel` | Export Excel multi-sheet per test, cu selector de perioadă |
| `/pdf` | PDF-ul unei submisii (arhiva completă; bulk se ia din panoul admin) |
| `/client` | Căutare client + PDF-ul lui |

Exporturile (`/excel`, `/pdf`, `/client`) servesc **PII**, deci endpoint-urile backend din
spatele lor sunt fail-closed cu `X-Bot-Secret` (vezi mai jos).

## `/register` — cum funcționează

Înainte, chatul țintă era hardcodat prin `SALES_CHAT_ID` în `.env`, cu redeploy la fiecare
schimbare. Acum grupul se înregistrează singur. **Fără tabel nou și fără migrație** — se
refolosește key/value store-ul `site_settings` (cheile `sales_chat_id`, `sales_chat_title`,
`sales_chat_registered_by`).

Fluxul:

1. Proprietarul grupului dă `/register` în grup.
2. `groupbot` verifică prin `get_chat_member` că cel care a dat comanda are
   `status == "creator"` — **strict proprietarul**, un simplu administrator nu e suficient.
   Orice eroare la verificare → refuz (**fail-closed**).
3. Botul trimite `chat.id` + `chat.title` + cine a înregistrat la
   `POST /api_crowe_bizcheck/tg/group/register`.
4. `sales_notify._sales_chat_id()` citește de acum ținta din `site_settings`.

`/unregister` face inversul. Ambele sunt gated pe proprietar, **nu** pe `_allowed()` — altfel
n-ar putea fi date niciodată într-un grup neînregistrat.

## Endpoint-urile backend

Toate cer `X-Bot-Secret` și sunt **fail-closed**: fără `BOT_SHARED_SECRET` pe server → 403,
niciodată deschise.

**Grup** (`routes/tg_group.py`, 20/min):

| Rută | Body | Răspuns |
|---|---|---|
| `POST /tg/group/register` | `{chat_id, title, registered_by}` | `{ok, chat_id}` · 400 dacă `chat_id` nu e întreg |
| `POST /tg/group/unregister` | — | `{ok}` |
| `GET /tg/group/registered` | — | `{chat_id, title}` |

`title` și `registered_by` trec prin `clean_optional` — un titlu de grup e text controlat de
atacator (oricine își poate numi grupul cum vrea) și e re-emis mai departe.

**Exporturi** (`routes/tg_admin.py`, 10/min):

| Rută | Ce face |
|---|---|
| `GET /tg/exports/tests` | Listă `{id, name}` pentru selectorul de test |
| `GET /tg/exports/excel/{test_id}` | Excel combinat pentru un test (`?period=today\|7d\|30d\|month\|all`) |
| `GET /tg/exports/submissions/{test_id}` | Listă submisii pentru selector (`?q=`) |
| `GET /tg/exports/pdf/{submission_id}` | PDF-ul unei submisii (413 dacă > 49 MB → link spre admin) |

## Precedența SALES_CHAT_ID ↔ /register

**`SALES_CHAT_ID` are prioritate peste `/register`** (`sales_notify._sales_chat_id`, `:57`).
Cine poate edita `.env` pe server e o autoritate mai mare decât proprietarul unui grup Telegram.
Env-ul funcționează ca **buton de urgență**: fixează lead-urile într-un grup cunoscut și **nu
poate fi suprascris din Telegram** — util dacă cineva a dat `/register` greșit sau ostil.

> Ca `/register` să conteze, lasă `SALES_CHAT_ID` **gol**. Vezi [`05-env-si-deploy.md`](05-env-si-deploy.md).

## Decizii de securitate

- **Un singur chat**, nu mai multe: `site_settings` ține o singură cheie; un `/register` nou îl
  înlocuiește pe precedentul.
- **`/register` NU salvează `message_thread_id`.** Dacă l-ar salva, toate notificările s-ar fixa
  în topicul în care a fost dată comanda și s-ar pierde topicul-per-test.
- **`_allowed()` din groupbot e fail-closed.** Înainte, cu `SALES_CHAT_ID` nesetat, returna
  `True` — adică *orice* grup putea rula `/excel` și `/client`, care servesc PII. Acum, fără env
  și fără înregistrare → refuz. Lookup-ul e cache-uit ~60s (`time.monotonic()`), invalidat imediat
  după `/register`.
