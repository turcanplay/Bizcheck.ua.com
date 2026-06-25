---
name: bizcheck-frontend-state-api
description: Work on frontend state or the API client in webdev/frontend. Use when editing QuizContext/LanguageContext/CookieConsentContext, the admin/public API wrappers, the useCtaTarget hook, scoring, the client PDF generator, or i18n/types.
---

# BizCheck — Frontend State & API

**Read first:** `documentation/frontend/03-state-and-api.md` and `documentation/frontend/04-utils-and-data.md`.

## Contexts (`src/context/`)
- `QuizContext` — the quiz/report state machine (blocks, phase, answers, userInfo, report,
  submissionId/Token, tests, dropdowns). Persists to `sessionStorage` (`bizcheck_quiz_state_v2`).
  All quiz reads/writes go here.
- `LanguageContext` — `lang` (ro/ru, in `localStorage`) + `t()` / `tList()`.
- `CookieConsentContext` — consent state; applies Meta Pixel / Yandex Metrica via `utils/cookieConsent.ts`.

## API layer (`src/api/`) — use it, don't raw-`fetch`
- `admin.ts` (`adminApi`, `adminFetch`): JWT in httpOnly `admin_session` cookie + `X-CSRF-Token` from
  the `admin_csrf` cookie auto-injected on unsafe methods. **No token in `localStorage`.**
- `public.ts` (`publicApi`): unauthenticated; submission-scoped calls send `X-Submission-Token`.
- Base URL from `config/api.ts` (`VITE_API_URL` || `/api_crowe_bizcheck`).

## Invariants that bite
- If the backend quiz JSON shape changes (`block_service.get_quiz_data`), update `types/index.ts` and the
  `QuizContext` parser together.
- Scoring zones in `utils/scoring.ts` must match the backend `tests.scoring_zones` defaults.
- The submission token is returned **once** at create — store it in context and reuse for
  PATCH/PDF/send-email/tg-link; never refetch it.
- Add new endpoints as methods on `adminApi`/`publicApi`, not ad-hoc `fetch` in components.

## Recipe — wire a new endpoint to the UI
1. Add a method to `api/admin.ts` or `api/public.ts`.
2. Expose it through the relevant context if it feeds shared state; otherwise call from the page.
3. Add/extend `types/index.ts`. Add i18n keys for any new copy.

## Don'ts
- Don't bypass the api/ layer or persist session tokens in `localStorage`.
- Don't keep quiz state outside `QuizContext`.
