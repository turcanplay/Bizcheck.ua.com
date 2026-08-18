# Jurnal de modificări

Cronologic, cel mai recent sus. Fiecare intrare spune ce s-a schimbat, **de ce era greșit**
și cu ce verificare s-a închis.

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
