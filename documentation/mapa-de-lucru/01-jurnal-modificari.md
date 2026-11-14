# Jurnal de modificări

Cronologic, cel mai recent sus. Fiecare intrare spune ce s-a schimbat, **de ce era greșit**
și cu ce verificare s-a închis.

---

## 2026-11-13 — Raportul PDF actualizat și exemplu UA verificat

Raportul final folosește acum contactul și limba curente, inclusiv după editarea
numelui sau schimbarea limbii pe pagina de livrare. Data are locale explicit
`uk-UA` / `en-GB`. Un singur worker serializează generarea și uploadul PDF;
rezultatele unei versiuni depășite nu mai marchează raportul actual drept gata,
iar livrarea așteaptă versiunea actuală. Formula de calcul a scorurilor nu s-a schimbat.

Graficele din raport afișează direct valorile finale, fără animație în timpul
capturii. Etichetele lungi de risc se încadrează pe mai multe rânduri, fără
suprapunere peste explicații. **307 teste frontend**, TypeScript și verificarea
independentă a celor 14 fișiere au trecut.

A fost generat prin componentele și generatorul PDF reale un exemplu cu date
publice ale chestionarului și răspunsuri simulate: **16 pagini A4, ucraineană,
scor 71%**, contact `office@crowe-tm.md`. Toate paginile au trecut verificarea
vizuală. Fișier: `output/pdf/Bizcheck-UA-exemplu-raport.pdf`, SHA256
`9e5281e0063081a3cdc667f82fb202f774a62db2d4ab8246c783f6608e318a63`.
Nu s-au creat submisii reale și nu s-au trimis emailuri sau mesaje.
Paginile dense păstrează mecanismul existent de încadrare pe o pagină A4 și
pot necesita zoom pentru citire confortabilă.

Deployul **doar pentru frontend** s-a încheiat cu succes la **08:56:45 EET /
06:56:45 UTC**. Cele cinci verificări HTTP locale/publice au răspuns 200,
frontendul este healthy fără restarturi; backendul, botul și baza de date au
păstrat aceleași containere și imagini healthy. Nu a fost necesar rollback.
Backup: `/root/BIZCHECK_COM_UA/webdev/backups/report-20261113T065445Z`.
Receipt: `/home/secadmin/bizcheck-ua-report-fix-20261113/production-result.json`.

---

## 2026-11-13 — Adresa publică de contact corectată în producție

Proprietarul a confirmat `office@crowe-tm.md`. Adresa a fost actualizată în
profilul și mesajele botului, contactul site-ului, subsolurile/PDF-urile generate
ulterior, șabloanele email și antetul Reply-To. În mediul de producție au fost
schimbate numai `EMAIL_REPLY_TO` și `SMTP_REPLY_TO`; contul, parola și identitatea
de expediere SMTP au fost păstrate.

Deploy-ul stackului `bizcheckua` s-a încheiat cu exit 0 la **08:24:33 EET /
06:24:33 UTC**. Verificările live au confirmat noua adresă în descrierile botului,
welcome/help, bundle-ul frontend și mesajele email construite în memorie
(HTML, text și Reply-To). Vechea adresă nu mai apare în bundle-ul frontend.
Nu s-au trimis emailuri sau mesaje de test și nu s-au regenerat PDF-uri istorice.
Toate cele patru servicii sunt healthy, fără restarturi în intervalul observat.

Verificări locale: **1018 teste backend**, **173 teste bot**, **26 teste frontend**
pentru CallToAction, TypeScript și **168 verificări de configurare** trecute.
Backupul surselor și al configurației este în
`/root/BIZCHECK_COM_UA/webdev/backups/contact-20261113-56b2864f`;
confirmarea verificărilor este în
`/home/secadmin/bizcheck-ua-contact-20261113/production-result.json`.

---

## 2026-11-12 — Deploy Telegram UA verificat în producție

Deploy-ul autorizat s-a încheiat cu **exit 0**, la **23:22:50 EET / 21:22:50 UTC**,
în `/root/BIZCHECK_COM_UA`, proiect Compose `bizcheckua`, frontend pe loopback `5175`.
Botul UA verificat este **`@Bizcheck_CROWE_bot`**, ID public `8847966580`;
botul moldovenesc de referință nu a fost ținta actualizării.

Au fost livrate cele **40 de fișiere** ale manifestului
`/private/tmp/bizcheck-ua-release-20261112/manifest.json`, pornind de la commitul
`57ac44a658123fe73fcfcbdd01e02421fe99f003`. Hashurile fișierelor au corespuns
manifestului înainte de upload. SHA256 pentru `release-files.tar.gz`:
`6301003d657187bb7e042a10952044759f2f8e727edca9be5c08b06b1e4d4bd0`.
Manifestul este snapshotul pachetului pregătit; această intrare de verificare
a fost adăugată ulterior deploy-ului.

Verificări în producție: **5/5 bridge**, coloana `tg_token_chat_id` prezentă,
plus un apel autentificat cu nonce inexistent care a parcurs SQL-ul și a întors
**404 + no-store**, fără rânduri client modificate. **32 verificări ale profilului
live** au trecut; sweep-ul complet al guardului pentru **185 de limbi** s-a
încheiat fără eșecuri de profil, conflicte de polling sau erori netratate.
Toate cele patru servicii erau healthy, cu zero restarturi în intervalul observat.
Avatarul live descărcat a fost verificat vizual: același logo auriu MD,
re-encodat de Telegram ca imagine pătrată de 640px.

Configurația proxy-ului extern UA a trecut testul și reload-ul. **9/9 verificări
publice** au trecut: `/`, `/uk/`, `/healthz`, `/api_crowe_bizcheck/health` cu DB up,
`/robots.txt`, `/sitemap.xml`, refuzul **403 + no-store** fără secret și mascarea
nonce-ului în ambele access-loguri nginx (proxy extern și frontend).
Nu au fost create sau modificate rapoarte/contacte/emailuri de client și nu s-au
trimis mesaje către clienți pentru verificare. Livrarea efectivă a unui PDF de
client și concurența între revendicări reale rămân netestate.

Materialul de rollback este în
`/root/BIZCHECK_COM_UA/webdev/backups/telegram-ua-20261112T211738Z`, iar dumpul DB
pre-deploy în
`/root/BIZCHECK_COM_UA/webdev/backups/predeploy-bizzcheck-20261112-211847.sql.gz`.
Verificarea integrității gzip a dumpului a trecut; receipt-ul local este
`/private/tmp/bizcheck-ua-release-20261112/production-result.json`.
Migrarea adaugă o coloană nullable, compatibilă cu imaginile anterioare.
Rollbackul imaginilor nu restabilește automat profilul/webhook-ul Telegram;
nu a fost necesar rollback sau restore DB.

Au fost confirmate și două riscuri moștenite, **neremediate de această livrare**:
backendul rulează încă drept superuser `postgres`, iar lockfile-ul frontendului
neschimbat are **27 findings npm: 1 critical, 13 high, 12 moderate, 1 low**.
Critical-ul este `jspdf@4.2.0`; apelurile vulnerabile new-window/FreeText nu apar
în fluxul PDF observat (`output('arraybuffer')`). Patch-ul oficial
[jsPDF 4.2.1](https://github.com/parallax/jsPDF/releases/tag/v4.2.1) trebuie aplicat
și verificat separat; nu s-a rulat upgrade/npm audit fix. Trei high sunt pachete
runtime (DOMPurify și React Router/DOM), cu precondițiile vulnerabile neobservate
în utilizarea curentă; zece sunt dev/build. Detalii și limite în
[`SECURITY_AUDIT_REPORT.md`](../../webdev/SECURITY_AUDIT_REPORT.md).

---

## 2026-11-12 — Profil Telegram UA din cod și protecția rapoartelor (etapa locală)

Botul client folosește exclusiv interfața ucraineană. Profilul preia structura
descrierii Bizcheck.md, numele `BIZCHECK` și avatarul public MD copiat fără modificări
în `tgbot/assets/profile.jpg`. Domeniul afișat este `bizcheck.com.ua`; contactul
existent `office@bizcheck.md` rămâne până la confirmarea unei cutii UA reale.

Profilul/contactul sunt definite în `bot_profile.py`, textele în `strings.py`,
logo-ul în asset; `SITE_NAME` și `CONTACT_EMAIL` nu mai sunt configurabile din
mediu. Guardul restabilește valorile din cod și elimină localizările vechi.
Telegram nu oferă blocare absolută față de proprietarul BotFather/deținătorul tokenului.

Raportul este solicitat prin `POST /tg/report/<token>` cu secretul botului și
chatul privat verificat; o operație SQL atomică leagă tokenul de primul chat.
Contact/email/lead cer același chat și expirare validă. Eliminat modul fail-open;
`BOT_SHARED_SECRET` este obligatoriu la pornire/deploy. Datele nu se livrează în
grupuri, contactele altor persoane sunt respinse, iar tokenurile sunt mascate în
logurile botului/backendului/nginx. Răspunsurile bridge au `Cache-Control: no-store`.

Actualizarea cere rebuild/redeploy **backend + tgbot împreună** și migrarea
idempotentă `tg_token_chat_id` la boot. La încheierea etapei locale nu se făcuse
încă deploy și nu se modificaseră profiluri live; deploy-ul ulterior este
consemnat în intrarea de mai sus.
PDF-ul păstrează limba selectată pe site; conținutul quiz/feedback rămâne editabil
în admin, separat de profilul botului. Testarea locală nu verifică concurența pe
Postgres real sau livrarea live către Telegram.

Verificare finală: **1018 teste backend**, **173 teste bot**, **168 verificări
configurare deploy** și **82 verificări nginx** trecute; `bash -n deploy.sh` și
`git diff --check` trecute. Pornirea verifică identitatea reală a tokenului față de
`TELEGRAM_BOT_USERNAME` și refuză explicit botul MD de referință înainte să schimbe profilul.

---

## 2026-08-18 — Val de reparații: quiz, raport, vizual, configurare

Patru zone disjuncte, lucrate în paralel. Detaliul fiecărui defect e în
[`03-registru-buguri.md`](03-registru-buguri.md); aici e doar ce s-a atins și cum s-a închis.

**Flux de quiz** — progresul nu se mai pierde la reîncărcare sau la schimbarea limbii (garda
one-shot din efectul „enter block" a devenit o condiție fără stare); deep-linkul `/uk/test/:slug`
se detectează din `useParams`, nu dintr-o cale pre-i18n; PII-ul nu mai ajunge în consola
browserului. Fișiere: `src/pages/StartPage.tsx`, `src/context/QuizContext.tsx`.

**Raport și livrare** — `report_type` necunoscut avertizează în loc să cadă tăcut pe layoutul
`bizcheck`; șase curse de tip dublu-click închise cu gărzi sincrone (un click dublu emitea
două token-uri Telegram și pornea două generări PDF). Fișiere: `src/types/index.ts`,
`src/pages/CtaPage.tsx`, `src/hooks/useTelegramLink.ts`, `src/utils/pdfGenerator.ts`.

**Vizual** — 14 defecte reparate, cel mai grav fiind titlul de bloc **invizibil în PDF-ul
livrat**. Restul: un accent care evada din sidebar sub 1000px, headerul rupt de numele lung
de test, logo fără dimensiuni (layout shift ~121px), nouă perechi de culori sub WCAG AA
(cea mai proastă la 2.00:1), overflow orizontal pe login-ul de admin, reguli CSS moarte.

**Configurare** — șapte grupuri de variabile citite de cod dar imposibil de setat din `.env`,
fiindcă niciun serviciu nu are `env_file:`. Printre ele: adresa de contact a botului și cele
patru variabile de identitate din emailuri, toate rulând pe defaultul moldovenesc; și
`TG_REQUIRE_BOT_SECRET`, flagul care ar închide rollout-ul etapizat al secretului pe rutele
care scriu date personale. `validate-deploy-config.py` prinde acum clasa asta de drift.

Ajustare făcută la integrare: garda `${TELEGRAM_BOT_USERNAME:?…}` a fost scoasă de pe serviciul
`tgbot`. Botul nu citește variabila, iar compose evaluează interpolările pe întregul fișier —
deci garda de pe `backend` oprea oricum tot stackul. Copia doar injecta configurare moartă.

### Verificare (rulată de agentul principal, nu preluată din rapoarte)

```
webdev/frontend  npx tsc -b            exit 0
webdev/frontend  npm run test:run      21 fișiere / 270 teste, toate trec
webdev/frontend  npm run lint          exit 0, zero warning-uri
webdev/backend   venv/bin/python -m pytest -q     799 passed
webdev           scripts/validate-deploy-config.py   OK 167 verificări  (înainte: 63)
webdev           scripts/validate-nginx.py           OK 80 verificări
webdev           bash -n deploy.sh                   OK
```

Frontendul avea 250 de teste înainte de val; acum are 270.

---

## 2026-08-18 — Deep-linkul Telegram nu mai poate ateriza în botul greșit

### Ce era greșit

`TELEGRAM_BOT_USERNAME` avea, în patru locuri, valoarea de rezervă hardcodată
`CROWE_BIZCHECK_bot` — handle-ul din deployment-ul moldovenesc. Fiindcă tokenul și handle-ul
sunt **variabile separate**, un `.env` care setează corect `TELEGRAM_BOT_TOKEN` (botul
ucrainean) dar omite `TELEGRAM_BOT_USERNAME` producea linkuri
`https://t.me/CROWE_BIZCHECK_bot?start=<token>`.

Rezultatul: clientul e trimis într-un bot **care nu a primit niciodată acel token**. Botul nu
are cum să-l recunoască, deci nu livrează raportul — și nimic nu loghează o eroare, fiindcă
din punctul de vedere al backendului totul a mers bine. Eșec tăcut, pe calea principală de
livrare.

Nimic nu apăra împotriva asta: variabila nu era în `REQUIRED_VARS` din `deploy.sh` și nici
în lista verificată de `backend/scripts/e2e_check.py`. Runbook-ul o marca deja drept capcană
(„**tăcere**"), dar marcajul era singura apărare.

### Ce e propagarea de token — verificat, era corectă

| Token | Cine îl folosește | Verdict |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | serviciul `tgbot` (polling) + `backend/services/telegram_send.py` (trimitere) | acelaşi bot pe ambele capete — corect. Trebuie să fie același, altfel răspunsul utilizatorului ar ajunge la alt bot decât cel care a scris |
| `SALES_BOT_TOKEN` | serviciul `groupbot` (polling) + `backend/services/sales_notify.py` | corect |

`scripts/set-bot-tokens.sh` refuză cele două tokenuri dacă sunt identice (ar produce 409 la
`getUpdates`) și scrie handle-ul citit din `getMe`, nu unul ghicit. Cine a rotit tokenurile
prin scriptul ăsta nu a fost niciodată expus bugului. Cine a editat `.env` manual, da.

### Ce s-a schimbat

| Fișier | Modificarea |
|---|---|
| `backend/services/telegram_send.py` | funcții noi `bot_username()` și `deep_link(start)`, **fără valoare de rezervă**; nesetat → `None` + `log.error` explicit |
| `backend/routes/telegram.py:130` | `POST /tg/link/<id>` întoarce **503** când handle-ul lipsește, în loc de un link către alt bot |
| `backend/routes/tg_feedback.py` | `_bot_username()` înlocuit cu `_feedback_link(token)`; fără handle → `""`, ca adminul să nu trimită mai departe un link mort |
| `webdev/docker-compose.yml:62,226` | `${TELEGRAM_BOT_USERNAME:?…}` — compose refuză să pornească fără ea, în loc să cadă pe handle-ul moldovenesc |
| `webdev/deploy.sh:73` | variabila intră în `REQUIRED_VARS`; deployul moare dacă lipsește sau e pe placeholderul `YOUR_` |
| `webdev/tgbot/.env.example:5` | handle-ul real înlocuit cu `YOUR_BOT_USERNAME` |
| `backend/tests/test_unit_tg_deeplink.py` | **nou**, 8 teste care fixează comportamentul |

### Verificare

```
cd webdev/backend && venv/bin/python -m pytest -q
799 passed in 26.36s          # 791 înainte + 8 noi
```

### Ce trebuie făcut pe server înainte de următorul deploy

`.env`-ul de producție **trebuie** să conțină `TELEGRAM_BOT_USERNAME` cu handle-ul botului
căruia îi aparține `TELEGRAM_BOT_TOKEN`. Altfel `deploy.sh` se oprește la verificarea de
`.env` — intenționat: mai bine un deploy blocat cu mesaj clar decât unul reușit care trimite
clienții în alt bot. Cel mai simplu mod de a-l pune corect, fără să-l ghicești:

```
cd webdev && ./scripts/set-bot-tokens.sh     # citește handle-ul din getMe și îl scrie în .env
```

Verificarea că e chiar botul dorit: `./scripts/check-telegram.sh` face `getMe` pe ambele
tokenuri și îți arată cele două handle-uri.
