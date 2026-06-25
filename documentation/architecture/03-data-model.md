# Architecture — Data Model

PostgreSQL schema for `webdev/`. Single source of truth: `backend/database/db.py`
`migrate()`, which runs on every boot. Model access layer:
[`../backend/03-models.md`](../backend/03-models.md).

## Migration strategy

- `migrate()` is **idempotent**: `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE … ADD COLUMN IF NOT EXISTS`.
- Runs at every backend boot; `pg_advisory_xact_lock(1)` serializes concurrent worker boots.
- **To add a column:** append an `ALTER … ADD COLUMN IF NOT EXISTS` inside the `migrate()` block.
  Do **not** create a migrations folder. Do **not** drop columns here (drops aren't idempotent across replicas).
- Two idempotent data backfills live in `migrate()`: re-marking legacy tests as `report_type='bizcheck'`
  (only when no bizcheck row exists yet) and adding the `risk` threshold to `scoring_zones` rows missing it.

## Entity relationships

```
tests ──< blocks ──< questions ──< answers
  │                     │  └─ parent_question_id ─┐ (self-ref, branching sub-questions)
  │                     └──────────────────────────┘
  └──< submissions          answers.next_question_id ─→ questions (branching target)

users ──< results            templates ──< template_files
testimonials   faq_items   site_settings   (standalone)
```

## Tables

### `tests` — a diagnostic quiz definition
Key columns: `id`, `slug` (unique), `name_ro/ru`, `description_ro/ru`,
`scoring_zones` JSONB (default `{safe:80, developing:70, warn:65, risk:0}`),
`zone_recommendations` JSONB, `is_active`, `is_coming_soon`, `is_paid`, `price`, `currency` (def `MDL`),
`category`, `features` JSONB, **`report_type`** VARCHAR(32) (def `bizcheck`), `order_index`, `created_at`.
`report_type` ∈ {`bizcheck`, `standard`, `premium`} selects the report layout (see below).
Indexes: slug, is_active, category.

### `blocks` — a section of a test
`id`, `test_id` FK→tests (CASCADE), `title_ro/ru`, `order_index`, `created_at`. Index: test_id.

### `questions` — one question inside a block
`id`, `block_id` FK→blocks (CASCADE), **`parent_question_id`** FK→questions (SET NULL) for branching
sub-questions, `text_ro/ru`, `note_ro/ru`, `purpose_ro/ru`, `example_ro/ru`, `order_index`, `created_at`.
Indexes: block_id, parent_question_id.

### `answers` — an option for a question
`id`, `question_id` FK→questions (CASCADE), **`next_question_id`** FK→questions (SET NULL) for branching,
`text_ro/ru`, `score` REAL, `explanation_ro/ru`, `risk_ro/ru`, `created_at`. Index: question_id.

### `submissions` — one person's quiz run (the core public-flow table)
- PII (Fernet ciphertext, nullable — collected after the quiz): `first_name`, `last_name`, `email`, `phone`.
- Company profile: `sector`, `company_size`, `company_age`, `company_revenue`, `language` (def `ro`).
- Results: `total_score` REAL, `answers_json`, `selected_answers_json`, `block_scores_json` (all JSONB),
  `pdf_data` BYTEA, `status` (def `started`), `consent`.
- Auth: **`submission_token`** VARCHAR(64) (opaque per-row token; unique partial index). IDOR guard.
- Telegram delivery: `tg_token`(64)+`tg_token_expires` (deep-link, 24h TTL), `tg_chat_id`,
  `tg_username`, `tg_first_name`, `tg_last_name`.
- Sales notify: `sales_notified` (fire-once atomic guard), `sales_msg_id`, `sales_msg_is_doc`
  (so later contact info edits the same Telegram message).
- Payment columns (`is_paid`, `paid_at`, `payment_provider`, `payment_ref`) are **reserved/unused**.
- `test_id` FK→tests, `created_at`. Indexes: test_id, tg_token, tg_chat_id, unique(submission_token).

### `users` + `results` — legacy registered-user system
- `users`: `id`, `username` (unique), `email` (unique), `password_hash`, payment columns (reserved/unused), `created_at`.
- `results`: `id`, `user_id` FK→users (CASCADE), `block_id`, `score`, `total_questions`, `completed_at`.
  Records quiz attempts for registered users (separate from `submissions`).

### `templates` + `template_files` — downloadable legal document templates
- `templates`: `id`, `slug` (unique), `title_ro/ru`, `description_ro/ru`, `is_active`,
  `is_coming_soon`, `is_paid`, `price`, `currency`, `category`, `features` JSONB, `created_at`.
- `template_files`: `id`, `template_id` FK→templates (CASCADE), `filename`, `pdf_data` BYTEA,
  `file_size`, `order_index`, `created_at`.

### `testimonials` — landing-page reviews
`id`, `name`, `role`, `quote_ro/ru`, `rating` NUMERIC(2,1) (half-stars allowed, def 5),
`avatar_url`, `order_index`, `is_active`, **`lang`** (single language a public review was written in),
**`is_user_submitted`** (public vs admin-curated), `created_at`. Index: is_active.

### `faq_items` — landing-page FAQ
`id`, `question_ro/ru`, `answer_ro/ru`, `order_index`, `is_active`, `created_at`. Index: is_active.

### `site_settings` — editable page config (key/value)
`setting_key` PK, `setting_value`, `updated_at`. Holds CTA button target test slugs
(`cta_hero_test`, `cta_about_test`, `cta_final_test`, `cta_catalog_test`) and feature flags
(`email_delivery_enabled`). Admin-managed via `/admin/site-settings`.

## Report layout types (`tests.report_type`)

| Value | Layout |
|---|---|
| `bizcheck` | Cover + block grid + zone sections + **per-block detail pages** (explanations, risks, actions, regulatory links). |
| `standard` | Per-**question** checklist (pass/fail per question, ~5 per A4 page). |
| `premium` | Short: cover + block grid + zone sections only. |

The frontend picks the React component tree from this column — see
[`../frontend/02-components.md`](../frontend/02-components.md).
