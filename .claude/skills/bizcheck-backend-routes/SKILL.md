---
name: bizcheck-backend-routes
description: Add or change a Flask API endpoint in webdev/backend. Use when creating/editing a route, blueprint, or HTTP handler under webdev/backend/routes/, wiring a new endpoint to a service, or adjusting an endpoint's auth or rate limit.
---

# BizCheck — Backend Routes

**Read first:** `documentation/backend/01-routes.md` (full endpoint table) and
`documentation/backend/00-backend-overview.md` (how `server.py` wires blueprints).

## Layering (never skip a layer)
`routes/` parses the request + enforces auth + calls a **service**; the service holds logic and calls
**models**; models issue SQL. Do not put SQL or business logic in a route.

## Invariants that bite
- API base prefix is `/api_crowe_bizcheck/` (obscured, intentional — do not "normalize").
- Pick the right auth decorator (see `bizcheck-auth-security`):
  - `@admin_required` — admin-only (cookie + CSRF).
  - `@submission_owner_or_admin` — public submission writer OR admin (token via `X-Submission-Token`).
  - public — no decorator.
  - `@auth_required` (Bearer) is **legacy**; do not use it for new public/admin endpoints.
- Every free-text field from the request must pass `utils/validators.clean_text`/`clean_optional`;
  slugs via `clean_slug`. Never hand raw user strings to a service/model.
- Wrong-token vs unknown-id must both return **403** (no enumeration); missing token → **401**.

## Recipe — add an endpoint
1. Add/extend the blueprint in `webdev/backend/routes/<area>.py`. Use an existing route in that file as the pattern.
2. Validate/sanitize every input field at the top of the handler.
3. Call a function in `webdev/backend/services/<area>_service.py` (create it there if logic is new).
4. If the blueprint is new, register it in `webdev/backend/server.py` (`app.register_blueprint(...)`)
   and add a rate limit next to the others (`limiter.limit(...)(<bp>)`).
5. Return JSON (or a binary response for PDF/XLSX/ZIP). Use the existing error-shape `{ "error": ... }`.
6. Add/extend a test in `webdev/backend/tests/test_unit_security.py` (no DB needed).

## Don'ts
- Don't add a Bearer-token path for admin auth.
- Don't expose new admin data on a public blueprint.
- Don't bypass the service/model layers with inline SQL in a route.
