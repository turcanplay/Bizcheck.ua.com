# Backend — Models

`backend/models/*` — thin data-access classes over raw parameterized SQL (`database/db.py`).
No ORM. Most methods are `@staticmethod`. Table definitions:
[`../architecture/03-data-model.md`](../architecture/03-data-model.md).

## `user.py` → table `users`
`create(username, email, password_hash)`, `find_by_id` (safe fields, no hash),
`find_by_username` / `find_by_email` (include hash, for auth), `find_all`, `count`.

## `test.py` → table `tests`
`create(...)` (default scoring_zones if omitted), `find_by_id`, `find_by_slug`, `find_active`,
`find_all` (ordered by order_index), `update(...)` (COALESCE preserves omitted fields),
`reorder(items)`, `delete`.

## `block.py` → table `blocks`
`create`, `find_by_id`, `find_all`, `find_by_test(test_id)`, `update`, `delete`, `count`.

## `question.py` → table `questions`
`create(... parent_question_id=None)`, `find_by_id`, `find_by_block`,
**`find_by_blocks(block_ids)`** (single batched query via `ANY(%s)`), `find_all`, `update`,
`delete`, `delete_all`, `delete_by_block`, `count`.

## `answer.py` → table `answers`
`create`, **`create_many(question_id, answers_list)`** (bulk insert),
`find_by_id`, `find_by_question`, **`find_by_questions(question_ids)`** (batched), `delete_by_question`, `delete`.

## `submission.py` → table `submissions` · **PII encrypt/decrypt here**
PII fields (`first_name`, `last_name`, `email`, `phone`) auto-encrypt on write
(`encrypt_fields`) and auto-decrypt on read (`decrypt_row`) via `utils/crypto`.
- `create(...)` → returns row **including `submission_token`** (only at create time).
- `update(submission_id, **fields)` — allow-listed fields, re-encrypts PII, returns decrypted row.
- `save_pdf(id, bytes)`, `get_pdf(id)`.
- `find_by_id` (no token, decrypted), `find_all(test_id=None)` (decrypted), `delete`, `delete_all`, `count`.
- Auth helpers: `get_token(id)`, `find_id_by_token(id, token)` (indexed equality → IDOR guard).
- Sales-notify helpers: `claim_sales_notification(id)` (atomic `UPDATE … WHERE sales_notified=FALSE`,
  returns id only on first claim), `set_sales_message(id, msg_id, is_doc)`, `get_sales_message(id)`.

## `result.py` → table `results` (legacy)
`create`, `find_by_id`, `find_by_user`, `find_all` (JOIN users), `count`,
`avg_score_per_block()`, `users_with_scores()`.

## `template.py` → table `templates`
`create`, `find_by_id`, `find_by_slug`, `find_active`, `find_all`, `update` (COALESCE on features), `delete`.

## `template_file.py` → table `template_files`
`create(... pdf_bytes ...)` (returns metadata, **not** the bytes), `find_by_template` (no bytes),
`find_by_id` (includes bytes), `delete`, `delete_by_template`.

## `content.py` → tables `testimonials`, `faq_items`
- **Testimonial**: `create(...)`, **`create_public(name, role, quote, rating, lang)`** (stores quote in the
  matching `quote_ro`/`quote_ru` column, sets `is_active=TRUE`, `is_user_submitted=TRUE`),
  `find_by_id`, `find_active`, `find_all`, `update` (lang via COALESCE), `delete`.
- **FaqItem**: `create`, `find_by_id`, `find_active`, `find_all`, `update`, `delete`.

## `site_settings.py` → table `site_settings`
`get_all()` → `{key: value}`, `get(key, default="")`, `set(key, value)` (UPSERT, idempotent).
