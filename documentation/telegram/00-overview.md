# 00 — Prezentare generală a suprafețelor Telegram

## Cuprins

- [Cele trei suprafețe](#cele-trei-suprafețe)
- [Cine cheamă pe cine](#cine-cheamă-pe-cine)
- [Diagrama fluxului](#diagrama-fluxului)
- [De ce doi boți, două token-uri](#de-ce-doi-boți-două-token-uri)
- [Interfața și profilul botului user](#interfața-și-profilul-botului-user)

---

## Cele trei suprafețe

`webdev/` are **trei** componente Telegram, nu una:

| # | Componentă | Unde trăiește | Token | Rol |
|---|---|---|---|---|
| 1 | **Bot user (raport)** | `webdev/tgbot/` (serviciu polling) | `TELEGRAM_BOT_TOKEN` | Trimite raportul PDF clientului în chat + colectează email/telefon |
| 2 | **Notificare vânzări** | `webdev/backend/services/sales_notify.py` | `SALES_BOT_TOKEN` | Postează leadul nou într-un grup privat al echipei |
| 3 | **Bot grup (echipă)** | `webdev/groupbot/` (serviciu polling) | `SALES_BOT_TOKEN` (același) | `/register`, exporturi PII la cerere (`/excel`, `/pdf`, `/client`) |

> #2 și #3 folosesc **același token** (`SALES_BOT_TOKEN`), dar fără conflict pe
> `getUpdates`: backend-ul (#2) doar *trimite* mesaje, `groupbot` (#3) doar face
> *polling*. Doar un proces poate face polling pe un token — de aceea trimiterea
> notificărilor stă în backend, nu în groupbot.

## Cine cheamă pe cine

- **Botul user** vorbește doar cu backend-ul, prin endpoint-urile `/api_crowe_bizcheck/tg/*`
  (client `httpx` în `webdev/tgbot/backend.py`). Nu atinge DB-ul direct. Raportul se cere prin
  **POST**, cu `X-Bot-Secret` și `X-Telegram-Chat-ID`; primul acces leagă atomic tokenul
  de chatul privat. Contactul, emailul și leadul cer același chat. Fără secret → 403.
- **Notificarea de vânzări** e o funcție de serviciu în backend, chemată din 3 căi de scriere
  (PATCH web, `/tg/contact`, `/tg/lead`) — vezi [`02-notificare-vanzari.md`](02-notificare-vanzari.md).
- **Botul de grup** vorbește cu backend-ul prin `/api_crowe_bizcheck/tg/group/*` și
  `/api_crowe_bizcheck/tg/exports/*`, gated cu `X-Bot-Secret`.

## Diagrama fluxului

```
                          SITE (React SPA)
                               │  POST /tg/link/{sub_id}
                               ▼
                          ┌──────────┐
                          │ BACKEND  │  (Flask, :4001 intern)
                          └──────────┘
                          ▲    │    ▲
    POST /tg/report/{tok} │    │    │ maybe_notify_sales()  ┌───────────────┐
     POST /tg/contact     │    │    └──────────────────────►│ sales_notify  │──┐
     POST /tg/email       │    │                            │ (worker cozat)│  │ sendMessage
     POST /tg/lead        │    │ POST /tg/group/*           └───────────────┘  │
     POST /tg/report/     │    │ GET  /tg/exports/*                            ▼
        {tok}/failed      │    │  (X-Bot-Secret)                        ┌──────────────┐
                          │    ▼                                        │ GRUP VÂNZĂRI │
                    ┌───────────┐        ┌────────────┐  polling        │  (forum TG)  │
                    │  tgbot    │        │  groupbot  │◄────────────────└──────────────┘
                    │ (polling) │        │ (polling)  │  /register /excel /pdf /client
                    └───────────┘        └────────────┘
                          ▲
                   START │ /start <token>
                    ┌──────────┐
                    │  CLIENT  │
                    └──────────┘
```

## De ce doi boți, două token-uri

- **Botul user** e public — orice client care completează testul îl deschide. Token separat.
- **Botul de vânzări/grup** e intern — trăiește într-un grup privat al echipei și servește
  PII (exporturi Excel, PDF-uri). Token separat, endpoint-uri fail-closed cu secret partajat.

Amestecarea lor ar expune exporturile PII pe același bot public — de aceea sunt strict separate.

## Interfața și profilul botului user

Botul user folosește exclusiv ucraineana (`uk` / UA). Site-ul rămâne `uk`/`en`, iar PDF-ul
păstrează limba generării. Numele, descrierile, comenzile și marca/contactul sunt în
`webdev/tgbot/bot_profile.py`, mesajele în `strings.py`, avatarul în `assets/profile.jpg`.
Nu există editor admin, comandă de bot sau override env pentru acest profil.

`ProfileGuard` restabilește profilul la startup, apoi cu pauze de 120 s între cicluri;
verificarea completă a localizărilor se repetă la 6 ore. Telegram/BotFather nu permite
un profil absolut imuabil: proprietarul sau deținătorul tokenului poate modifica starea
externă; gardul o repară când rulează și API-ul răspunde. Întrebările de feedback/quiz
rămân conținut editabil separat, intenționat. Detalii: [botul user](01-bot-user.md).

Backend-ul și `tgbot` trebuie livrate împreună pentru protocolul POST + secret + chat.
Modificările din 2026-11-12 au fost verificate local; deploy-ul nu a fost executat.
