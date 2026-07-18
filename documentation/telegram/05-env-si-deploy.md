# 05 — Variabile de mediu & deploy

## Cuprins

- [Variabile de mediu](#variabile-de-mediu)
- [Deploy pentru `/register`](#deploy-pentru-register)
- [Verificare după deploy](#verificare-după-deploy)

---

## Variabile de mediu

Token-urile **nu se pun în documentație și nu intră în git** — se setează în `.env` pe server.

| Variabilă | Serviciu | Rol |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | `backend` + `tgbot` | Botul de raport. Partajat intenționat: backend-ul doar *trimite* (feedback), `tgbot` doar face *polling* → fără conflict pe `getUpdates`. |
| `TELEGRAM_BOT_USERNAME` | `backend` | Construiește deep-link-urile. `tgbot` **nu** îl citește. |
| `SALES_BOT_TOKEN` | `backend` + `groupbot` | Botul de notificare/grup. Aceeași logică de partajare. |
| `SALES_CHAT_ID` | `backend` + `groupbot` | **Lasă-l gol** ca `/register` să conteze. Setat = buton de urgență: fixează grupul din config și nu poate fi suprascris din Telegram. |
| `SALES_TOPIC_ID` | `backend` | **Lasă-l gol** — altfel toate testele intră într-un singur topic, în loc de topic-per-test. |
| `BOT_SHARED_SECRET` | `backend` + `tgbot` + `groupbot` | Gate pentru `/tg/feedback/*`, `/tg/exports/*` și `/tg/group/*`. **Livrat gol — obligatoriu de setat, altfel `/register` și feedback-ul dau 403.** |
| `FEEDBACK_SCHEDULER` | `backend` | Bucla care trimite întrebările de feedback scadente. `1` (default) = on, `0` = off. |
| `PUBLIC_BASE_URL` | `backend` | Baza link-urilor din notificări/emailuri. De setat pe `.ua.com`. |
| `ADMIN_PANEL_URL` | `groupbot` | Link spre panoul admin din răspunsurile botului. |
| `BACKEND_URL` | `tgbot`, `groupbot` | `http://backend:4001` intern. |

> Dacă un token a fost trimis pe un canal nesigur (chat, screenshot, commit), **regenerează-l**
> din @BotFather înainte de deploy.

## Deploy pentru `/register`

În `.env` pe server:

```
SALES_BOT_TOKEN=<tokenul botului de notificare>
BOT_SHARED_SECRET=<generat: python -c "import secrets; print(secrets.token_urlsafe(32))">
SALES_CHAT_ID=          # GOL — altfel are prioritate peste /register
SALES_TOPIC_ID=         # GOL — altfel nu se mai creează topic per test
PUBLIC_BASE_URL=https://bizcheck.ua.com
ADMIN_PANEL_URL=https://bizcheck.ua.com/admin_bizcheck_md_crowe/
```

Rebuild: **backend + groupbot** (`tgbot` și frontend-ul nu sunt afectate de această schimbare).

Apoi, în grup:

1. Botul trebuie să fie admin cu dreptul **„Manage Topics"** — altfel nu poate crea topicuri și
   totul cade pe General.
2. Grupul trebuie să aibă **Topics activate** (să fie forum).
3. Proprietarul grupului dă `/register`.

## Verificare după deploy

- Completează un test pe site → notificarea trebuie să apară într-un topic nou, denumit după test.
  Al doilea test completat trebuie să intre în **același** topic.
- Deschide un link de raport **expirat** → clientul vede eroarea, iar în grup trebuie să apară
  alerta ⚠️ de eșec livrare (vezi [`04-alerta-esec-livrare.md`](04-alerta-esec-livrare.md)).
- Dacă `/register` răspunde „BOT_SHARED_SECRET не налаштований" → secretul nu e setat pe server.

> **Atenție la deploy (regresie fail-open rezolvată):** fără `BOT_SHARED_SECRET` setat, fluxul de
> feedback și `/register`/exporturile dau **403** (fail-closed) în loc să fie deschise. Setează
> secretul înainte, altfel aceste funcții par „stricate".
