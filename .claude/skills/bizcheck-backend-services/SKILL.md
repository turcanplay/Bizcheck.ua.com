---
name: bizcheck-backend-services
description: Add or change backend business logic and integrations in webdev/backend/services. Use when editing email sending, PDF/Excel export, the sales Telegram notification, the quiz-data assembly, or any *_service.py CRUD/logic module.
---

# BizCheck — Backend Services

**Read first:** `documentation/backend/02-services.md` (every service + its external side effects).

## Where logic lives
Services are the only layer allowed to hold business logic and talk to the outside world
(SMTP, Telegram Bot API, openpyxl). Routes call services; services call models.

## Key modules (see the doc for full signatures)
- `block_service.get_quiz_data` — assembles the bilingual quiz JSON the frontend consumes. If you
  change the quiz shape, update the frontend types/parser too (`bizcheck-frontend-state-api`).
- `email_service` + `email_templates` + `report_email` — report email pipeline (SMTP, async thread).
- `sales_notify.maybe_notify_sales` — fire-once Telegram alert to the sales chat; edits the same message
  on later writes. Guarded by the atomic `submissions.sales_notified` claim — keep it idempotent.
- `export_service` — Excel/ZIP builds; batch-fetch via `Question.find_by_blocks` to avoid N+1.

## Invariants that bite
- External calls (SMTP, Telegram) run in **daemon threads** (fire-and-forget). Keep them non-blocking;
  never let an email/Telegram failure break the request.
- Anything user-supplied that reaches a service must already be sanitized (route layer), but if a service
  newly accepts free text, sanitize there too (`utils/validators`).
- PII is encrypted/decrypted in the **model** layer, not here — read submissions via `models/submission.py`.
- Idempotency: notifications/claims must tolerate retries and concurrent workers (advisory/atomic patterns).

## Recipe — add/extend a service
1. Add a function to the relevant `services/<area>_service.py` (or a new module + import where used).
2. Use models for all DB access; never inline SQL here unless the module already does (rare).
3. For new external integrations, read config from env (document it in `documentation/deployment.md`).
4. Wrap external side effects so failures are logged, not fatal.

## Don'ts
- Don't read/write PII columns with raw SQL — go through the model (skips Fernet otherwise).
- Don't block the request thread on SMTP/Telegram.
- Don't duplicate the sales-notify fire-once logic; reuse `maybe_notify_sales`.
