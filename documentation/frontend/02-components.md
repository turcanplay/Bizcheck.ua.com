# Frontend — Components

`src/components/`. Each component has a co-located `.css`.

## Quiz (`components/quiz/`)
- **`QuizProgress.tsx`** — block stepper (dots with checkmarks for completed blocks), animated block
  title, question counter (`5/42`), progress bar / overall %.
- **`QuizQuestion.tsx`** — one question with up to ~6 lettered options (A–F); highlights selection and
  auto-advances ~500 ms later; Back button; "Get Report" on the last question. Honors branching via
  `next_question_id` (skip to next/sub-question).
- **`QuizTransition.tsx`** — block-completion screen: green check, completed block name + animated score
  donut, next-block preview, Continue.

## Report (`components/report/`)

The report is paginated into `[data-pdf-page]` elements. Which components render is driven by
`test.report_type` (see [`../architecture/03-data-model.md`](../architecture/03-data-model.md)):

| report_type | Components rendered |
|---|---|
| `standard` | `ReportHeader` → `QuestionChecklistSlice` (≈5 questions/page) → `OverallScore` + `ReportFooter` |
| `premium` | `ReportHeader` → `BlockGrid` → `OverallScore` → `ZoneSection` pages → `ReportFooter` |
| `bizcheck` | same as `premium` **plus** a `BlockDetailPage` per block (explanations/risks/actions/regulatory) |

Component roles:
- **`ReportHeader.tsx`** — branding, user name, date, overall score bar + %, verdict text, zone color legend.
- **`BlockGrid.tsx`** — grid of 4 block cards/page with animated donuts (staggered).
- **`OverallScore.tsx`** — large donut + zone badge + tier conclusion text.
- **`ZoneSection.tsx`** — per-zone section (risk/warning/developing/safe), 1–2 zones/page, mini block rows.
- **`BlockDetailPage.tsx`** — large donut + zone badge + block essence, 4-paragraph risk section,
  2-paragraph action section, language-specific regulatory link. Content from `data/blockExplanations.ts`.
- **`QuestionChecklistPage.tsx`** — all top-level questions in a block as pass/fail rows (skips sub-questions).
- **`QuestionChecklistSlice.tsx`** — paginated checklist (5/page) with pass/fail/partial badges + global numbering.
- **`CallToAction.tsx`** — Telegram deep-link CTA (`/tg/link/{submissionId}`), Crowe contact, restart.
- **`ReportPromoBlock.tsx`** — Crowe services promo; contact links flagged `data-pdf-link` for PDF overlay.
- **`ReportFooter.tsx`** — Crowe branding, confidentiality notice, generation timestamp.

## Layout (`components/layout/`)
- **`Header.tsx`** — shows the test name during quiz/report/cta (else "Bizcheck.md"); RO/RU toggle; Crowe logo.

## SEO (`components/seo/`)
- **`Seo.tsx`** — per-page `<title>`, meta description, robots, canonical, hreflang, Open Graph, Twitter card.
  Exports JSON-LD builders: `articleSchema`, `breadcrumbSchema`, `faqSchema`, `productSchema`. RO/RU-aware defaults.

## UI (`components/ui/`)
- **`CookieBanner.tsx`** — consent UI (necessary always on; analytics/marketing toggles). Calls
  `applyMarketingConsent` (Meta Pixel) / `applyAnalyticsConsent` (Yandex Metrica). See
  [`04-utils-and-data.md`](04-utils-and-data.md).
- **`DonutChart.tsx`** — SVG animated donut (props: `percentage`, `color`, `size`, `strokeWidth`,
  `animated`, `delay`, `showLabel`); fills 0→target over ~1.2 s.
