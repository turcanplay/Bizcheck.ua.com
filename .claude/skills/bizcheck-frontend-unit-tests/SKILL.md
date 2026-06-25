---
name: bizcheck-frontend-unit-tests
description: Write or run FRONTEND (React/TypeScript) unit tests for webdev/frontend with Vitest + Testing Library. Use when adding/changing scoring, validators, cookie/consent logic, hooks, contexts, or components and you want fast jsdom tests. NOTE the repo has no test runner yet — this skill includes the one-time Vitest setup. For backend tests use bizcheck-backend-unit-tests.
---

# BizCheck — Frontend Unit Tests (Vitest)

The frontend (`webdev/frontend`, Vite + React 19 + TS, ESM) has **no test runner yet** — there is no
`test` script and no vitest/jest devDeps. First run on a clean repo = set up Vitest, then write tests.
Reference for what each module does: `documentation/frontend/04-utils-and-data.md`,
`documentation/frontend/02-components.md`, `documentation/frontend/03-state-and-api.md`.

## One-time setup (do this if it isn't already present)

1. Install devDeps (in `webdev/frontend`):
   ```
   npm i -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
   ```
2. Add the test block to `vite.config.ts` (Vitest reads the same config):
   ```ts
   /// <reference types="vitest/config" />
   export default defineConfig({
     // ...existing plugins/resolve...
     test: { environment: 'jsdom', globals: true, setupFiles: './src/test/setup.ts' },
   })
   ```
3. Create `src/test/setup.ts`:
   ```ts
   import '@testing-library/jest-dom'
   ```
4. Add scripts to `package.json`:
   ```json
   "test": "vitest run",
   "test:watch": "vitest"
   ```
Run: `npm test` (CI/one-shot) or `npm run test:watch`. Filter: `npm test -- scoring`.

## Test the pure logic first (highest value, no DOM)

These are the priority targets — real exports verified below:

- **`src/utils/scoring.ts`** — `calculateBlockScore(block, answers)`, `calculateTotalScore(blockScores)`,
  `getZone(pct)`, `getZoneColor(zone)`, `buildReport(blocks, answers, userInfo)`. Lock the **zone
  boundaries** exactly (safe ≥80, developing 70–79, warning 65–69, risk <65) — they must stay in sync with
  the backend `tests.scoring_zones`. Test edge values 79/80, 69/70, 64/65.
- **`src/utils/inputGuard.ts`** — `sanitizeText(value, maxLen=600)`, `sanitizeOneLine(value, maxLen=100)`
  (strips `<>`, control chars, collapses spaces), `validateField(value, rule)` → `'required'|'too_short'|'too_long'|null`.
- **`src/utils/cookieConsent.ts`** — `loadConsent`, `saveConsent`, `clearConsent` (cookie round-trip;
  stub `document.cookie`). For `applyMarketingConsent`/`applyAnalyticsConsent`, mock `window.fbq` and the
  Yandex loader and assert they're called only on grant — do NOT let them load real third-party scripts.

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
test wrapper. Assert via roles/text (`getByRole`, `getByText`), bilingual copy comes from i18n.

## Contexts & hooks
- `QuizContext` — recording answers updates scores; `sessionStorage` persistence round-trips
  (`bizcheck_quiz_state_v2`). Render a probe component inside `QuizProvider`.
- `useCtaTarget` / api calls — **mock the api layer**, never hit the network:
  ```ts
  vi.mock('@/api/public', () => ({ publicApi: { getSiteSettings: vi.fn().mockResolvedValue({/*...*/}),
                                                listTests: vi.fn().mockResolvedValue([]) } }))
  ```

## Don't unit-test in jsdom (belongs to e2e/manual)
- **`src/utils/pdfGenerator.ts`** — uses `html2canvas`/`pdf-lib` + real layout/canvas; jsdom can't render
  it. Verify the PDF via the real app (`/verify` or manual), not a unit test.
- Anything depending on actual network, real cookies for third parties, or pixel-accurate layout.

## Conventions & don'ts
- Co-locate `*.test.ts` / `*.test.tsx` next to the source (or `__tests__/`). Use the `@/` alias.
- Mock `api/admin.ts` & `api/public.ts` and `window.fbq`/Yandex — tests must not touch the network or load trackers.
- Keep scoring-zone expectations identical to the backend; if you change one, change both (see `bizcheck-frontend-state-api`).
- Don't add a second framework (jest) — this project standardizes on Vitest (shares the Vite config).
