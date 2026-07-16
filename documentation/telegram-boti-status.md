# Cei doi boți Telegram — ce e făcut și ce mai trebuie făcut

Documentul acoperă **cele două suprafețe Telegram** cerute:

1. **Botul de raport** — trimite raportul PDF clientului în Telegram.
2. **Botul de notificare** — anunță echipa, într-un chat de grup, când apare un client nou.

Ambii **există deja în cod și funcționează**. Documentul de față descrie starea reală
și lista de lucruri rămase. Pentru arhitectura botului de raport vezi și
[`telegram-bot.md`](telegram-bot.md); pentru endpoint-uri, [`backend/01-routes.md`](backend/01-routes.md).

---

## 1. Botul de raport (client)

**Serviciu:** `webdev/tgbot/` (container `tgbot` în `webdev/docker-compose.yml:79-89`).
**Stack:** `python-telegram-bot` 21.7, long polling (fără webhook).
**Token:** `TELEGRAM_BOT_TOKEN`.

### Ce e făcut

Fluxul complet, de la site până la PDF în chat, e implementat:

1. Pe site, clientul alege „trimite raportul în Telegram" → frontend-ul cheamă
   `POST /api_crowe_bizcheck/tg/link/{sub_id}` (`routes/telegram.py:50`, gated de
   `@submission_owner_or_admin`). Backend-ul emite un **token deep-link cu TTL de 24h**
   (`telegram.py:23`) și întoarce `t.me/<bot>?start=<token>`. Dacă mai există un token
   valid, îl refolosește în loc să-l suprascrie (`telegram.py:72-83`).
2. Clientul apasă START → botul primește `/start <token>` (`handlers.py:31-50`).
   Prefixul `fb_` rutează spre fluxul de feedback; orice altceva e token de raport.
3. Botul cheamă `GET /tg/report/<token>`, primește numele (decriptat Fernet), scorul,
   scorurile pe blocuri și **PDF-ul în base64**.
4. Trimite în chat: sumar text (scor + zonă de risc 🟢🟡🟠🔴) și **PDF-ul ca document**,
   cu numele `BizCheck_{first}_{last}.pdf` (`handlers.py:136-144`).
5. Salvează identitatea Telegram prin `POST /tg/contact/<token>` (`handlers.py:154-159`).
6. Oferă buton de **one-tap phone share** (`request_contact=True`) și butoane inline
   pentru email / lead.

> PDF-ul se trimite ca **atașament**, nu ca link. Excepție: calea prin email
> (`POST /tg/email/<token>`) trimite un **link de download token-gated**, fără atașament.

### Endpoint-uri backend (`/api_crowe_bizcheck/tg/`, rate limit 20/min)

| Rută | Auth | Ce face |
|---|---|---|
| `POST /link/<sub_id>` | owner sau admin | Emite tokenul de deep-link (24h) |
| `GET /report/<token>` | doar token | Raport + `pdf_b64` |
| `POST /contact/<token>` | doar token | Salvează chat-ul; declanșează notificarea de vânzări |
| `POST /email/<token>` | doar token | Trimite raportul pe email (409 dacă PDF-ul nu e gata) |
| `POST /lead/<token>` | doar token | Salvează email/telefon; declanșează notificarea |

---

## 2. Botul de notificare (echipă)

**Serviciu:** `webdev/backend/services/sales_notify.py` (443 linii) + containerul `groupbot`.
**Token:** `SALES_BOT_TOKEN`. **Chat țintă:** `SALES_CHAT_ID`.

### Ce e făcut

Este **complet cablat**, nu e cod mort. `maybe_notify_sales(submission_id)` (`:398`) e chemat
din trei locuri, toate în `try/except` ca o eroare de notificare să nu strice salvarea clientului:

- `routes/submissions.py:165` — flux web (PATCH)
- `routes/telegram.py:203` — după `/tg/contact`
- `routes/telegram.py:301` — după `/tg/lead`

Detalii de implementare care merită știute:

- **Un singur thread daemon** golește o `queue.Queue(maxsize=2000)` (`:356-381`) — evită
  intenționat un thread per submission.
- **Trimite o singură dată**: `Submission.claim_sales_notification` (`:430`). Cine pierde
  claim-ul face `editMessageText` pe mesajul existent în loc să dubleze (`:435-442`).
  Dacă trimiterea eșuează, claim-ul se eliberează și o scriere ulterioară reîncearcă.
- **Gating** (`:421-424`): notifică doar dacă există nume **și** un canal de contact.
- **Topicuri de forum** create automat per test, cache-uite în `tests.tg_topic_id`, cu
  fallback pe General dacă forumul e dezactivat.
- **Fără PDF atașat** — intenționat (`:9-11`); PDF-urile le servește `groupbot` la cerere
  prin `/tg/exports/*`.

---

## 3. `/register` — implementat

Înainte, chat-ul țintă era hardcodat prin `SALES_CHAT_ID` în `.env`, cu redeploy la fiecare
schimbare. Acum grupul se înregistrează singur.

**Nu a fost nevoie de tabel nou** — se refolosește key/value store-ul `site_settings`
(care există deja), cu cheile `sales_chat_id`, `sales_chat_title`, `sales_chat_registered_by`.
Deci **nicio migrație**.

### Fluxul

1. Proprietarul grupului dă `/register` în grup.
2. `groupbot` verifică prin `get_chat_member` că cel care a dat comanda are
   `status == "creator"` — **strict proprietarul**, un simplu administrator nu e suficient.
   Orice eroare la verificare → refuz (fail-closed).
3. Botul trimite `chat.id` + `chat.title` + cine a înregistrat la
   `POST /api_crowe_bizcheck/tg/group/register`.
4. `sales_notify._sales_chat_id()` citește de acum ținta din `site_settings`.

`/unregister` face inversul. Ambele sunt gated pe proprietar, **nu** pe `_allowed()` —
altfel n-ar putea fi date niciodată într-un grup neînregistrat.

### Endpoint-uri noi (`routes/tg_group.py`, 20/min)

Toate cer `X-Bot-Secret` și sunt **fail-closed**: fără `BOT_SHARED_SECRET` pe server → 403,
niciodată deschise. Modelul e copiat din `tg_admin.py`, nu din `tg_feedback.py`.

| Rută | Body | Răspuns |
|---|---|---|
| `POST /tg/group/register` | `{chat_id, title, registered_by}` | `{ok, chat_id}` · 400 dacă `chat_id` nu e întreg |
| `POST /tg/group/unregister` | — | `{ok}` |
| `GET /tg/group/registered` | — | `{chat_id, title}` |

`title` și `registered_by` trec prin `clean_optional` — un titlu de grup e text controlat
de atacator (oricine își poate numi grupul cum vrea) și e re-emis mai departe.

### Decizii luate

- **Un singur chat**, nu mai multe: `site_settings` ține o singură cheie, iar un `/register`
  nou îl înlocuiește pe precedentul.
- **`SALES_CHAT_ID` are prioritate peste `/register`.** Cine poate edita `.env` pe server e o
  autoritate mai mare decât proprietarul unui grup de Telegram. Env-ul funcționează deci ca
  buton de urgență: fixează lead-urile într-un grup cunoscut și **nu poate fi suprascris din
  Telegram** — util dacă cineva a dat `/register` greșit sau ostil. Ca `/register` să conteze,
  lasă `SALES_CHAT_ID` **gol**.
- **`/register` NU salvează `message_thread_id`.** Dacă l-ar salva, toate notificările s-ar
  fixa în topicul în care a fost dată comanda și s-ar pierde topicul-per-test.
- **`_allowed()` din groupbot e acum fail-closed.** Înainte, cu `SALES_CHAT_ID` nesetat,
  returna `True` — adică *orice* grup putea rula `/excel` și `/client`, care servesc PII.
  Acum, fără env și fără înregistrare → refuz. Lookup-ul e cache-uit ~60s (`time.monotonic()`),
  invalidat imediat după `/register`.

### Teste

Toate rulează **fără DB, fără server și fără să atingă Telegram real**.

| Suită | Ce acoperă | Cum o rulezi |
|---|---|---|
| `backend/tests/test_unit_tg_group.py` | Poarta de secret (inclusiv „secret nesetat pe server"), `chat_id` invalid, sanitizarea titlului, precedența env ↔ `/register` | `cd webdev/backend && venv/bin/python -m pytest tests/ -q` |
| `backend/tests/test_unit_tg_feedback_auth.py` | Regresia fail-open pe `/tg/feedback/*` | idem |
| `backend/tests/test_unit_sales_flow.py` | Lanțul complet cu un API Telegram fals: `/register` → topic per test → trimitere → refolosire topic → dedup → editare | idem |
| `groupbot/tests/test_register.py` | Gating pe proprietar, `_allowed()` fail-closed, cache-ul TTL | `cd webdev/groupbot && venv/bin/python -m pytest -v` |
| `frontend/src/components/report/CallToAction.test.tsx` | `pdf_ready`, căile de eroare, absența username-ului hardcodat | `cd webdev/frontend && PATH=/usr/local/bin:$PATH npm run test:run` |

> Frontend-ul nu avea deloc test runner — a fost adăugat Vitest + Testing Library.
> `groupbot` are venv propriu, fiindcă venv-ul backend-ului n-are `telegram`/`httpx`.

**Testele au fost validate prin mutații**, nu doar rulate: codul a fost stricat intenționat
(fail-open readus, administrator acceptat ca proprietar, cache de topic ignorat, precedență
inversată ș.a.) și de fiecare dată testele au picat. Deci prind regresiile real.

---

## Ce mai trebuie făcut

### A. Restanțe din migrarea în ucraineană

Din [`ukrainian-language-migration.md`](ukrainian-language-migration.md) — **în backend nu a
rămas nimic**; tot ce cerea migrarea e implementat și testat. Deschise sunt doar:

1. **Coperțile PDF lipsă** — `preview_uk.pdf` și `outro_uk.pdf` în `webdev/frontend/public/pdf/`.
   Până sunt puse, rapoartele UK folosesc coperțile `*_en.pdf`. (Bonus: `preview_ro.pdf` și
   `outro_ro.pdf` au rămas acolo nefolosite.)
2. **Conținutul quiz-ului din Postgres** (blocuri/întrebări/răspunsuri) — netradus,
   descopat intenționat.
3. **Migrațiile n-au rulat niciodată pe Postgres-ul de producție** — primul boot pe server
   e proba reală.
4. **Comentarii care documentează greșit limbile**: `submissions.py:85` zice `uk/ru`,
   `submissions.py:113` zice `ro/ru`, `tg_feedback.py:19-20` zice `{ro, ru}` — codul face
   peste tot `("uk", "en")`. Nu e bug, dar induce în eroare.

### B. Probleme găsite în cod — toate rezolvate

| # | Problemă | Cum a fost rezolvată |
|---|---|---|
| 1 | **Auth fail-open** pe `/tg/feedback/*`: cu `BOT_SHARED_SECRET` gol, oricine putea posta `/feedback/reply` cu un `chat_id` ghicit. | Acum fail-closed, ca `/tg/exports/*` și `/tg/group/*`. **Atenție la deploy:** fără secret setat, fluxul de feedback dă 403 în loc să fie deschis. |
| 2 | `tg_exports_bp` fără rate limit, deși servește export Excel cu PII. | `10/min`. |
| 3 | Default-uri `bizcheck.md` într-un deploy `.ua.com`. | Migrate peste tot: backend, groupbot, frontend (canonical, **hreflang**, og, JSON-LD, sitemap, robots.txt) și CSP-ul din nginx. `dist/` nu mai conține nicio urmă. |
| 4 | **Username de bot hardcodat în frontend** (`t.me/CROWE_BIZCHECK_bot`). | **Eliminat**, nu făcut configurabil: fără token de deep-link botul nu putea identifica userul, deci fallback-ul nu recupera nimic. Calea de eroare arată acum o eroare. |
| 5 | `pdf_ready` calculat dar ignorat de frontend. | Cablat: dacă PDF-ul nu e gata, userul e reținut cu un mesaj, nu trimis la un bot care i-ar zice să aștepte. |
| 6 | `_feedback_open` ignora răspunsul — un 502 lăsa userul fără niciun mesaj. | Verifică statusul și răspunde cu o eroare (cheie nouă în `strings.py`, UK+EN). |
| 7 | `FEEDBACK_SCHEDULER` citit din env dar nedeclarat nicăieri. | Documentat în `.env.example` + `docker-compose.yml`. |
| 8 | Comentarii care documentau **greșit** whitelist-ul de limbi (`ro/ru` vs realitatea `uk/en`). | Corectate. |
| 9 | `_bar()` cod mort în `tgbot/helpers.py`. | Șters. |

### C. Bug-uri descoperite *de teste* (nu erau în lista inițială)

Astea au ieșit la iveală abia când testele au forțat codul pe căi reale:

| Bug | De ce conta | Rezolvare |
|---|---|---|
| **Precedența era inversă** față de documentație: codul citea DB-ul înaintea env-ului. | `SALES_CHAT_ID` arăta ca buton de urgență, dar nu făcea nimic — un operator care voia să forțeze lead-urile înapoi într-un grup bun după un `/register` ostil ar fi fost ignorat în tăcere. | Env câștigă acum. |
| **Topic șters în grup** → `tests.tg_topic_id` rămânea mort. | Fiecare lead ulterior pentru acel test irosea un apel condamnat, la nesfârșit. | Id-ul se curăță la fallback; următorul lead creează topic nou. |
| **`sendMessage` fără `message_id`** → nici salvat, nici eliberat. | `sales_notified` rămânea `TRUE` fără `sales_msg_id`, deci actualizările ulterioare de contact nu mai ajungeau niciodată în grup. | Claim-ul se păstrează (fără dublare) + warning în log. |
| **`window.open` după `await`** în `CallToAction.tsx`. | Activarea de la click e deja consumată → Safari/Firefox blochează popup-ul. Eșec silențios: userul apasă, nu se întâmplă nimic, și nici eroare nu vede. | Trecut pe `window.location.href`, ca în `CtaPage.tsx`. |

---

## Variabile de mediu

Token-urile **nu se pun în acest fișier și nu intră în git** — se setează în `.env` pe server.

| Variabilă | Serviciu | Rol |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | `backend` + `tgbot` | Botul de raport. Partajat intenționat: backend-ul doar *trimite*, `tgbot` doar face *polling* → fără conflict pe `getUpdates`. |
| `TELEGRAM_BOT_USERNAME` | `backend` | Construiește deep-link-urile. `tgbot` **nu** îl citește. |
| `SALES_BOT_TOKEN` | `backend` + `groupbot` | Botul de notificare. Aceeași logică de partajare. |
| `SALES_CHAT_ID` | `backend` + `groupbot` | **Lasă-l gol** ca `/register` să conteze. Setat = buton de urgență: fixează grupul din config și nu poate fi suprascris din Telegram. |
| `SALES_TOPIC_ID` | `backend` | **Lasă-l gol** — altfel toate testele intră într-un singur topic, în loc de topic-per-test. |
| `BOT_SHARED_SECRET` | `backend` + `tgbot` + `groupbot` | Gate pentru `/tg/feedback/*`, `/tg/exports/*` și `/tg/group/*`. **Livrat gol — obligatoriu de setat, altfel `/register` dă 403.** |
| `PUBLIC_BASE_URL` | `backend` | Baza link-urilor din notificări. De setat pe `.ua.com`. |
| `ADMIN_PANEL_URL` | `backend` | Link spre panoul admin din notificări. |
| `BACKEND_URL` | `tgbot`, `groupbot` | `http://backend:4001` intern. |

> Dacă un token a fost trimis pe un canal nesigur (chat, screenshot, commit), regenerează-l
> din @BotFather înainte de deploy.

---

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

1. Botul trebuie să fie admin cu dreptul **„Manage Topics"** — altfel nu poate crea topicuri
   și totul cade pe General.
2. Grupul trebuie să aibă **Topics activate** (să fie forum).
3. Proprietarul grupului dă `/register`.

Verificare: completează un test pe site → notificarea trebuie să apară într-un topic nou,
denumit după test. Al doilea test completat trebuie să intre în **același** topic.

Dacă `/register` răspunde „BOT_SHARED_SECRET не налаштований" → secretul nu e setat pe server.

## Ce a rămas deschis

1. **Coperțile PDF** `preview_uk.pdf` + `outro_uk.pdf` — au nevoie de assets de la design.
   Până atunci, rapoartele UK folosesc coperțile `*_en.pdf`.
2. **Conținutul quiz-ului** din Postgres — netradus, descopat intenționat.
3. **Migrațiile pe Postgres-ul de producție** — primul boot pe server e proba reală.
4. **Identitatea SMTP** (`office@bizcheck.md` în `SMTP_USER` / `SMTP_REPLY_TO` și în textele
   botului) — **lăsată intenționat neatinsă.** Nu e o eroare de cod: e o cutie poștală reală
   cu SPF/DKIM/DMARC-ul ei. Mutată pe `.ua.com` înainte ca mailbox-ul și DNS-ul să existe
   acolo, emailurile cu rapoarte se opresc sau intră în spam. De schimbat din config, când
   adresa nouă e pregătită.
5. **Numele de brand `Bizcheck.md`** (cu majusculă) în titluri, `og:site_name` și traduceri —
   e branding, nu URL. Un `<title>` care zice `Bizcheck.md` pe domeniul `bizcheck.ua.com` e
   o decizie de marketing, nu de cod.
