# Frontend — Pages

`src/pages/`. Routing in [`00-frontend-overview.md`](00-frontend-overview.md). Components used by
pages: [`02-components.md`](02-components.md). State: [`03-state-and-api.md`](03-state-and-api.md).

## Public pages

### `landing/LandingPage.tsx` — `/`
Marketing homepage. Composed of section components in `landing/sections/`:
`Hero`, `CroweIntro`, `AboutPlatform`, `WhyBizcheck`, `CatalogSection` (+ `TestsShowcase`, `TemplatesShowcase`),
`Testimonials`, `FAQ`, `FinalCta`, `Footer`.
CTA buttons resolve their target test via `useCtaTarget` (site-settings → `/:lang/test/:slug` or scroll to catalog).

#### `CroweIntro` — who is behind BizCheck

**File**: `webdev/frontend/src/pages/landing/sections/CroweIntro.tsx:135` (main export) + `CroweIntro.css` (styles).

Two partner cards side by side (stacks to one column on mobile < 768px). Each card shows: photo, caption overlay (name + role), bio text, two call-to-action buttons. The section appears after Hero and before AboutPlatform.

**Structure**:
- Header: eyebrow label (`croweEyebrow`), title (`croweTitle`), two intro paragraphs (`croweBody1`, `croweBody2`), CTA hint (`croweCtaHint`).
- Partner 1 (Ukraine): `dmytro-mykhailenko.png` (800×750), name/role/bio from `croweUaName`, `croweUaRole`, `croweUaBio`. Two buttons: Crowe Mikhailenko (gold tone, `CROWE_GLOBAL_URL` + Crowe logo preview) and Mikhailenko personal site (solid tone, `MIKHAILENKO_URL`).
- Partner 2 (Moldova): `ivan-turcan-bust.png` (800×750), name/role/bio from `croweName`, `croweRole`, `croweMdBio`. Two buttons: Crowe Turcan Mikhailenko (gold tone, `CROWE_MOLDOVA_URL` + Crowe logo preview) and personal site (solid tone, `TURCAN_URL` + preview image).

**Button labels** (via `config/contact.ts:36-54`):
- `croweBtnCrowe` — "Crowe Mikhailenko" / "Crowe Mikhailenko" (gold button, shared on both partner cards)
- `croweBtnMikhailenko` — "Mikhailenko" (solid button, Ukraine card only)
- `croweBtnTurcan` — "Іван Цуркан" / "Ivan Turcan" (solid button, Moldova card only)
- `croweBtnCroweTm` — "Crowe Turcan Mikhailenko" (gold button, Moldova card only)
- `croweVisitHint` — screen-reader text for all buttons

**URLs** (from `config/contact.ts`):
- `CROWE_GLOBAL_URL` = `https://www.crowe.com/ua/crowemikhailenko`
- `MIKHAILENKO_URL` = `https://www.mikhailenko.com.ua/`
- `CROWE_MOLDOVA_URL` = `https://www.crowe.com/ua/crowemikhailenko/en-gb/moldova/`
- `TURCAN_URL` = `https://turcan.md`

**Images** (in `public/images/about/`):
- `dmytro-mykhailenko.png` — Ukraine partner bust (800×750, scaled ~2.4× from 252×277 original, soft edges at bottom due to shoulder crop).
- `ivan-turcan-bust.png` — Moldova partner bust (800×750, same canvas size for alignment).
- `turcan-preview.jpg` — hover preview for Moldova partner's personal site link (16:10 aspect ratio).
- ~~`ivan-turcan.png`~~ (800×1200) — **deprecated**; replaced by `ivan-turcan-bust.png`. Left on disk but not used.

**Styling** (see `CroweIntro.css:29-112`):
- Photos are rendered edge-to-edge inside a 800:750 aspect-ratio backdrop panel with rounded corners and subtle gradient.
- Caption plaque (name + role) overlays the photo bottom edge using `margin-top: -34px` to hide the crop line.
- Both busts are on the **same canvas size** (800×750) and sit at the same height, so no min-height forcing is needed for equal-width columns.
- Hover previews (pointer devices only): left-anchored on Ukraine card, right-anchored on Moldova card to avoid viewport edges.
- Scroll reveal: staggered animation (intro → Ukraine +100ms → Moldova +200ms).

**Responsive** (`CroweIntro.css:418-466`):
- Shrinks padding and typography as viewport narrows.
- At 768px and below: two-column grid → single column (max-width 460px, centered).
- On phones (560px), photo box narrows to 340px; at 375px, further to 280px.
- Caption margin-top adjusted to maintain alignment at smaller scales.

**Translations** (from `i18n/translations.ts:791-829`):
All keys use the `crowe` prefix and are bilingual (UK/EN). See the full list at `webdev/frontend/src/i18n/translations.ts:794-829`.

### `QuizApp.tsx` — `/:lang/test/:slug`
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

### `catalog/TemplateDetailPage.tsx` — `/:lang/templates/:slug`
Legal template detail. Fetches `publicApi.listTemplates()` and finds by slug. Delivery options are UI placeholders.

### `checkout/CheckoutPage.tsx` — `/:lang/checkout/:kind/:slug`
Payment **placeholder** for a future MAIB integration. No backend yet. Params: `kind` (test/template), `slug`.

### `PrivacyPage.tsx` — `/:lang/privacy`
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
