# Frontend — State (Contexts) & API Layer

## Contexts (`src/context/`)

### `QuizContext.tsx` — the quiz/report state machine
Holds: `blocks` (parsed test structure), `phase` (`start|quiz|cta`), `selectedTestSlug`,
navigation (`currentBlock`, `currentQuestion`, `currentQuestionIndex`), `answers` (questionId→score),
`selectedKeys` (questionId→chosen option key), `userInfo` (name/email/phone/consent + sector/size/age/revenue),
`report` (`ReportData`), `submissionId` + `submissionToken`, `tests`, dropdown lists
(`sectors/sizes/ages/revenues`), `loading`.
Methods: `selectTest`, `setPhase`, `setUserInfo`, `recordAnswer`, `nextQuestion`, `prevQuestion`,
`goToBlock`, `generateReport`, `restartQuiz`, `createSubmission`, `updateSubmission`.
**Persistence**: mirrors state to `sessionStorage` (`bizcheck_quiz_state_v2`) for reload recovery.

### `LanguageContext.tsx` — i18n
Holds `lang` (`ro`|`ru`, persisted in `localStorage`). Methods: `setLang`, `t(key, params?)`
(lookup + interpolation), `tList(key)` (translated array for dropdowns). Translations in
`i18n/translations.ts` (see [`04-utils-and-data.md`](04-utils-and-data.md)).

### `CookieConsentContext.tsx` — consent
Holds `consent {analytics, marketing}`, `bannerVisible`, `hasDecided`. Methods: `acceptAll`,
`rejectAll`, `saveCustom(c)`, `reopen()`. Persists to `localStorage` and applies third-party consents
(Meta Pixel, Yandex Metrica) via `utils/cookieConsent.ts`.

## Hook — `hooks/useCtaTarget.ts`
Resolves a landing CTA key (`cta_hero_test`, etc.) to a `CtaTarget`:
`{kind:'route', to}` (→ `/test/:slug` if free, `/plata/test/:slug` if paid) or `{kind:'scroll'}`
(when the configured test is missing/inactive → scroll to catalog). Fetches site-settings + active
tests once and caches the promise at module level (shared across CTA buttons).

## API layer (`src/api/`)

### `admin.ts` — authenticated admin client
- Auth: JWT lives in the httpOnly `admin_session` cookie (sent automatically with `credentials`);
  the CSRF token is read from the `admin_csrf` cookie and echoed in the `X-CSRF-Token` header on every
  unsafe method (double-submit). **No token in `localStorage`.**
- Helpers: `adminFetch(input, init)` (binary responses: PDF/ZIP/XLSX; injects credentials+CSRF),
  `readCsrfToken()`, `hasAdminSessionHint()`.
- **`adminApi`** wraps every admin endpoint:
  - Auth: `login`, `session`, `logout`.
  - Dashboard: `stats`.
  - Tests: `listTests`, `createTest`, `updateTest`, `deleteTest`, `reorderTests`.
  - Blocks: `listBlocks`, `createBlock`, `updateBlock`, `deleteBlock`.
  - Questions: `listQuestions`, `createQuestion`, `updateQuestion`, `deleteQuestion`, `reorderQuestions`.
  - Submissions: `listSubmissions`, `deleteSubmission`, `deleteAllSubmissions` (+ export URL helpers).
  - Users: `listUsers`.
  - Templates: `listTemplates`, `getTemplate`, `createTemplate`, `updateTemplate`, `deleteTemplate`,
    `uploadTemplateFile`, `deleteTemplateFile`, `templateFileDownloadUrl`, `templateZipDownloadUrl`.
  - Testimonials: `listTestimonials`, `createTestimonial`, `updateTestimonial`, `deleteTestimonial`.
  - FAQ: `listFaq`, `createFaq`, `updateFaq`, `deleteFaq`.
  - Site settings: `getSiteSettings`, `updateSiteSettings`.

### `public.ts` — unauthenticated public client
- Helpers `getJson<T>` / `postJson<T>`. Submission-scoped calls send `X-Submission-Token`.
- **`publicApi`**: `listTests`, `listTemplates`, `listTestimonials`, `submitTestimonial(data)`,
  `listFaq`, `getSiteSettings`.
- The quiz flow's submission calls (create/patch/pdf/send-email/tg-link) are made from `QuizContext`/
  `CtaPage` using the submission token returned at create.
