# 01 — Botul user (raport)

**Serviciu:** `webdev/tgbot/` (container `tgbot` în `webdev/docker-compose.yml:82`).
**Stack:** `python-telegram-bot` 21.7, long polling (fără webhook).
**Token:** `TELEGRAM_BOT_TOKEN`.

## Cuprins

- [Layout-ul pachetului](#layout-ul-pachetului)
- [Fluxul complet](#fluxul-complet)
- [Handler-ele](#handler-ele)
- [Fluxurile inline (email / lead / telefon)](#fluxurile-inline-email--lead--telefon)
- [Feedback](#feedback)
- [Endpoint-urile backend chemate](#endpoint-urile-backend-chemate)
- [Bilingv & zone de risc](#bilingv--zone-de-risc)

---

## Layout-ul pachetului

Graful de import e uni-direcțional — `bot → handlers → {backend, helpers, strings, config}` — fără cicluri.

| Fișier | Responsabilitate |
|---|---|
| `bot.py` | Entry point: construiește `Application`, cablează handler-ele, `error_handler`, `run_polling`. |
| `config.py` | Env (`BACKEND_URL`, `TELEGRAM_BOT_TOKEN`, `BOT_SHARED_SECRET`), logging, `bot_headers()`, `EMAIL_RE`/`PHONE_RE`. |
| `strings.py` | `_STRINGS` (copy UK/EN) + `_t()` translator. |
| `backend.py` | Client async `httpx` — o funcție per apel backend `/tg/*` (întoarce `Response` brut; caller-ul ramifică pe status). |
| `helpers.py` | `_zone()` — formatarea scorului în zonă de risc. |
| `handlers.py` | Toate handler-ele de update Telegram. |

## Fluxul complet

De la site până la PDF în chat:

1. Pe site, clientul alege „trimite raportul în Telegram" → frontend-ul cheamă
   `POST /api_crowe_bizcheck/tg/link/{sub_id}` (`routes/telegram.py:52`, gated de
   `@submission_owner_or_admin`). Backend-ul emite un **token deep-link cu TTL de 24h**
   (`telegram.py:23`) și întoarce `t.me/<bot>?start=<token>`. Dacă mai există un token
   valid, îl **refolosește** în loc să-l suprascrie (`telegram.py:74-82`).
2. Clientul apasă START → botul primește `/start <token>` (`handlers.py:31`).
   Prefixul `fb_` rutează spre fluxul de feedback; orice altceva e token de raport.
3. Botul cheamă `GET /tg/report/<token>`, primește numele (decriptat Fernet), scorul,
   scorurile pe blocuri și **PDF-ul în base64** (`handlers.py:103`).
4. Trimite în chat: sumar text (scor + zonă de risc 🟢🟡🟠🔴) și **PDF-ul ca document**,
   cu numele `BizCheck_{first}_{last}.pdf`.
5. Salvează identitatea Telegram prin `POST /tg/contact/<token>`.
6. Oferă buton de **one-tap phone share** (`request_contact=True`) și butoane inline
   pentru email / lead.

> PDF-ul se trimite ca **atașament**, nu ca link. Excepție: calea prin email
> (`POST /tg/email/<token>`) trimite un **link de download token-gated**, fără atașament.

## Handler-ele

Cablate în `bot.py`:

- **`/start`** (`cmd_start`, `handlers.py:31`) — cu token → livrează raportul; fără token →
  mesaj de welcome. Fără token limba nu e cunoscută, deci welcome-ul cade pe **ucraineană**.
- **Buton email** (`on_email_button`, `:247`) → cere email → validează → `POST /tg/email/{token}`.
- **Buton lead** (`on_lead_button`, `:258`) → cere email apoi telefon → `POST /tg/lead/{token}`.
- **Share contact** (`on_contact`, `:269`) — butonul one-tap de telefon → `POST /tg/lead/{token}` (doar telefon).
- **Handler text** (`on_text`, `:301`) — rutează textul liber în fluxul activ (email/lead), sau îl
  tratează ca răspuns la o întrebare de feedback.
- **Alertă eșec livrare** (`_alert_delivery_failed`, `:89`) — vezi [`04-alerta-esec-livrare.md`](04-alerta-esec-livrare.md).

## Fluxurile inline (email / lead / telefon)

Starea fluxului trăiește în `context.user_data`, armată de `_start_flow` (`handlers.py`).
Cheile `ctok`/`clng` (token + limbă pentru share-ul de telefon) sunt **păstrate** peste
`clear()`, ca butonul `request_contact` să funcționeze chiar și în mijlocul unui flux email/lead.

- **email** — un singur pas: email → `POST /tg/email/{token}`. Statusuri: `200` trimis,
  `409` PDF încă se generează, `404` expirat.
- **lead** — doi pași: email, apoi telefon → `POST /tg/lead/{token}` cu `{email, phone}`.
- **telefon (one-tap)** — Telegram livrează un obiect `Contact` → `POST /tg/lead/{token}` cu doar `{phone}`.

## Feedback

Fluxul de feedback (întrebarea trimisă de admin unei persoane în Telegram):

- Deep-link `t.me/<bot>?start=fb_<token>` → `_feedback_open` → `POST /tg/feedback/open`
  (backend-ul trimite el întrebarea, botul nu spune nimic la succes).
- Primul mesaj text al persoanei → `_maybe_capture_feedback` → `POST /tg/feedback/reply`;
  pe match, botul relayează un thank-you.

Apelurile de feedback trimit header-ul `X-Bot-Secret` (`config.bot_headers()`); apelurile
token-gated de raport/contact/email/lead **nu**.

## Endpoint-urile backend chemate

Sub `/api_crowe_bizcheck/tg/` (rate limit 20/min). Detalii backend în [`../backend/01-routes.md`](../backend/01-routes.md).

| Apel | Auth | Ce face | Statusuri notabile |
|---|---|---|---|
| `POST /link/{sub_id}` | owner sau admin | Emite tokenul deep-link (24h) | 404 submisie inexistentă |
| `GET /report/{token}` | doar token | Raport JSON + `pdf_b64` | 404 expirat |
| `POST /contact/{token}` | doar token | Salvează chat-ul; declanșează notificarea de vânzări + feedback auto | 404 expirat |
| `POST /email/{token}` | doar token | Trimite raportul pe email | 200 · 404 expirat · 409 PDF în lucru |
| `POST /lead/{token}` | doar token | Salvează email/telefon; declanșează notificarea | 200 · 404 expirat |
| `POST /report/{token}/failed` | doar token existent | Alertă echipei la eșec de livrare — vezi [`04`](04-alerta-esec-livrare.md) | mereu 200 |
| `POST /feedback/open` | `X-Bot-Secret` | Leagă chatul de un token de feedback (`fb_<token>`) | 403 fără secret |
| `POST /feedback/reply` | `X-Bot-Secret` | Răspuns liber la o întrebare deschisă | `{matched, ack}` |

## Bilingv & zone de risc

- Copy-ul din `_STRINGS` e **UK/EN** (`_t(lang, cheie, **kw)`), cu fallback pe UK.
- Zone de risc (emoji): 🟢 ≥80 · 🟡 70–79 · 🟠 65–69 · 🔴 <65 (`helpers._zone`).
