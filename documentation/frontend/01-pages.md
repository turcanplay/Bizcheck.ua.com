# Frontend — Pages

`src/pages/`. Routing in [`00-frontend-overview.md`](00-frontend-overview.md). Components used by
pages: [`02-components.md`](02-components.md). State: [`03-state-and-api.md`](03-state-and-api.md).

## Public pages

### `landing/LandingPage.tsx` — `/`
Marketing homepage. Composed of section components in `landing/sections/`:
`Hero`, `AboutPlatform`, `WhyBizcheck`, `CatalogSection` (+ `TestsShowcase`, `TemplatesShowcase`),
`Testimonials`, `FAQ`, `ReviewForm` (public testimonial submit), `FinalCta`, `Footer`.
CTA buttons resolve their target test via `useCtaTarget` (site-settings → `/test/:slug` or scroll to catalog).

### `QuizApp.tsx` — `/test/:slug`
Orchestrates the quiz SPA across phases (`start` → `quiz` → `cta`), wrapped in `QuizProvider`.
Deep-links to a test by slug. API: `GET /tests`, `GET /blocks/quiz?test=<slug>`,
`POST /submissions`, `PATCH /submissions/{id}` (autosave), `POST /submissions/{id}/pdf`.

- **`StartPage.tsx`** — test picker + company-profile wizard (sector, size, age, revenue).
  Creates the submission.
- **`QuizPage.tsx`** — renders the current question (`QuizQuestion`) + progress (`QuizProgress`);
  next/prev with branching. State via `QuizContext` (no direct API calls).
- **`CtaPage.tsx`** — shows the scored result; delivery by **email** (capture contact →
  `POST /submissions/{id}/send-email`) or **Telegram** (`POST /tg/link/{id}` deep-link). Auto-generates
  the PDF in a hidden DOM and uploads it. Reads `GET /site-settings` for `email_delivery_enabled`.

### `ReportPage.tsx`
Renders the printable report tree (used for preview/PDF). Layout chosen by `test.report_type`:
`standard` → question checklist; `bizcheck`/`premium` → block grid + zones (+ per-block detail for `bizcheck`).
See [`02-components.md`](02-components.md).

### `catalog/TemplateDetailPage.tsx` — `/sablon/:slug`
Legal template detail. Fetches `publicApi.listTemplates()` and finds by slug. Delivery options are UI placeholders.

### `checkout/CheckoutPage.tsx` — `/plata/:kind/:slug`
Payment **placeholder** for a future MAIB integration. No backend yet. Params: `kind` (test/template), `slug`.

### `PrivacyPage.tsx` — `/confidentialitate`
Privacy policy. Placeholder content to be finalized by Crowe Legal.

## Admin pages (`pages/admin/`, all behind `@admin_required`)

### `AdminLayout.tsx`
Container + sidebar. On mount verifies the session via `GET /admin/session`; redirects to login if absent.
Uses `adminApi.*` for all data.

| Route (under `/admin_bizcheck_md_crowe/`) | Component | Manages |
|---|---|---|
| `/` | `AdminDashboard` | Stats (users, blocks, questions, submissions, avg per block) |
| `/tests` | `AdminTests` | Tests CRUD + drag-drop reorder + active toggle |
| `/tests/:slug` | `AdminTestDetail` (+ `AdminTestQuestions`, `AdminTestReports`) | Edit blocks/questions; view reports |
| `/templates` | `AdminTemplates` | Document templates CRUD |
| `/templates/:id` | `AdminTemplateDetail` | Template metadata + attached PDF files |
| `/testimonials` | `AdminTestimonials` | Testimonial cards CRUD |
| `/faq` | `AdminFaq` | FAQ items CRUD (bilingual) |
| `/submissions` | `AdminSubmissions` | View/filter/delete quiz submissions; exports |
| `/users` | `AdminUsers` | Contacts list (name, email, phone, Telegram) |
| `/page-settings` | `AdminPageSettings` | CTA button targets + `email_delivery_enabled` toggle |

`AdminLogin.tsx` — login form → `POST /admin/login` (sets cookies). Login route is outside `AdminLayout`.

**Modals** (forms nested in pages): `AdminTestModal`, `AdminQuestionModal` (options + branching),
`AdminBlockModal`, `AdminTemplateModal`.
