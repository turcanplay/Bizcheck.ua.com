# Registru de bug-uri

Stare la 18 august 2026. „Reparat" înseamnă reparat **și** acoperit de un test sau de o
verificare rulată — nu doar editat.

## Reparate

### Funcționale — flux de quiz

| # | Ce se întâmpla | Unde | De ce se întâmpla |
|---|---|---|---|
| F1 | **Progresul se pierdea la reîncărcare sau la schimbarea limbii**: utilizatorul revenea la prima întrebare a blocului, deși restaurarea din `sessionStorage` exista tocmai ca să prevină asta | `src/context/QuizContext.tsx:483-508` | Garda era un `useRef` one-shot, consumat la prima rulare a efectului. Efectul re-rula însă la fiecare identitate nouă a lui `blocks` — iar `blocks` e recreat imediat după fetch de efectul de re-rezolvare pe limbă. A doua rulare chema `enterBlock()` necondiționat. Condiția e acum fără stare |
| F2 | **Pe deep-link, alegerea altui test îți dădea înapoi testul din URL.** Butonul „înapoi la selecția testului" apărea unde trebuia ascuns | `src/pages/StartPage.tsx:17-28` | `location.pathname.startsWith('/test/')` — după migrarea i18n calea reală e `/uk/test/:slug`, deci condiția era permanent falsă. Acum se citește `useParams().slug` |
| F3 | Un `currentQuestionDbId` salvat pentru o întrebare ștearsă între timp din admin lăsa pagina albă la infinit | `QuizContext.tsx` (`enterBlock`) | Efect colateral al aceleiași gărzi; rezolvat de F1 |

### Funcționale — raport și livrare

| # | Ce se întâmpla | Unde |
|---|---|---|
| F4 | Un `report_type` necunoscut (adăugat în backend, greșit scris în DB) cădea **tăcut** pe layoutul `bizcheck` — clientul primea alt raport decât cel configurat | `src/types/index.ts` — set canonic unic + `normalizeReportType()` care avertizează; `null`/`undefined` rămâne default tăcut, fiind „nesetat" legitim |
| F5 | Dublu click pe butonul Telegram emitea **două** token-uri de deep-link și pornea două navigări | `src/hooks/useTelegramLink.ts` — gardă sincronă `inFlightRef` (`tgLoading` dezactivează butonul abia la următorul render) |
| F6 | Două generări PDF concurente; retry-urile recursive eliberau lock-ul înainte să se termine | `src/pages/CtaPage.tsx` — `pdfRunningRef`, plus `return await` pe retry-uri |
| F7 | Butonul de retry PDF reseta `pdfSavedRef`, iar o schimbare de limbă pornea a doua generare în paralel | `CtaPage.tsx:608` |
| F8 | Când PDF-ul eșua, butonul de trimitere rămânea blocat afișând la nesfârșit „se pregătește" | `CtaPage.tsx:796` — afișează `ctaPdfError` |
| F9 | „Trimis din nou ✓" rămânea agățat peste următoarea trimitere; un avertisment nou moștenea countdown-ul celui vechi și dispărea instant | `CtaPage.tsx:290-303` |
| F10 | **Email și telefon ajungeau în consola browserului** la un 400 pe crearea submisiei | `QuizContext.tsx:293-300` — se loghează doar statusul și numărul de erori |

### Vizuale

| # | Ce se vedea | Unde |
|---|---|---|
| V1 | **Titlul blocului era invizibil în PDF-ul livrat clientului** — dreptunghi albastru plin, cu glifele pictate transparent | `components/report/BlockDetailPage.css`, `GdprQuestionPage.css`. Trucul `background-clip:text` + `-webkit-text-fill-color:transparent` nu e implementat de html2canvas-pro (verificat în sursa pachetului instalat). Înlocuit cu `color:#0A3A6E` |
| V2 | Bara-accent a sidebar-ului de filtre evada din sidebar pe orice ecran ≤1000px și se picta pe toată lățimea secțiunii | `CatalogSection.css:528,541` — `position:static` schimba containing block-ul; acum `relative` |
| V3 | Numele testului (text ucrainean lung, introdus din admin) rupea bara de header de 60px și împingea conținutul din dreapta | `Header.css` + `Header.tsx` — `nowrap` + `ellipsis` + `min-width:0` |
| V4 | Logo-ul fără `width`/`height` rezerva 0px lățime: separatorul și subtitlul săreau ~121px la încărcare | `Header.tsx:23` |
| V5 | Butonul „Lasă un review" (chihlimbariu) avea halou **albastru**, iar `box-shadow`-ul de `:hover` era complet mort | `ReviewForm.css:191-194`. `animation: infinite` bate declarațiile normale, iar `:hover { animation-play-state: paused }` îngheață valoarea animată în loc s-o elibereze |
| V6 | Nouă perechi de culori sub pragul WCAG AA — cel mai rău: alb pe Crowe Amber la **2.00:1** (comutatorul de limbă), badge la 2.39:1, gri-uri de 2.36–3.19:1 | `StartPage.css`, `CtaPage.css`, `QuizQuestion.css`, `Hero.css`, `CatalogSection.css`, `AboutPlatform.css`, `ReviewForm.css`, `admin.css` |
| V7 | Cardul de login admin (`width:380px` fără `max-width`) producea overflow orizontal sub 380px | `admin.css:64` |
| V8 | Reguli CSS moarte: `::before { content: attr(data-num) }` care se rezolva mereu la string gol; două blocuri `@media` identice suprapuse | `FAQ.css:115-137`, `CatalogSection.css` |

### Configurare — identitatea moldovenească rămasă ca valoare implicită

Cauza comună: **niciun serviciu din `docker-compose.yml` nu are `env_file:`**. `.env` servește
doar la substituția `${...}`. O variabilă citită de cod dar neenumerată în `environment:` nu
ajunge niciodată în container, iar codul rulează tăcut pe defaultul din sursă.

| # | Variabilă | Default care rula efectiv în producție |
|---|---|---|
| C1 | `TELEGRAM_BOT_USERNAME` | `CROWE_BIZCHECK_bot` — vezi intrarea din [jurnal](01-jurnal-modificari.md) |
| C2 | `CONTACT_EMAIL` (tgbot) | `office@bizcheck.md` — botul ucrainean dădea clienților adresa moldovenească |
| C3 | `EMAIL_REPLY_TO`, `EMAIL_SITE_URL`, `EMAIL_TELEGRAM_URL`, `EMAIL_TELEGRAM_HANDLE` | `office@bizcheck.md`, `crowe-tm.md`, `t.me/CROWE_TM`, `@CROWE_TM` — în fiecare email trimis clientului |
| C4 | `EMAIL_PRIVACY_URL` | pointa spre `/confidentialitate`, rută **legacy** redirectată 301; acum `/uk/privacy` direct |
| C5 | `TG_REQUIRE_BOT_SECRET` | imposibil de activat → `/tg/contact`, `/tg/email`, `/tg/lead` (endpoint-uri care **scriu date personale**) rămâneau permanent fail-open pentru apelanții fără header |
| C6 | `RATELIMIT_STORAGE_URI` | `memory://` per worker: plafoanele reale ~4× cele nominale |
| C7 | `DB_POOL_MIN` / `DB_POOL_MAX` | netunabile, deși `check-db-role.sh` calculează `CONNECTION LIMIT` pe baza lor |

Toate sunt acum pasate prin compose și documentate în `.env.example`. Interpolarea folosește
peste tot `:-`, nu `-`: la `DB_POOL_*` un șir gol ar face `int()` să arunce la import
(restart-loop), iar la `EMAIL_*` ar produce `mailto:` goale în emailul clientului.

`validate-deploy-config.py` a fost extins să prindă exact clasa asta de drift — scanează
`os.getenv` din codul fiecărui serviciu și cere ca fiecare nume citit să fie ori pasat, ori
scutit cu motiv scris. Verificări: **63 → 167**.

## Găsite, nereparate — și de ce

| Ce | De ce nu |
|---|---|
| Butonul „Пройти заново" din starea goală a quiz-ului nu duce nicăieri: `restartQuiz()` golește contextul, dar URL-ul păstrează slug-ul și `QuizApp` reaplică imediat `selectTest(slug)` | Cere o decizie de produs (unde ar trebui să ducă) plus o rută nouă. Nu e o reparație de defect |
| `handleResendEmail`: dacă bucla de 6 încercări se epuizează, utilizatorul nu primește niciun feedback | Cere o cheie i18n nouă |
| Trei contraste sub prag **în zona PDF**: `CallToAction.css` 2.30:1, `GdprQuestionPage.css` 2.91:1, plus grii de 3.11:1 în `ZoneSection.css` | Orice atingere schimbă PDF-ul livrat clientului. S-a intervenit doar acolo unde textul era efectiv **invizibil** (V1) |
| `[data-pdf-page]` are `min-height:1103px` la orice lățime → pe telefon ecranul de raport arată pagini aproape goale | Corect pentru captura A4; schimbarea ar cere separarea stilului de ecran de cel de captură |
| `CookieBanner.css:49` cere `Playfair Display`, dar **nu există niciun `@font-face` sau link Google Fonts** în proiect → cade pe Times New Roman, singurul serif din aplicație | Adăugarea unui font ar cere și actualizarea CSP-ului din `nginx.conf`. Decizie de design |
| `src/api/admin.ts:550` are propriul `ReportType` duplicat, identic ca valori | Fișier în afara zonei agentului; ar trebui să importe din `@/types` |
| Cod mort: `ReportPromoBlock.tsx`, `TestsShowcase.tsx`, `TemplatesShowcase.tsx` (zero importatori), `CallToAction.tsx` (doar propriul test) | Ștergerea e curățenie, nu reparație — vezi [restanțe C5](02-restante-si-decizii.md) |
| Layout-urile `standard` și `gdpr` filtrează sub-întrebările, deci răspunsurile la ele nu apar în raport | Nu s-a putut demonstra că e defect și nu intenție |
| Secretul `X-Bot-Secret` e comparat cu `==` în `tg_group.py`, `tg_admin.py`, `tg_feedback.py`, dar cu `hmac.compare_digest` în `telegram.py` | Aceeași verificare, patru implementări copiate. Expunere de timing mică, dar inconsistența e reală |
| `utils/crypto.decrypt_value` prinde `except (InvalidToken, Exception)` și întoarce ciphertext-ul brut ca „plaintext" | O cheie `PII_ENCRYPTION_KEY` greșită produce PII ilizibil în UI și în exporturi, în loc de o eroare vizibilă. Merită reparat separat, cu grijă |
