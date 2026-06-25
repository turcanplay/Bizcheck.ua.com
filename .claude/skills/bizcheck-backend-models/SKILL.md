---
name: bizcheck-backend-models
description: Add or change data-access model classes in webdev/backend/models. Use when writing SQL queries, model methods (create/find/update/delete), batch queries, or anything touching the submissions PII encrypt/decrypt path.
---

# BizCheck — Backend Models

**Read first:** `documentation/backend/03-models.md` (every model + method) and
`documentation/architecture/03-data-model.md` (the table definitions).

## What models are
Thin classes over **raw parameterized SQL** (no ORM), using helpers in `database/db.py`
(`query`, `execute`, `execute_many`). Most methods are `@staticmethod`.

## Invariants that bite
- **Always parameterize** (`%s` + params tuple). Never string-format user values into SQL.
- **PII (`first_name`, `last_name`, `email`, `phone` on `submissions`)** must go through
  `utils/crypto.encrypt_fields` on write and `decrypt_row`/`decrypt_rows` on read. `models/submission.py`
  is the reference — mirror it. Raw SELECTs return ciphertext.
- `submission_token` is returned **only** by `Submission.create`; never expose it in `find_by_id`/`find_all`.
- Token checks use indexed equality (`find_id_by_token`) — keep IDOR-safe lookups intact.
- Batch over loops: use `find_by_blocks` / `find_by_questions` (`ANY(%s)`) patterns instead of N+1.

## Recipe — add a model method
1. Add a `@staticmethod` to the relevant `models/<entity>.py`, following the file's existing style.
2. Use `db.query(..., fetch_one/fetch_all/commit)` or `db.execute(...)`.
3. For a PII-bearing table, encrypt before write / decrypt after read.
4. If you need a new column, add it idempotently in `migrate()` (see `bizcheck-database`) — not via a model.

## Don'ts
- Don't introduce an ORM or build SQL by string concatenation of user input.
- Don't leak `submission_token`, `password_hash`, or raw `pdf_data` in list endpoints.
- Don't skip decryption by querying PII columns directly from a service/route.
