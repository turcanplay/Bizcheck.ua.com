# Backend — Services

`backend/services/*` — business logic and external integrations. Called by routes,
operate through models. External side effects (SMTP, Telegram API, PDF/Excel) noted explicitly.

## `auth_service.py` — auth + JWT
- `hash_password` / `verify_password` — bcrypt (12 rounds).
- `generate_access_token(user_id)` (15 min), `generate_refresh_token(user_id)` (7 days),
  `generate_admin_token()` (`role=admin`, 8 h).
- `register_user`, `login_user`, `refresh_access_token` — legacy user flow.
- `login_admin(username, password)` — constant-time (`hmac.compare_digest`) compare against
  `ADMIN_USERNAME`/`ADMIN_PASSWORD` env; returns admin JWT. Raises if creds unset (fails closed).

## `admin_service.py` — dashboard
- `get_stats()` → counts (users, blocks, questions, results, submissions) + `avg_per_block`.
- `get_users_with_scores()` → users + total_attempts + avg_score.
- `_serialize_decimals` — recursively casts `Decimal` → `float` for JSON.

## `block_service.py` — blocks + quiz assembly
- `get_all_blocks(test_id=None)`, `create_block`, `update_block`, `delete_block` — CRUD (DB).
- **`get_quiz_data(test_slug=None, test_id=None)`** — builds the full quiz JSON the frontend
  consumes: `{blocks, test}` with bilingual question text/notes and answer options
  (`label_uk/en`, `score`, `next_question_id`). Question keys `b{block}q{q}`, answer keys `a{id}`.

## `question_service.py` — questions
- `get_questions_by_block`, `get_all_questions` — fetch with nested answers.
- `create_question` / `update_question` — require ≥2 answers; manage answers via `Answer.create_many`.
- `delete_question`, `delete_all_questions`.

## `test_service.py` — tests
- `list_active_tests`, `list_all_tests`, `get_test_by_slug`, `get_test_by_id`.
- `create_test` — auto-slug if omitted; default `scoring_zones {safe:80, developing:70, warn:65, risk:0}`;
  validates slug uniqueness, price, `report_type` ∈ {bizcheck, standard, premium, gdpr}.
- `update_test`, `reorder_tests(items)`, `delete_test`.

## `submission_service.py` — submissions
- `create_submission(...)` — partial submission; resolves test by id or slug; **encrypts PII**.
- `update_submission(id, data)` — company info / answers / scores / status / contact;
  auto-JSONifies `answers_json`, `block_scores_json`, `selected_answers_json`; **encrypts PII**.
- `save_submission_pdf(id, bytes)`; `get_submission_pdf(id)`.
- `get_all_submissions(test_id=None)`, `get_submission_detail(id)` — **decrypt PII**.
- `delete_submission`, `delete_all_submissions`.

## `result_service.py` — legacy results
- `save_result` (validates `0 ≤ score ≤ total_questions`), `get_user_results`, `get_all_results`.

## `template_service.py` — document templates + files
- `list_active_templates`, `list_all_templates`, `get_template_with_files(id)`.
- `create_template` (auto-slug, validates slug uniqueness + price), `update_template`, `delete_template`.
- `add_file(id, filename, pdf_bytes)` — validates `%PDF` magic bytes, sanitizes filename.
- `delete_file`, `get_file_raw(id)`, `iter_template_files_raw(id)` (generator for ZIP).

## `email_service.py` — SMTP delivery · **external: SMTP**
- SMTP over Office 365 STARTTLS. Config: `SMTP_HOST` (def `smtp.office365.com`), `SMTP_PORT` (587),
  `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM_NAME`, `SMTP_REPLY_TO`, `EMAIL_LOGO_URL`.
- `send_report_email_sync(to_email, first_name, lang, test_name, date_str, score, pdf_bytes, …)`
  → bool. Renders multipart HTML+text with inline `cid:` logo (fetched + cached), attaches PDF.
- `send_report_email_async(...)` — fire-and-forget daemon thread wrapper.

## `email_templates.py` — bilingual email rendering
- `render(lang, first_name, test_name, date_str, score, logo_url, download_url, …)`
  → `(subject, html_body, text_body)`. Brand palette + score ring + zone label + CTA button
  (Outlook VML + anchor fallback). UK/EN, with a fallback to the other language when one translation is blank.

## `report_email.py` — orchestrates report email
- `dispatch_report_email(sub_id)` → `(ok, reason)`. Validates email present + PDF ready, builds the
  download link (`PUBLIC_BASE_URL` + submission_token), calls `send_report_email_async`. Reasons:
  `not_found`, `no_email`, `pdf_not_ready`, `error`, `ok`. Called from both web send-email and `/tg/email`.

## `sales_notify.py` — sales-team Telegram alert · **external: Telegram Bot API**
- `maybe_notify_sales(submission_id)` — fire-and-forget daemon thread. On the **first** complete lead
  (name + contact) sends a Telegram message/document to the sales chat; later writes **edit** the same
  message in place. Atomic fire-once via `submissions.sales_notified` claim. Separate bot from the
  web-flow bot; shares its token with `groupbot`, but only ever **sends**, so there is no
  `getUpdates` conflict.
- Destination: `SALES_CHAT_ID` **wins whenever set**, otherwise the chat bound at runtime via the
  group bot's `/register` (stored in `site_settings`). Neither → `_configured()` is false and the
  notification is skipped silently. `SALES_TOPIC_ID`, when set, pins every lead to one forum topic
  and overrides the per-test topic. A dead topic id is cleared on fallback, so the next lead
  creates a fresh one.
- Also emits a delivery-failure alert to the same chat — see
  [`../telegram/04-alerta-esec-livrare.md`](../telegram/04-alerta-esec-livrare.md).

## `export_service.py` — Excel/ZIP exports · **CPU: openpyxl**
- `build_test_combined_workbook(test_id)` → multi-sheet `Workbook` (summary + per-user).
- `build_single_user_workbook(submission_id)` → `(Workbook, filename_stem)`.
- `workbook_to_bytes(wb)`; `build_excels_zip_for_test(test_id)`.
- `build_pdfs_zip_for_test(test_id, max_bytes=None, *, dest_dir=None, on_progress=None)` — streams each
  submission's `pdf_data` into a temp file **inside** `dest_dir`, so the final `os.replace` is an
  atomic same-filesystem rename instead of copying a multi-GB archive.
- Batch-fetches questions via `Question.find_by_blocks` to avoid N+1.

## `export_jobs.py` — background PDF-ZIP jobs
- Wraps `build_pdfs_zip_for_test` in a queued background job so no request holds a gunicorn worker
  for the whole build. State (`state.json`) and the archive live under `EXPORT_SPOOL_DIR/<token>/`
  on a shared volume — the filesystem, not a module-level dict, because gunicorn runs 4 separate
  worker processes.
- One daemon worker thread per process drains a bounded `queue.Queue`; overflow raises `JobQueueFull`
  (→ 503). Creating a job for a test that already has one queued/running returns the existing job.
- `sweep()` runs inline on create/status/download and enforces the ready / downloaded / failed /
  stale TTLs. There is no cron.
- Endpoints: see [`01-routes.md`](01-routes.md). Excel exports are deliberately left synchronous.
