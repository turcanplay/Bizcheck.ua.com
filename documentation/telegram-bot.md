# Telegram Bot (web flow)

`webdev/tgbot/bot.py` — the Telegram bot for the **web** flow. Separate from the sales-team
notification bot (`backend/services/sales_notify.py`) and from the legacy standalone bot at repo root.

## Stack
- `python-telegram-bot` 21.7 (official Bot API wrapper, **not** aiogram), `httpx`, `python-dotenv`.
- **Long polling** (no webhook): `drop_pending_updates=True`, poll interval ~1.5 s, timeout 30 s.

## Env (`tgbot/.env.example`)
```
TELEGRAM_BOT_TOKEN=...           # from @BotFather
TELEGRAM_BOT_USERNAME=...        # bot name without @, used to build deep-links
BACKEND_URL=http://backend:4001  # internal Docker service URL
```

## Flow
1. On the website (CtaPage), user picks "send report to Telegram" → frontend calls
   `POST /api_crowe_bizcheck/tg/link/{sub_id}` → backend mints a **24h deep-link token** and returns
   `t.me/<bot>?start=<token>`.
2. User opens the link and presses START → bot receives `/start <token>`.
3. Bot calls the backend, receives the report + PDF, and delivers it in chat.

## Handlers
- **`/start`** — with a token → deliver the report; without → bilingual welcome.
- **Email button** (`on_email_button`) → ask for email → validate → `POST /tg/email/{token}`.
- **Lead button** (`on_lead_button`) → ask email then phone → `POST /tg/lead/{token}`.
- **Contact share** (`on_contact`) — one-tap phone button → `POST /tg/lead/{token}` (phone only).
- **Text handler** (`on_text`) — routes free text into the active flow (email/lead/phone).

## Backend endpoints it calls (under `/api_crowe_bizcheck/tg/`)
| Call | Purpose | Notable statuses |
|---|---|---|
| `GET /tg/report/{token}` | Fetch report JSON + base64 PDF (`first_name, last_name, total_score, block_scores_json, pdf_b64, language`) | 404 expired |
| `POST /tg/contact/{token}` | Save Telegram contact (`tg_chat_id, tg_username, tg_first_name, tg_last_name`) | — |
| `POST /tg/email/{token}` | Deliver report by email (`{email}`) | 200 sent · 404 expired · 409 PDF still generating |
| `POST /tg/lead/{token}` | Save sales lead (`{email, phone}` or `{phone}`) | 200 · 404 expired |

(Backend side of these endpoints: [`backend/01-routes.md`](backend/01-routes.md) → `telegram.py`.)

## Bilingual & zones
- ~90 strings in `_STRINGS` (RO/RU; RO fallback). Risk emojis: 🟢 ≥80, 🟡 70–79, 🟠 65–69, 🔴 <65.

## Deploy
- `tgbot/Dockerfile`: `python:3.12-slim`, `pip install -r requirements.txt`, `CMD python bot.py`.
- Runs as the `tgbot` compose service, internal network only (see [`deployment.md`](deployment.md)).
