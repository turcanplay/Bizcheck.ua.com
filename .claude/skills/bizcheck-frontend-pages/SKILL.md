---
name: bizcheck-frontend-pages
description: Add or change a React page or route in webdev/frontend. Use when editing landing sections, the quiz/report flow pages, admin panel pages, routing in App.tsx, or wiring a page to the API.
---

# BizCheck — Frontend Pages & Routing

**Read first:** `documentation/frontend/01-pages.md` and `documentation/frontend/00-frontend-overview.md`
(provider stack + route table).

## Surfaces (one bundle, split by route)
- Marketing: `pages/landing/` (+ `sections/`), `/`.
- Quiz/report flow: `pages/QuizApp.tsx` (phases start→quiz→cta), `/test/:slug`, wrapped in `QuizProvider`.
- Admin: `pages/admin/`, `/admin_bizcheck_md_crowe/*`, behind `@admin_required`.

## Invariants that bite
- Keep the obscured admin path `/admin_bizcheck_md_crowe/` exactly.
- Public pages use `publicApi` (`api/public.ts`); admin pages use `adminApi` (`api/admin.ts`, auto cookie+CSRF).
  Never store a session token in `localStorage`.
- All user-facing text is bilingual via `LanguageContext` `t()` / `tList()` — add keys in
  `i18n/translations.ts` (ro **and** ru), don't hardcode strings.
- Heavy pages are lazy-loaded in `App.tsx`; keep new big pages lazy. The landing page stays eager.
- Quiz/report state lives in `QuizContext` — read/write it there, don't add parallel local state.

## Recipe — add a page
1. Create the component under `pages/<area>/`.
2. Register the route in `App.tsx` (lazy import if non-trivial); add nested admin routes under `AdminLayout`.
3. Fetch data via `publicApi`/`adminApi`; add a method there if the endpoint is new (`bizcheck-frontend-state-api`).
4. Add translation keys (ro+ru); add SEO via `components/seo/Seo.tsx` for public pages.
5. If the page is a new static public route, add it to `scripts/generate-static-html.mjs` + the sitemap script.

## Don'ts
- Don't hardcode user-visible copy (use i18n) or call `fetch` directly (use the api/ layer).
- Don't expose admin routes/data on public surfaces.
