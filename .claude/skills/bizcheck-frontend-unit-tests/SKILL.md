---
name: bizcheck-frontend-unit-tests
description: Write or run FRONTEND (React/TypeScript) unit tests for webdev/frontend with Vitest + Testing Library. Use when adding/changing scoring, validators, cookie/consent logic, hooks, contexts, or components and you want fast jsdom tests. For backend tests use bizcheck-backend-unit-tests.
---

# BizCheck — Frontend Unit Tests (Vitest)

Vitest + Testing Library are **already set up** in `webdev/frontend` (Vite + React 19 + TS, ESM):
the `test` block lives in `vite.config.ts` (jsdom, `globals: true`, setup `src/test/setup.ts`,
`include: src/**/*.{test,spec}.{ts,tsx}`), with `tsconfig.test.json` for the test TS config.
Reference for what each module does: `documentation/frontend/04-utils-and-data.md`,
`documentation/frontend/02-components.md`, `documentation/frontend/03-state-and-api.md`.

## Run

```
cd webdev/frontend
npm run test:run          # one-shot (CI)
npm test                  # watch
npm run test:run -- scoring   # filter by file name
```

Existing suites to copy patterns from: `src/utils/quizContent.test.ts`, `src/i18n/routing.test.tsx`,
`src/i18n/pickLang.test.ts`, `src/api/admin.test.ts`, `src/context/CookieConsentContext.test.tsx`,
`src/components/report/CallToAction.test.tsx`, `src/pages/QuizPage.test.tsx`,
`src/pages/admin/*.test.tsx`, `src/pages/landing/sections/Hero.test.tsx`.

## Test the pure logic first (highest value, no DOM)

These are the priority targets — real exports verified below:

- **`src/utils/scoring.ts`** — `calculateBlockScore(block, answers)`, `calculateTotalScore(blockScores)`,
  `getZone(pct)`, `getZoneColor(zone)`, `buildReport(blocks, answers, userInfo)`. Lock the **zone
  boundaries** exactly (safe ≥80, developing 70–79, warning 65–69, risk <65) — they must stay in sync with
  the backend `tests.scoring_zones`. Test edge values 79/80, 69/70, 64/65.
- **`src/utils/inputGuard.ts`** — `sanitizeText(value, maxLen=600)`, `sanitizeOneLine(value, maxLen=100)`
  (strips `<>`, control chars, collapses spaces), `validateField(value, rule)` → `'required'|'too_short'|'too_long'|null`.
- **`src/utils/cookieConsent.ts`** — `loadConsent`, `saveConsent`, `clearConsent` (cookie round-trip;
  stub `document.cookie`). For `applyMarketingConsent`, mock `window.fbq` and assert it is called only on
  grant — do NOT let real third-party scripts load. `applyAnalyticsConsent` only records the choice today
  (no tag is injected); `isAnalyticsGranted` reads it back.
- **`src/i18n/routing.ts`** — `langFromPath`, `stripLangPrefix`, `localizePath`, `isLocalizableRoute`,
  `readStoredLang`/`writeStoredLang`. Languages are **`uk` (default) + `en`** only; assert admin paths
  stay unprefixed. Existing coverage: `src/i18n/routing.test.tsx`, `src/i18n/pickLang.test.ts`.

```ts
import { describe, it, expect } from 'vitest'
import { getZone } from '@/utils/scoring'   // '@' → ./src alias from vite.config

describe('getZone', () => {
  it('classifies boundary scores', () => {
    expect(getZone(80)).toBe('safe')
    expect(getZone(79)).toBe('developing')
    expect(getZone(65)).toBe('warning')
    expect(getZone(64)).toBe('risk')
  })
})
```

## Components (Testing Library + jsdom)

Render, interact, assert on visible output — not implementation details.
- `QuizQuestion` — selecting an option highlights it and fires the advance callback (use `user-event`;
  the component auto-advances ~500ms, so use `vi.useFakeTimers()` or `findBy*`).
- `DonutChart` — renders the percentage label / correct stroke for a given prop.
- `CookieBanner` — Accept/Reject/Customize call the consent context and hide the banner.
Wrap components that read context in their providers (`LanguageProvider`, `QuizProvider`, etc.) or a small
test wrapper. **`LanguageProvider` reads the location and navigates, so it must be rendered inside a router**
(`MemoryRouter initialEntries={['/uk/…']}`) — see `src/i18n/routing.test.tsx`.
Assert via roles/text (`getByRole`, `getByText`); bilingual copy (uk/en) comes from i18n.

## Contexts & hooks
- `QuizContext` — recording answers updates scores; `sessionStorage` persistence round-trips
  (`bizcheck_quiz_state_v2`). Render a probe component inside `QuizProvider`.
- `useCtaTarget` / api calls — **mock the api layer**, never hit the network:
  ```ts
  vi.mock('@/api/public', () => ({ publicApi: { getSiteSettings: vi.fn().mockResolvedValue({/*...*/}),
                                                listTests: vi.fn().mockResolvedValue([]) } }))
  ```

## Don't unit-test in jsdom (belongs to e2e/manual)
- **`src/utils/pdfGenerator.ts`** — lazy-imports `html2canvas-pro`/`jspdf`/`pdf-lib` and needs real
  layout/canvas; jsdom can't render it. Verify the PDF manually in the running app, not in a unit test.
- Anything depending on actual network, real cookies for third parties, or pixel-accurate layout.

## Conventions & don'ts
- Co-locate `*.test.ts` / `*.test.tsx` next to the source (or `__tests__/`). Use the `@/` alias.
- Mock `api/admin.ts` & `api/public.ts` and `window.fbq` — tests must not touch the network or load trackers.
- Keep scoring-zone expectations identical to the backend; if you change one, change both (see `bizcheck-frontend-state-api`).
- Don't add a second framework (jest) — this project standardizes on Vitest (shares the Vite config).
