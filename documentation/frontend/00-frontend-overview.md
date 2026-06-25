# Frontend — Overview

React 19 + TypeScript + Vite SPA in `webdev/frontend/`. One bundle serves the marketing site,
the quiz/report flow, and the admin panel — split by route, with heavy bundles lazy-loaded.

```
src/
  main.tsx          mounts <App/> in StrictMode
  App.tsx           providers + React Router route table
  api/              admin.ts (auth'd) + public.ts (public)           → 03-state-and-api.md
  config/api.ts     API base URL
  context/          QuizContext, LanguageContext, CookieConsentContext → 03-state-and-api.md
  hooks/            useCtaTarget.ts
  pages/            landing/, admin/, catalog/, checkout/, quiz/report pages → 01-pages.md
  components/        quiz/, report/, layout/, seo/, ui/                → 02-components.md
  utils/            scoring, pdfGenerator, cookieConsent, inputGuard   → 04-utils-and-data.md
  data/             blockExplanations.ts                              → 04-utils-and-data.md
  i18n/             translations.ts (ro/ru)                           → 04-utils-and-data.md
  types/index.ts    shared TS types                                   → 04-utils-and-data.md
  styles/           variables.css, App.css, index.css
```

## Provider stack (`App.tsx`, outer→inner)

`HelmetProvider` → `LanguageProvider` → `CookieConsentProvider` → `BrowserRouter`
→ `ChunkReloadBoundary` (reloads once on stale-chunk errors after a deploy) → `Suspense`.

## Route table

| Path | Component | Notes |
|---|---|---|
| `/` (and `*` fallback) | `LandingPage` | Marketing homepage (eager-loaded) |
| `/test/:slug` | `QuizApp` (wrapped in `QuizProvider`) | Quiz/report flow (lazy) |
| `/sablon/:slug` | `TemplateDetailPage` | Legal template detail (lazy) |
| `/plata/:kind/:slug` | `CheckoutPage` | Payment placeholder (MAIB, lazy) |
| `/confidentialitate` | `PrivacyPage` | Privacy policy |
| `/admin_bizcheck_md_crowe/login` | `AdminLogin` | Admin login |
| `/admin_bizcheck_md_crowe/*` | `AdminLayout` + nested routes | Admin panel (lazy) |

`CookieBanner` renders on all non-admin routes.

## Config (`config/api.ts`)

```ts
export const API_BASE = import.meta.env.VITE_API_URL || '/api_crowe_bizcheck';
```
Default relative path → dev Vite proxy / prod nginx proxy. Override with `VITE_API_URL`.

## Build tooling

- **`vite.config.ts`** — `@vitejs/plugin-react-swc`; alias `@`→`./src`; dev proxy `/api`→`localhost:4001`;
  prod build `sourcemap:false`, manual chunks `react-vendor` (react/router/dom) and
  `pdf-vendor` (html2canvas-pro/jspdf/pdf-lib, lazy at report time).
- **`package.json` scripts**: `dev`; `prebuild` → `generate-sitemap.mjs`;
  `build` → `tsc -b && vite build && generate-static-html.mjs`; `lint`; `preview`.
- **`scripts/generate-sitemap.mjs`** — hits the live API for `/tests` and `/templates` slugs →
  `public/sitemap.xml` (falls back to existing file if API offline). Env `SITEMAP_BASE_URL`, `SITEMAP_API_URL`.
- **`scripts/generate-static-html.mjs`** — writes per-route `index.html` with injected meta for
  static routes (e.g. `/confidentialitate`) so crawlers get tags before JS; nginx `try_files` serves them.

Full deploy/build details (Dockerfiles, env): [`../deployment.md`](../deployment.md).
