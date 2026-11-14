# 01 — Botul user (raport)

**Serviciu:** `webdev/tgbot/`, container `tgbot`.
**Stack:** `python-telegram-bot` 21.7, long polling, fără webhook.
**Interfață:** exclusiv ucraineană (`uk`, afișată ca UA); site-ul și PDF-urile rămân `uk`/`en`.

## Layout-ul pachetului

| Fișier | Responsabilitate |
|---|---|
| `bot.py` | Entry point, meniu, handlers, polling și pornirea/oprirea gardului de profil. |
| `bot_profile.py` | Sursa numelui, descrierii, descrierii scurte, comenzilor, mărcii, contactului și intervalelor de verificare. |
| `assets/profile.jpg` | Avatarul copiat din profilul public de referință MD. |
| `profile_guard.py` | Verifică și restabilește profilul Telegram din surse. |
| `config.py` | Tokenuri, username verificat și URL intern din env, logging, antete și validarea emailului/telefonului; importă marca/contactul din cod. |
| `strings.py` | Toate mesajele și butoanele botului în ucraineană; `_t()` și `pick_lang()` păstrează UI `uk` indiferent de client sau raport. |
| `backend.py` | Client async `httpx`, secret partajat, identitate privată și retry limitat la erori tranzitorii. |
| `helpers.py` | Zonă de risc și procentaj afișat, compatibile cu pragurile backend-ului. |
| `handlers.py` | Livrare raport, email, lead, telefon și răspunsuri la feedback. |

## Fluxul complet

1. Clientul alege trimiterea în Telegram pe site. `POST /api_crowe_bizcheck/tg/link/{sub_id}`
   cere proprietarul submisiei sau admin și întoarce `{token, url, pdf_ready}`. Tokenul nou are
   32 de octeți aleatori, format URL-safe, TTL 24h; un token încă valid este refolosit.
2. START ajunge ca `/start <token>` într-o conversație **privată**. Botul verifică tipul
   chatului, egalitatea `chat.id == user.id` și formatul tokenului. Prefixul `fb_` deschide feedback-ul.
3. Botul cheamă **`POST /tg/report/<token>`**, fără body, cu `X-Bot-Secret` și
   `X-Telegram-Chat-ID` pozitiv. Backend-ul leagă atomic tokenul de primul chat și returnează
   numele decriptat, scorul, blocurile, pragurile de risc și PDF-ul base64. Un alt chat nu poate
   folosi același token; același chat poate reîncerca până la expirare.
4. Botul trimite sumarul în ucraineană și PDF-ul ca document `BizCheck_{first}_{last}.pdf`.
   Fișierul păstrează **limba în care a fost generat pe site**; botul nu retraduce PDF-ul.
   Pentru titluri de bloc preferă `title_uk` când există, altfel păstrează titlul primit.
5. `POST /tg/contact/<token>` salvează identitatea Telegram. Identitatea din JSON trebuie să
   coincidă cu antetul verificat; backend-ul poate notifica vânzările și programa feedback.
6. Botul oferă partajarea telefonului și acțiunile email/lead. Toate cererile de raport
   folosesc același secret și aceeași identitate privată legată de token.

PDF-ul în Telegram este atașament. Calea email trimite un link de descărcare protejat de token.
Datele și linkurile returnate prin `/tg/*` au `Cache-Control: no-store`.

## Comenzi și fluxuri inline

- `/start` livrează raportul sau afișează instrucțiunile; `/help` afișează ajutorul și contactul.
- Email: email valid → `POST /tg/email/{token}`; `200` trimis, `409` PDF în lucru,
  `403`/`404` afișate ca link indisponibil/expirat.
- Lead: email, apoi telefon → `POST /tg/lead/{token}`.
- Telefon one-tap: botul acceptă `Contact` numai dacă `contact.user_id` este userul curent;
  contactele altor persoane sau fără identitate verificabilă nu sunt salvate.
- Fluxurile stau în `context.user_data`. Pornirea altui link curăță fluxul anterior;
  `_start_flow()` păstrează contextul separat `ctok`/`clng` pentru partajarea telefonului.
- Comenzile, callback-urile, contactele și feedback-ul sunt ignorate în grupuri/canale.

## Profil, descrieri și logo controlate din cod

`bot_profile.py`, `strings.py` și `assets/profile.jpg` sunt sursele de adevăr. Aplicația nu
are comandă Telegram, câmp admin, valoare DB sau override env pentru editarea profilului,
mesajelor ori mărcii. Modificarea lor necesită editarea surselor și redeploy.

Înainte de orice modificare publică, startup-ul verifică username-ul real al tokenului
față de `TELEGRAM_BOT_USERNAME` și refuză botul MD `CROWE_BIZCHECK_bot`. Astfel, o
configurație UA greșită nu aplică accidental profilul peste referința MD.

Gardul pornește odată cu botul: repară fallback-ul public, localizările `uk`/`en`, meniul,
webhook-ul incompatibil cu polling-ul, drepturile admin implicite și avatarul. Repetă
verificarea după fiecare ciclu cu pauză de **120 s**; o verificare completă a localizărilor
pornește la startup și apoi la **6 ore**. Eșecurile sunt reluate, fără blocarea livrării rapoartelor.
Intervalul nu reprezintă o garanție de restaurare în 120 s când Telegram este indisponibil.

**Limita platformei:** Telegram nu oferă blocare absolută a profilului. Proprietarul BotFather
sau cine deține tokenul poate modifica profilul în afara aplicației; gardul repară diferențele
cât timp botul rulează și are acces la API. Aceasta este restaurare periodică, nu control de acces.

Numele rămâne `BIZCHECK`. Marca/descrierile folosesc `Bizcheck.com.ua` și text ucrainean.
Avatarul păstrează fișierul din [profilul public MD](https://t.me/CROWE_BIZCHECK_bot),
verificat la 2026-11-12 (nume public `BIZCHECK`); SHA-256:
`31bec85d3ddb5bcac799769024082306b5f43e09604dd92ae0b19755d405f86a`.
Contactul confirmat de proprietar este `office@crowe-tm.md`, definit în cod în
`bot_profile.py` și folosit în descrieri, ajutor și mesajele botului.

## Feedback

Deep-link-ul `fb_<token>` cheamă `/tg/feedback/open` cu secret și `lang=uk`; backend-ul trimite
întrebarea. Textul următor merge la `/tg/feedback/reply`; pe match, botul afișează confirmarea
ucraineană din `strings.py`, nu un text de confirmare configurabil din răspunsul backend.

**Conținutul întrebărilor de feedback rămâne editabil intenționat** prin fluxul admin existent,
la fel ca întrebările quiz-ului. Acesta este conținut de business separat de numele, descrierile,
logo-ul și textele fixe ale botului; nu reprezintă o cale de editare a profilului.

## Endpoint-urile backend chemate

Prefix: `/api_crowe_bizcheck/tg/`. Gate-ul de secret este fail-closed.

| Apel | Autorizare | Rol / statusuri |
|---|---|---|
| `POST /link/{sub_id}` | owner/admin | Token 24h; `503` dacă lipsește username-ul botului. |
| `POST /report/{token}` | secret + chat privat; claim atomic | JSON + PDF; `404` expirat, necunoscut sau legat de alt chat. |
| `POST /contact/{token}` | secret + chat legat de token | Identitate Telegram; `400` dacă JSON declară alt chat. |
| `POST /email/{token}` | secret + chat legat de token | Email; `409` PDF în lucru. |
| `POST /lead/{token}` | secret + chat legat de token | Email/telefon. |
| `POST /report/{token}/failed` | secret + chat; token nelegat sau legat aceluiași chat | Alertă; după gate, `200` identic pentru token cunoscut/necunoscut. |
| `POST /feedback/open` | secret; chat în payload | Deschide întrebarea de feedback. |
| `POST /feedback/reply` | secret; chat în payload | Salvează răspunsul; `{matched, ack}`. |

Secret absent/greșit → `403`. Antet de chat absent/invalid pe rutele raportului → `400`.
Vechiul `GET /report` nu mai este compatibil; backend-ul și `tgbot` se actualizează împreună.

## Zone de risc și loguri

Pragurile vin din `tests.scoring_zones`; fallback: 🟢 ≥80, 🟡 ≥70, 🟠 ≥65, 🔴 sub 65.
Procentajul afișat are prag minim 1%, fără a schimba zona scorului real.

Numele/titlurile sunt curățate de caractere Markdown, inclusiv backslash. La respingerea
formatării, sumarul cade pe text simplu pentru a permite trimiterea PDF-ului. Logurile de
retry și handlers folosesc tipul excepției, fără URL-ul/tokenul raportului sau PII.
