# 01 — Arhitectura generală

## Două codebase-uri paralele

Repo-ul conține două aplicații independente, care NU împart cod:

- `src/` — botul Telegram standalone (proiect separat, nu este subiectul acestor docs).
- `webdev/` — aplicația web publică: **Flask** (backend) + **React/Vite** (SPA) + **nginx**
  + doi boți Telegram. Aceasta este aplicația de la https://bizcheck.ua.com și este ce
  documentăm aici.

## Două identități de bot (două tokenuri)

| Token | Bot | Pentru cine |
|-------|-----|-------------|
| `TELEGRAM_BOT_TOKEN` | `@CROWE_BIZCHECK_bot` | **Clienți** — livrează rapoartele |
| `SALES_BOT_TOKEN` | `@Bizcheck_md_bot` | **Echipa** — grupul intern de vânzări |

## Trei procese

1. **`tgbot`** (`webdev/tgbot/bot.py`) — face **polling** (`getUpdates`) pe
   `TELEGRAM_BOT_TOKEN`. Vorbește cu clienții: livrează PDF-ul, colectează email/telefon.
2. **`backend`** (`webdev/backend/services/sales_notify.py`) — folosește `SALES_BOT_TOKEN`
   **doar ca să TRIMITĂ** notificări (`sendMessage`). NU face polling.
3. **`groupbot`** (`webdev/groupbot/bot.py`) — face **polling** pe `SALES_BOT_TOKEN`.
   Servește comenzile `/excel` și `/pdf` în grupul echipei.

## Regula cheie: un singur poller per token

Telegram permite ca **un singur proces** să facă `getUpdates` pe un token la un moment
dat (altfel apare eroarea `Conflict`). De aceea:

- `SALES_BOT_TOKEN` este împărțit de `backend` și `groupbot`, dar **backend-ul doar
  trimite** mesaje (nu cere update-uri), iar **groupbot-ul este singurul care face
  polling**. Rezultat: zero conflict, deși împart același token.
- `TELEGRAM_BOT_TOKEN` este folosit la polling DOAR de `tgbot` (backend-ul îl folosește
  punctual doar pentru a trimite întrebarea de feedback — vezi 04/07).

## Rețea

Backend-ul (`backend:4001`) **NU este expus public** — în `docker-compose.yml` are doar
`expose:`, nu `ports:`. nginx este singurul proxy în față. Boții cheamă backend-ul
**intern**, prin rețeaua Docker, la `http://backend:4001`.

## Diagramă

```
                  Telegram API
        ┌──────────────┴───────────────┐
        │                              │
 TELEGRAM_BOT_TOKEN              SALES_BOT_TOKEN
 (@CROWE_BIZCHECK_bot)          (@Bizcheck_md_bot)
        │                       ┌──────┴───────┐
   polling                   trimite        polling
        │                   (sendMessage)      │
   ┌────┴────┐                   │         ┌───┴─────┐
   │  tgbot  │                   │         │ groupbot│
   │ (client)│                   │         │ (echipă)│
   └────┬────┘              ┌────┴─────────┴────┐
        │                   │     backend       │
        └───────────────────►  backend:4001     │
          http://backend:4001  (Flask, intern)  │
                            └────────┬──────────┘
                                     │
                                  Postgres (db)
```

Doar **nginx** este expus în exterior; tot traficul boților rămâne în rețeaua internă
Docker.
