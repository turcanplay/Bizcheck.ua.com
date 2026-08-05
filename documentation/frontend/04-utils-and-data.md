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

`generateFullPdf({ rootEl, lang, renderWidth=780, scale=3, jpegQuality=0.95, unhideWrapper? })`:

**Flow:** DOM → images → jsPDF → pdf-lib merge.

1. **Unhide wrapper** (if `unhideWrapper=true`): CtaPage renders the report off-DOM. The wrapper is moved 
   far left (`-100000px`) to stay layout-active (html2canvas needs real computed styles) but invisible. 
   Before capture: measure `offsetHeight` to trigger layout, then wait for `document.fonts.ready` 
   (glyph metrics drive line wrapping; fonts must load before rasterization). Wait rackets with a 
   800ms ceiling so this never blocks longer than the old flat delay. Without the `offsetHeight` read 
   first, `fonts.ready` may resolve on a stale font set because layout hasn't yet asked for glyphs.

2. **Find page elements:** `[data-pdf-page]` elements (each becomes its own A4 portrait page), or 
   fallback to `rootEl` as a single page.

3. **Rasterize each page via html2canvas:** 
   - `scale=2` at 780px width produces ~14 MB of RGBA per page; release canvas backing after encoding
     with `canvas.width=0; canvas.height=0` to stop GC pressure on mobile.
   - **`ignoreElements` filter:** html2canvas clones the entire `documentElement` before rasterization, 
     so without filtering, a 15-page report re-clones all 15 pages per capture — quadratic cost. 
     Only `el` is drawn; sibling pages are plain block siblings in `.report-pdf__body` with no 
     sibling-dependent CSS, so the clone's shifted flow position is accounted for.
   - **`onclone` fallback:** html2canvas already serializes `<style>` and `<link href>` from the cloned 
     `<head>`. Re-appending them would re-parse the entire CSS bundle per page. Kept only as a 
     last-resort check if the cloner ever drops styles outright.
   - **Image encoding:** Canvas → `toBlob` (async, off main thread) → `Uint8Array` → jsPDF. 
     Avoids `toDataURL` base64 on main (1 MB per page), which jsPDF would unescape + decode back to bytes.
   - **Lossless vs. JPEG:** PNG if `jpegQuality >= 0.9` (crisper text at small font sizes), else JPEG.

4. **Scale canvas to A4 portrait (210×297 mm):** Top-align shorter pages so section headers sit at the 
   top of the printed page, not centered.

5. **Add link annotations** from `[data-pdf-link]` elements: overlay clickable regions scaled to the 
   rendered page dimensions. Failures silently ignored (best-effort).

6. **Fetch language-specific static assets:**
   - Cover: `/pdf/preview_${lang}.pdf`, fallback to `preview_en.pdf` if missing or not PDF.
   - Outro: `/pdf/outro_${lang}.pdf`, fallback to `outro.pdf` (legacy common outro).
   - Session-level cache buster: `window.__pdfCacheKey = Date.now()` on first PDF gen in the tab; 
     reused for both static fetches so a fresh report in the same tab reuses cached assets.

7. **Merge with pdf-lib:** preview pages + report pages + outro page.

8. **Return:** Wrapped object with `.save(filename)` and `.output('datauristring')` methods matching 
   jsPDF's interface.

**Critical gotcha:** The default parameters (`scale=3`, `jpegQuality=0.95`) exist in the function 
signature but are **never actually used** in production. The sole caller, `pages/CtaPage.tsx`, passes 
`scale: 2, jpegQuality: 0.85`. Changing the defaults here has zero effect on the actual PDF output.

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
`risk` (array of paragraphs), `action` (array of paragraphs), `regulatory` ({ label, url }).
Used by `BlockDetailPage` (bizcheck report type). `findBlockExplanation(order)` returns one or `null`.
Topics: 1 Founders & Management · 2 Personal Data & IT · 3 Contract Reliability · 4 Finance & Tax · 
5 Personal Liability & Bankruptcy · 6 Counterparties · 7 Labor Relations · 8 Market Risks.

**Text sourcing (Ukrainian):**
The Ukrainian (`uk`) text originates as a Word document (.docx) delivered by the client. The document 
contains **tracked changes** (revisions): 118 insertions and 125 deletions. Critical: a naive `python-docx` 
read with `paragraph.text` **skips text inside `<w:ins>` elements** (tracked insertions) and includes 
text from `<w:del>` (deletions). This leaves gaps in the middle of sentences. 

Extraction must:
- **Accept** text from `<w:ins>` (tracked insertions kept in the final version).
- **Reject** text from `<w:del>` (tracked deletions discarded).
- Parse the Word structure directly or use a custom XML walk, not the high-level `.text` property.

The English (`en`) text is a translation of the Ukrainian, not the other way around. Edits flow 
Ukrainian ← client (Word doc) → English (human translator).

**Structure mapping:** Document sections → `BlockExplanation` fields (1-to-1):
- Document section "Суть" → `essence`
- Document section "Ризик і наслідки" → `risk` (preserved as array of paragraphs)
- Document section "Що робити" → `action` (preserved as array of paragraphs)
- Document section "Документ:" or "Посилання:" → `regulatory.label` and `.url`

The interface labels for these fields live in `src/i18n/translations.ts` (lines 291–306), not here:
- `blockEssenceLabel` → "Суть" / "Essence"
- `blockRiskLabel` → "Ризик і наслідки" / "Risk and consequences"
- `blockActionLabel` → "Що робити" / "What to do"
- `blockRegulatoryLabel` → "Нормативна основа" / "Regulatory basis"

## i18n (`src/i18n/translations.ts`)
`Lang = 'uk' | 'en'` (default `uk`). Keys grouped by feature: `header`, `hero`, `steps` (profile wizard),
form-validation warnings, `quiz`, dropdown arrays (`sectors[9]`, `sizes[8]`, `ages[5]`, `revenues[6]`),
`report` (conclusions/verdicts/legend), `zones` (+ descriptions), PDF footer, `cta`, `cookies`.
Accessed via `LanguageContext`'s `t()` / `tList()`.

## Types (`src/types/index.ts`)
- `QuestionOption` `{label, key, score, next_question_id?}`
- `Question` `{id, db_id, parent_question_id?, text, note?, options[]}`
- `Block` `{id, title, questions[]}`
- `QuestionsData` `{blocks[], sectors[], sizes[], ages[], revenues[]}`
- `TestOption` `{id, slug, name_uk, name_en, description_uk, description_en, report_type?}`
- `UserInfo` `{firstName, lastName, email, phone, consent, sector, size, age, revenue}`
- `Answers = Record<string, number>` (questionId → earned score)
- `Phase = 'start'|'quiz'|'transition'|'report'|'cta'`
- `Zone = 'safe'|'developing'|'warning'|'risk'`
- `BlockResult` `{id, order, title, score, zone, questionCount}`
- `ReportData` `{blockScores[], totalScore, distanceFromPerfect, userInfo, date}`
