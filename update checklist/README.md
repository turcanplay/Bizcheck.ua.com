# BizCheck_Plan_Update.docx — stare la 2026-07-28

`BizCheck_Plan_Update.docx` e planul rezultat dintr-o ședință de feedback (notițe +
un screenshot de pe telefon). E **în mare parte implementat**, dar documentul în sine
e depășit pe alocuri: descrie un ecran cu selector de limbă **RO / RU**, care nu mai
există — aplicația e acum **UA / EN**, cu ucraineana implicită.

Mai jos, fiecare punct din plan verificat direct în cod. Fișierele sunt relative la
`webdev/frontend/`.

## 1. Raport — sistem de scoring

| Punct | Stare | Unde |
|---|---|---|
| Legendă cu intervale % și nivel de risc, afișată în raport | **implementat** | `src/components/report/ReportHeader.tsx:72-95`; textele la `src/i18n/translations.ts:370-405` |
| Praguri | **implementat, dar altele decât în plan** | `src/utils/scoring.ts:24-29` — `≥80 safe`, `≥70 developing`, `≥65 warning`, restul `risk`. Planul cerea 80–100 / 70–79 / 60–69 / 0–59; pragul de mijloc e **65**, nu 60 |
| „Dacă scorul e 0% → afișează 1%" | **NEIMPLEMENTAT** | `src/utils/scoring.ts:16` întoarce `0`; barele folosesc scorul brut (`ZoneSection.tsx:69`, `ReportHeader.tsx:48`), donut-ul la fel |

> De știut: `tests.scoring_zones` (JSONB, editabil din panoul de admin) **nu e citit
> niciodată de raportul public** — frontendul are pragurile hardcodate în `scoring.ts`,
> iar backendul le duplică în `services/email_templates.py` și `services/sales_notify.py`.
> Dacă cineva schimbă zonele din admin, raportul nu se schimbă. Nu e o restanță din
> planul acesta, dar e o capcană reală.

## 2. Structura raportului per bloc

| Punct | Stare | Unde |
|---|---|---|
| Procent vizibil per bloc | **implementat** | `src/components/report/BlockGrid.tsx:38`, `ZoneSection.tsx:56-63`, `BlockDetailPage.tsx:39-47` |
| Linii de text descriptive sub fiecare bloc | **parțial** | Cardurile din `BlockGrid.tsx:47-48` arată doar „Bloc N" + titlu. Descrierea există la nivel de **zonă** (`ZoneSection.tsx:44`) și ca **pagini de detaliu per bloc** (`BlockDetailPage.tsx:55-80`, conținut în `src/data/blockExplanations.ts`) — dar paginile de detaliu apar doar pentru `report_type = 'bizcheck'` |

## 3. Modificări formular

| # | Punct | Stare | Unde |
|---|---|---|---|
| 1 | Datele personale mutate la sfârșit | **implementat** | `src/pages/StartPage.tsx:23` („Personal info is now collected on the CTA page"), colectate în `src/pages/CtaPage.tsx:584-620` |
| 2 | Link clicabil către politica de confidențialitate | **implementat** | `src/pages/CtaPage.tsx:635-644`, checkbox de consimțământ care blochează submit-ul (`:257`, `:334`) |
| 3 | Fiecare pas separat, câte unul pe ecran | **implementat** | `src/pages/QuizPage.tsx:55-62` (o singură întrebare); profilul companiei are 4 sub-pași în `src/pages/StartPage.tsx:152, 206, 276, 319, 362` |
| 4 | Scoatem secțiunea „info despre companie", punem context de bază | **implementat, în forma de mai sus** | profilul s-a redus la sector / mărime / vechime / cifră de afaceri |
| 5 | Text direct: ani de activitate pe piață | **implementat** | `src/pages/StartPage.tsx:319-325`, opțiuni `<1 an … >10 ani` (`src/i18n/translations.ts:209-212`) |
| 6 | Mai multe domenii de activitate (multi-select) | **implementat** | `src/pages/StartPage.tsx:46-53` + UI `:238-252`, cu indicația „poți alege mai multe" la `:230-236` |
| 7 | Headline vizibil pe întrebările următoare | **implementat** | antet sticky cu blocul curent, contorul și bara de progres: `src/components/quiz/QuizProgress.tsx:61-66` |

## 4–5. Header, funcționalități noi

| Punct | Stare | Unde |
|---|---|---|
| Header standardizat | **implementat** (design-ul curent diferă de screenshot) | `src/components/layout/Header.tsx` |
| Notificare Telegram automată la finalizarea raportului | **implementat** | `backend/routes/submissions.py:188-189` → `services/sales_notify.py:565-613`. Pleacă o singură dată, doar când există nume + cel puțin un canal de contact |
| „Număr erori / raport detaliat prin Telegram" | **implementat**, ca alertă la eșec de livrare | vezi `documentation/telegram/04-alerta-esec-livrare.md` |
| Refolosirea formularului pentru alt domeniu | **implementat**, ca sistem multi-test | fiecare test are slug, blocuri, întrebări și `report_type` proprii; se creează din panoul de admin, fără cod nou |

## 6. Ecranul de finalizare

Ecranul din screenshot nu mai există în forma aceea.

- Nu mai există un buton principal unic. `src/pages/CtaPage.tsx` arată scorul + zona
  (`:490-500`), starea raportului (`:502-505`), apoi întrebarea „cum vrei să primești
  raportul?" (`:507`) cu două opțiuni: **email** (`:526-546`) și **Telegram**
  (`:547-561`).
- Livrarea pe email e controlată de setarea `email_delivery_enabled` din panoul de
  admin; când e oprită, cardul apare dezactivat, cu badge „în curând" (`:76-78`).
- Nu există buton „deschide raportul online": `ReportPage.tsx` nu mai e rutat în
  `App.tsx`, iar faza `report` din `src/types/index.ts:55` nu e randată niciodată de
  `QuizApp.tsx:73-75`.
- Textele vechi „Testul a fost finalizat! / Raportul dvs. este pregătit"
  (`ctaSuccessTitle` / `ctaSuccessSubtitle`, `src/i18n/translations.ts:509-516`) au
  rămas în fișierul de traduceri dar **nu mai sunt folosite nicăieri** — chei moarte,
  împreună cu `ctaStep1Label` (`:521`).
- **Selectorul RO / RU din plan nu mai există.** Comutatorul oferă exact UA + EN
  (`src/components/layout/Header.tsx:31-44`, `src/pages/StartPage.tsx:157-170` și
  `:211-224`), iar tipul e închis la două limbi (`src/i18n/translations.ts:1`).

## Ce a rămas de făcut din plan

1. **Clamp 0% → 1%** în afișare — singurul punct funcțional neimplementat.
2. **Praguri de scoring**: dacă se dorește 60–69 în loc de 65–69, se schimbă în
   `src/utils/scoring.ts` **și** în cele două locuri din backend care le duplică.
3. **Text descriptiv sub fiecare bloc în grilă** (nu doar pe paginile de detaliu),
   dacă asta era intenția punctului 2 din plan.
4. Curățenie: chei de traducere moarte (`ctaSuccessTitle`, `ctaSuccessSubtitle`,
   `ctaStep1Label`).

`.docx`-ul se păstrează ca document-sursă al ședinței. Starea reală e cea de aici.
