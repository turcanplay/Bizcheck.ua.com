---
name: bizcheck-telegram-bot
description: Work on the Telegram surfaces of webdev — the client bot in webdev/tgbot and the internal sales-group bot in webdev/groupbot. Use when editing bot handlers/commands, the deep-link token flow, email/lead capture in Telegram, or the backend /tg/* endpoints they call.
---

# BizCheck — Telegram Bots

**Read first:** `documentation/telegram-bot.md` (+ `documentation/telegram/`). Backend side:
`documentation/backend/01-routes.md` (`telegram.py`, `tg_group.py`, `tg_admin.py`, `tg_feedback.py`).

## Three surfaces (don't mix them up)
- `webdev/tgbot/` — the **client** bot (`python-telegram-bot` 21.x, long polling). Delivers the report to
  users who tapped "send to Telegram" on the site. Package: `config.py` (env/logging/secret headers),
  `strings.py` (`_STRINGS` + `_t`), `backend.py` (async httpx calls), `helpers.py` (score/zone formatting),
  `handlers.py` (update handlers), `bot.py` (wiring + entry point).
- `webdev/groupbot/bot.py` — the **internal sales-group** bot: `/register`, `/unregister`, `/excel`,
  `/client`, `/pdf`, `/help`. Env `SALES_BOT_TOKEN`, `SALES_CHAT_ID` (optional), `ADMIN_PANEL_URL`.
  Authorization fails closed: `SALES_CHAT_ID` wins when set, else the chat bound via `/register`;
  nothing set and nothing registered → deny.
- `backend/services/sales_notify.py` — the **backend** posting lead notifications into that group.
  Same token as `groupbot`, send-only (no `getUpdates`, so no polling conflict).

## Flow (client bot)
Site mints a 24h deep-link token via `POST /tg/link/{sub_id}` → `t.me/<bot>?start=<token>` →
user presses START → bot calls `GET /tg/report/{token}` → delivers PDF + score.

## Endpoints the bots call (under `/api_crowe_bizcheck/tg/`)
- Client, token-gated: `GET /report/{token}` (report+pdf_b64), `POST /report/{token}/failed`,
  `POST /contact/{token}`, `POST /email/{token}` (200 sent / 404 expired / 409 PDF generating),
  `POST /lead/{token}`.
- Group/admin, `X-Bot-Secret`-gated: `/tg/group/*` (register/unregister/registered),
  `/tg/exports/*` (tests, excel, submissions, pdf), `/tg/feedback/*`.

## Invariants that bite
- Tokens are 24h, owner-gated at issuance; treat 404 as "expired/invalid" with a retry message.
- All bot copy is bilingual **uk / en** in `tgbot/strings.py` (`_STRINGS`), Ukrainian is the fallback;
  `pick_lang()` maps Telegram's `language_code`. Zone emojis (`helpers.py`): 🟢≥80 🟡70–79 🟠65–69 🔴<65.
- `X-Bot-Secret` gating fails **closed**: an unset `BOT_SHARED_SECRET` disables the group/export/feedback
  endpoints (403) — it never opens them. Don't "relax for local dev".
- Config from env: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `BACKEND_URL`
  (internal `http://backend:4001`), `BOT_SHARED_SECRET`, `SITE_NAME`, `CONTACT_EMAIL`.
- Backend `/tg/*` write endpoints sanitize input and may call `maybe_notify_sales` — keep that idempotent.

## Recipe — add a bot interaction
1. Add the handler in `tgbot/handlers.py` and wire it in `tgbot/bot.py` (group commands go in
   `groupbot/bot.py`).
2. If it needs new server data, add a `/tg/<thing>/{token}` endpoint in `backend/routes/telegram.py`
   (token-validated) — or a secret-gated one in `tg_group.py` / `tg_admin.py` / `tg_feedback.py`.
   Sanitize inputs, return JSON.
3. Add **uk + en** strings to `_STRINGS` in `tgbot/strings.py`.
4. Cover it in `webdev/tgbot/tests/` (or `webdev/groupbot/tests/`).

## Don'ts
- Don't hardcode the bot username/token; read env.
- Don't trust the token without backend validation, and keep contact/lead writes idempotent.
- Don't add `ro`/`ru` strings — the bots ship uk + en only.
