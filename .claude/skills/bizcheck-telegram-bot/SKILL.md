---
name: bizcheck-telegram-bot
description: Work on the web-flow Telegram bot in webdev/tgbot. Use when editing bot.py handlers/commands, the deep-link token flow, email/lead capture in Telegram, or the backend /tg/* endpoints it calls.
---

# BizCheck — Telegram Bot (web flow)

**Read first:** `documentation/telegram-bot.md`. Backend side: `documentation/backend/01-routes.md`
(`telegram.py`, prefix `/tg`).

## What this is (and isn't)
- `webdev/tgbot/bot.py` — the **web-flow** bot (`python-telegram-bot` 21.x, long polling). Delivers the
  report to users who tapped "send to Telegram" on the site.
- NOT the sales-team notifier (`backend/services/sales_notify.py`) and NOT the legacy standalone bot at repo root.

## Flow
Site mints a 24h deep-link token via `POST /tg/link/{sub_id}` → `t.me/<bot>?start=<token>` →
user presses START → bot calls `GET /tg/report/{token}` → delivers PDF + score.

## Endpoints the bot calls (under `/api_crowe_bizcheck/tg/`)
`GET /tg/report/{token}` (report+pdf_b64), `POST /tg/contact/{token}`, `POST /tg/email/{token}`
(200 sent / 404 expired / 409 PDF generating), `POST /tg/lead/{token}` (email+phone or phone).

## Invariants that bite
- Tokens are 24h, owner-gated at issuance; treat 404 as "expired/invalid" with a retry message.
- All bot copy is bilingual (`_STRINGS`, ro/ru, ro fallback). Zone emojis: 🟢≥80 🟡70–79 🟠65–69 🔴<65.
- Config from env: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `BACKEND_URL` (internal `http://backend:4001`).
- Backend `/tg/*` write endpoints sanitize input and may call `maybe_notify_sales` — keep that idempotent.

## Recipe — add a bot interaction
1. Add a handler in `tgbot/bot.py` (follow the existing email/lead/contact handlers).
2. If it needs new server data, add a `/tg/<thing>/{token}` endpoint in `backend/routes/telegram.py`
   (token-validated), sanitize inputs, return JSON.
3. Add ro+ru strings to `_STRINGS`.

## Don'ts
- Don't hardcode the bot username/token; read env.
- Don't trust the token without backend validation, and keep contact/lead writes idempotent.
