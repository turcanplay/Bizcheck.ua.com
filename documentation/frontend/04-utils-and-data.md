# Frontend — Utils, Data, i18n, Types

## Scoring (`src/utils/scoring.ts`)
- `calculateBlockScore(block, answers)` → % : for each answered question, max option score = the
  achievable max; returns `earned / maxPossible * 100`, rounded.
- `calculateTotalScore(blockScores)` → % : average of block percentages, rounded.
- `getZone(percentage)` → `Zone` : `safe` ≥80, `developing` 70–79, `warning` 65–69, `risk` <65.
- `getZoneColor(zone)` → hex : safe `#16A34A`, developing `#EAB308`, warning `#F97316`, risk `#DC2626`.
- `buildReport(blocks, answers, userInfo)` → `ReportData` : orchestrates the above; adds
  `distanceFromPerfect` (100 − total) and a formatted date.

> Zone thresholds here mirror the backend `tests.scoring_zones` defaults. Keep them consistent.

## PDF generation (`src/utils/pdfGenerator.ts`) — client-side
`generateFullPdf({ rootEl, lang, renderWidth?, scale?, jpegQuality?, unhideWrapper? })`:
1. Optionally unhide the offscreen wrapper (CtaPage renders the report hidden).
2. Find `[data-pdf-page]` elements (or use `rootEl` as a single page).
3. Render each via `html2canvas-pro` → scale to A4 portrait (210×297 mm).
4. Overlay `[data-pdf-link]` elements as clickable link annotations.
5. Fetch static `/pdf/preview_{lang}.pdf` and `/pdf/outro_{lang}.pdf` (fallback `outro.pdf`).
6. Merge with `pdf-lib`: preview → report → outro.
7. Returns an object with `.save(filename)` and `.output('datauristring')`.
Caches a per-tab `window.__pdfCacheKey` for the static-PDF fetches.

## Cookies + third-party consent (`src/utils/cookieConsent.ts`)
- Cookie `bizcheck_cookie_consent` (1-year): `{necessary:true, analytics, marketing, version, timestamp}`.
- `loadConsent()`, `saveConsent(consent)` (persists + applies), `clearConsent()`.
- `applyMarketingConsent(granted)` → `window.fbq('consent', 'grant'|'revoke')` (Meta Pixel).
- `applyAnalyticsConsent(granted)` → lazy-loads Yandex Metrica (`/tag.js`, id 109349254), idempotent.

## Input guard (`src/utils/inputGuard.ts`) — client UX layer only
- `sanitizeText(value, maxLen=600)` — strip `<>`, remove control chars, cap length.
- `sanitizeOneLine(value, maxLen=100)` — above + remove newlines/tabs, collapse spaces (names/roles/search).
- `validateField(value, rule)` → stable error code (`required|too_short|too_long`) or `null`.
> The server re-validates everything (`utils/validators.py`). Never rely on this alone.

## Block content (`src/data/blockExplanations.ts`)
`BLOCK_EXPLANATIONS` — 8 entries (indexed by order 1–8), each bilingual: `title`, `essence`,
`risk` (4 paragraphs), `action` (2 paragraphs), `regulatory` (Moldova legis.md links).
Used by `BlockDetailPage` for `bizcheck` reports. `findBlockExplanation(order)` returns one or `null`.
Topics: 1 Founders & Management · 2 Personal Data & IT · 3 Contract Reliability · 4 Finance & Tax ·
5 Personal Liability & Bankruptcy · 6 Counterparties · 7 Labor Relations · 8 Market Risks.

## i18n (`src/i18n/translations.ts`)
`Lang = 'ro' | 'ru'`. Keys grouped by feature: `header`, `hero`, `steps` (profile wizard),
form-validation warnings, `quiz`, dropdown arrays (`sectors[9]`, `sizes[8]`, `ages[5]`, `revenues[6]`),
`report` (conclusions/verdicts/legend), `zones` (+ descriptions), PDF footer, `cta`, `cookies`.
Accessed via `LanguageContext`'s `t()` / `tList()`.

## Types (`src/types/index.ts`)
- `QuestionOption` `{label, key, score, next_question_id?}`
- `Question` `{id, db_id, parent_question_id?, text, note?, options[]}`
- `Block` `{id, title, questions[]}`
- `QuestionsData` `{blocks[], sectors[], sizes[], ages[], revenues[]}`
- `TestOption` `{id, slug, name_ro, name_ru, description_ro, description_ru, report_type?}`
- `UserInfo` `{firstName, lastName, email, phone, consent, sector, size, age, revenue}`
- `Answers = Record<string, number>` (questionId → earned score)
- `Phase = 'start'|'quiz'|'transition'|'report'|'cta'`
- `Zone = 'safe'|'developing'|'warning'|'risk'`
- `BlockResult` `{id, order, title, score, zone, questionCount}`
- `ReportData` `{blockScores[], totalScore, distanceFromPerfect, userInfo, date}`
