# 05 — Variabile de mediu & deploy

## Cuprins

- [Variabile de mediu](#variabile-de-mediu)
- [Deploy pentru `/register`](#deploy-pentru-register)
- [Verificare după deploy](#verificare-după-deploy)
- [Migrarea botului user UA](#migrarea-botului-user-ua--2026-11-12)

---

## Variabile de mediu

Token-urile **nu se pun în documentație și nu intră în git** — se setează în `.env` pe server.

| Variabilă | Serviciu | Rol |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | `backend` + `tgbot` | Botul de raport. Partajat intenționat: backend-ul doar *trimite* (feedback), `tgbot` doar face *polling* → fără conflict pe `getUpdates`. |
| `TELEGRAM_BOT_USERNAME` | `backend` + `tgbot` | Construiește deep-link-urile; botul verifică la startup că username-ul real al tokenului coincide cu această valoare. Username-ul MD `CROWE_BIZCHECK_bot` este refuzat înainte de modificarea profilului UA. |
| `SALES_BOT_TOKEN` | `backend` + `groupbot` | Botul de notificare/grup. Aceeași logică de partajare. |
| `SALES_CHAT_ID` | `backend` + `groupbot` | **Lasă-l gol** ca `/register` să conteze. Setat = buton de urgență: fixează grupul din config și nu poate fi suprascris din Telegram. |
| `SALES_TOPIC_ID` | `backend` | **Lasă-l gol** — altfel toate testele intră într-un singur topic, în loc de topic-per-test. |
| `BOT_SHARED_SECRET` | `backend` + `tgbot` + `groupbot` | Obligatoriu, aceeași valoare nevidă. Gate fail-closed pentru raport/contact/email/lead/failed, feedback, exporturi și grup. `tgbot` refuză pornirea fără secret; backend-ul răspunde 403 fără secret valid. |
| `FEEDBACK_SCHEDULER` | `backend` | Bucla care trimite întrebările de feedback scadente. `1` (default) = on, `0` = off. |
| `PUBLIC_BASE_URL` | `backend` | Baza link-urilor din notificări/emailuri. De setat pe `.com.ua`. |
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
PUBLIC_BASE_URL=https://bizcheck.com.ua
ADMIN_PANEL_URL=https://bizcheck.com.ua/admin_bizcheck_md_crowe/
```

Pentru simpla înregistrare a grupului sunt relevante backend + groupbot. **Pentru migrarea
actuală a botului user trebuie actualizate simultan backend + tgbot**, conform secțiunii următoare.

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

> Fără `BOT_SHARED_SECRET` valid, toate endpoint-urile bot-only sunt fail-closed (403),
> inclusiv livrarea rapoartelor; `tgbot` nu pornește fără secret. Nu elimina gate-ul la depanare.

## Migrarea botului user UA — 2026-11-12

Actualizează **backend + tgbot în aceeași fereastră**, inclusiv migrarea idempotentă pentru
`submissions.tg_token_chat_id`. Protocolul nou este `POST /tg/report/<token>` și cere
`X-Bot-Secret` + `X-Telegram-Chat-ID`; botul vechi cu GET nu este compatibil cu backend-ul nou.
Frontend-ul continuă să emită linkul prin ruta owner/admin și nu trimite antetele botului.

În configurația serverului sunt necesare:

```dotenv
TELEGRAM_BOT_TOKEN=<tokenul botului UA, distinct de MD și de SALES_BOT_TOKEN>
TELEGRAM_BOT_USERNAME=<username-ul real al botului UA>
BOT_SHARED_SECRET=<secret aleator nevid, identic în backend/tgbot/groupbot>
BACKEND_URL=http://backend:4001
PUBLIC_BASE_URL=https://bizcheck.com.ua
```

Verificarea username-ului precede orice schimbare de profil: un token pentru alt bot sau
username-ul de referință MD sunt refuzate, pentru a nu aplica accidental profilul UA pe MD.
Nu rula două procese de polling cu același token. Gardul elimină un webhook incompatibil
cu polling-ul și păstrează actualizările în așteptare.

Profilul, marca, contactul și mesajele nu se configurează din `.env`: editează
`webdev/tgbot/bot_profile.py`, `strings.py` și `assets/profile.jpg`, apoi reconstruiește botul.
Gardul pornește odată cu serviciul, verifică profilul cu pauze de 120 s și repetă verificarea
completă a localizărilor la 6 ore. Telegram nu oferă blocare absolută; BotFather sau tokenul
pot modifica profilul extern, pe care serviciul încearcă apoi să-l restabilească.

După deploy, verifică într-un chat privat de test: meniu/descrieri ucraineană, avatar MD,
raport PDF, refuzul aceluiași link din alt chat, email și contact propriu. Nu testa rapoarte
reale în grupuri. PDF-ul păstrează limba aleasă pe site; întrebările feedback rămân conținut
admin editabil distinct de profilul fix. Contactul funcțional rămâne `office@bizcheck.md`.

**Starea acestei livrări:** implementarea și testele sunt locale. Deploy-ul nu a fost executat;
workspace-ul nu conține `.env` cu acreditările botului UA, deci profilul public UA și livrarea
reală nu au fost verificate. Nu introduce secrete în documentație sau loguri.
