---
name: bizcheck-frontend-components
description: Add or change React components in webdev/frontend (quiz, report, layout, ui, seo). Use when editing the quiz UI, the PDF/printable report layout, report_type rendering, donut charts, the cookie banner, or SEO tags.
---

# BizCheck — Frontend Components

**Read first:** `documentation/frontend/02-components.md` and, for report scoring/PDF,
`documentation/frontend/04-utils-and-data.md`.

## The report layout is data-driven
Which report components render is chosen by `test.report_type`:
- `standard` → `QuestionChecklistSlice` (~5 questions/page).
- `premium` → `BlockGrid` + `OverallScore` + `ZoneSection`.
- `bizcheck` → premium **plus** a `BlockDetailPage` per block (content from `data/blockExplanations.ts`).
Keep all three layouts working when you touch report components.

## Invariants that bite
- The PDF is built **client-side** from the rendered DOM: report pages are `[data-pdf-page]`, clickable
  links are `[data-pdf-link]`. If you restructure report markup, preserve these hooks or
  `utils/pdfGenerator.ts` breaks. A4 portrait (210×297mm).
- Zone thresholds/colors live in `utils/scoring.ts` (safe ≥80, developing 70–79, warning 65–69, risk <65)
  and mirror the backend `tests.scoring_zones` defaults — change both together.
- All copy is bilingual (`t()`); add ro+ru keys in `i18n/translations.ts`.
- `CookieBanner`/`cookieConsent.ts` gate Meta Pixel + Yandex Metrica — don't fire trackers before consent.
- New external asset/script domains require a CSP update in `webdev/nginx.conf` (`bizcheck-deployment`).

## Recipe — add/edit a component
1. Put it in the matching `components/<group>/` folder with a co-located `.css`.
2. For report components, respect `[data-pdf-page]`/`[data-pdf-link]` and the `report_type` branches.
3. Use `DonutChart` for score visuals; pull text from i18n.
4. Verify the PDF still generates (CtaPage hidden-DOM path) if you touched report markup.

## Don'ts
- Don't remove the PDF data-attributes or hardcode strings.
- Don't diverge scoring zones from the backend.
