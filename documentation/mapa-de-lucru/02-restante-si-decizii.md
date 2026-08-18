# Restanțe și decizii

## A. Blocate pe o decizie a clientului

Nimic din secțiunea asta nu se poate rezolva în cod. Sunt valori reale care nu există încă.

| # | Ce lipsește | Unde doare |
|---|---|---|
| A1 | **Adresa de email UA.** Documentul clientului scrie el însuși `office@bizcheck.com.ua [уточнити фактичну адресу]`. | `src/config/contact.ts:16`, `tgbot/config.py` (`CONTACT_EMAIL`), `backend/services/email_templates.py`, `SMTP_USER` / `SMTP_REPLY_TO` |
| A2 | **Handle-ul Telegram UA.** Documentul: `[уточнити @handle Crowe Mikhailenko]`. | `EMAIL_TELEGRAM_HANDLE` / `EMAIL_TELEGRAM_URL`, `src/config/contact.ts` (`@CROWE_TM`) |
| A3 | **Numărul de telefon UA.** Azi e literal `+380 XX XXX XX XX` în `translations.ts:108-109` — **vizibil pe site** — iar `contact.ts` afișează numărul moldovenesc `+373 79 027 317`. | landing, subsolul raportului, PDF |
| A4 | **Numele firmei în CTA-ul raportului.** Documentul cere „Crowe Mikhailenko"; restul aplicației zice „Crowe Turcan Mikhailenko". Ambele coexistă în `translations.ts` (`:450` vs `:659`, `:789`, `:795`) și în `config/contact.ts:57`. | textul livrat clientului final |
| A5 | **Baza normativă a blocului 7** (relații de muncă) a fost mutată pe Codul Muncii, deși blocul e despre secret comercial, pe care Codul Muncii nu-l reglementează. | `src/data/blockExplanations.ts` |
| A6 | **Cutia poștală SMTP.** Expeditorul real rămâne `office@bizcheck.md` — singura cu SPF/DKIM/DMARC configurate. Un expeditor de pe un domeniu fără DNS de email ajunge în spam. | livrarea rapoartelor pe email |

**Notă:** corecturile juridice din `260731_..._правки_блоки_4_6.docx` (blocurile 4-6, plus
retușuri în 1, 2, 3, 7, 8) sunt **deja implementate** — commit `f4c4be1`, cu track changes
acceptate. Coloana RU a fost ignorată intenționat. Nu mai e restanță.

## B. Pași de lansare neparcurși

`documentation/runbook-lansare.md` are **20 de checkbox-uri în §9 și zero bifate**. Cele care
blochează efectiv scoaterea măștii:

- Conținutul quiz-ului nu e introdus în Postgres-ul de producție (baza pornește goală prin
  design; există `import_test_content.py` + `documentation/quiz-content.md`).
- Masca de pre-lansare nu a fost oprită — și odată cu ea, `noindex`-ul legat de ea.
  `deploy.sh` are deja o verificare care moare dacă `noindex` rămâne agățat fără mască.
- Verificările §9.2–§9.4: comutatorul UA/EN, parcurgerea completă a testului, ecranul de
  livrare, cookie banner, login admin, apoi fluxul Telegram cap-coadă, apoi cron-urile de
  backup și `certbot renew --dry-run`.

## C. Curățenie de făcut

| # | Ce | Unde |
|---|---|---|
| C1 | **Ghidul de admin `.docx` e învechit** — trimite la `bizcheck.md/admin_bizcheck_md_crowe/` și descrie câmpuri RO/RU. Trebuie rescris înainte de predare. | `GHID_ADMIN_PANEL_BIZCHECK.docx` |
| C2 | **16 PR-uri dependabot** deschise de ~3 săptămâni, nerebazate. Patru sunt major bumps cu risc real: `bcrypt 5.0.0` (hash-uri de admin), `flask-cors 6.0.5`, `python-telegram-bot 21.7→22.8`, `jsdom 30`. Fără CI, fiecare merge e pe încredere. | GitHub |
| C3 | **Trei branch-uri complet fuzionate**, de șters: `crowe-rebrand`, `documentation-and-skills`, `rebrand/crowe-brand-standards`. | remote |
| C4 | **`refactor/tgbot-structure`** — 14 commit-uri în avans, dar **fără merge base** (istoric separat). Singurul conținut posibil unic e splitul modular al `tgbot/bot.py`. De decis: cherry-pick sau abandon. | remote |
| C5 | **Cod mort în frontend**, zero importatori: `components/report/ReportPromoBlock.tsx`, `pages/landing/sections/TestsShowcase.tsx`, `TemplatesShowcase.tsx`. Plus `CallToAction.tsx`, importat doar de propriul test. | `webdev/frontend/src/` |
| C6 | **Chei de traducere moarte**: `ctaSuccessTitle`, `ctaSuccessSubtitle`, `ctaStep1Label`. Și faza `report` din `types/index.ts`, niciodată randată. | `translations.ts`, `types/index.ts` |
| C7 | **`.DS_Store` e urmărit de git** și apare mereu modificat. De adăugat în `.gitignore` și scos din index. | rădăcină |

## D. Documentație care contrazice codul

Auditul a găsit nepotriviri verificate una câte una. Cele grave:

1. **`robots.txt`** — `CLAUDE.md:63` și `architecture/02-auth-and-security.md:85` susțin
   amândouă că fișierul **nu** mai listează căile ofuscate. `webdev/frontend/public/robots.txt`
   le listează: `Disallow: /admin_bizcheck_md_crowe/` și `Disallow: /api_crowe_bizcheck/`.
   Trei fișiere, două adevăruri — de decis care e comportamentul dorit, apoi aliniate toate.
2. **`backend/01-routes.md` documentează ~55% din endpoint-uri** — lipsesc 18, printre care
   tot `tg_exports`, tot `tg_group`, tot `tg_feedback` și `POST /admin/sessions/revoke-all`.
3. **`architecture/03-data-model.md`** — omite 3 tabele (`tg_outreach`,
   `admin_revoked_tokens`, `admin_session_epoch`) și mai scrie `language` cu default `ro`;
   realitatea în `db.py:413` e `DEFAULT 'uk'`.
4. **`frontend/03-state-and-api.md:16`** — încă descrie `lang` ca `ro|ru`. Singura afirmație
   activă din documentație care mai tratează RO/RU ca limbi ale aplicației.
5. **Fișiere documentate care nu există**: `ReportPage.tsx`, `QuestionChecklistPage.tsx` —
   citate în `frontend/01-pages.md:73`, `frontend/02-components.md:36` și în skill-ul
   `bizcheck-frontend-components`.

**Zone de cod fără nicio documentație:** subsistemul de feedback Telegram (11 endpoint-uri,
un scheduler, o pagină de admin, un tabel), revocarea sesiunilor de admin, masca de
pre-lansare, scripturile de validare pre-deploy.
