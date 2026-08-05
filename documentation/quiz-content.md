# Quiz Content — Import, Branching, and Data Model

This document covers three critical aspects of quiz authoring and importing:

1. **The import script** — how to load an entire test (blocks → questions → answers) programmatically
2. **Branching model** — how sub-questions work and the trap that breaks them silently
3. **API payload naming** — why the write and read endpoints use different field names

## Part 1: Import Script (`import_test_content.py`)

### What it does

`webdev/backend/scripts/import_test_content.py` is the programmatic equivalent of typing a test into the admin panel. It loads a single JSON file and creates a complete test hierarchy (blocks → questions → answers) by making HTTP calls to the admin API, never touching the database directly.

### Why via HTTP, not SQL?

A direct SQL INSERT would bypass:
- **Sanitization** — every string passes `clean_authored` / `clean_authored_optional`, stripping HTML and control characters. Downstream consumers (PDF report, Excel export, Telegram messages) do not escape on render; raw text would appear as-is or corrupt the output.
- **Validation** — slug regex, canonical `report_type` set (from `services/test_service.py:CANONICAL_REPORT_TYPES`), "at least 2 answers per question", `clean_int` on all IDs, `_clean_score` on weights.
- **Cache invalidation** — `invalidate_quiz_cache()` fires inside the services. A direct INSERT leaves the public `/blocks/quiz` endpoint serving stale data until the next restart.
- **Auth model** — the script uses the same admin cookie + CSRF double-submit that the admin SPA uses (no Bearer token fallback).

See `webdev/backend/scripts/import_test_content.py:10-31` for the full explanation.

### Two-pass architecture

**Pass 1**: Create test → blocks → all questions with `parent_question_id: null` and all `next_question_id: null`. Remember the mapping from logical ref → database id.

**Pass 2**: Update only the questions that carry links (`parent_ref` or `next_ref`), now that every reference resolves to a real id.

Why two passes? Branching references are forward-looking: an answer on question 1 can jump to question 7, which does not exist yet when question 1 is created.

See `webdev/backend/scripts/import_test_content.py:33-52` for details.

### Running the script

The backend is `expose: 4001` (no `ports:`), so it is not accessible from the host. The script must run **inside the backend container**.

```bash
# Validate the JSON without network or credentials
docker compose exec backend python scripts/import_test_content.py \
  --json path/to/content.json --dry-run

# Actually import (requires credentials)
docker compose exec backend bash -c \
  'ADMIN_USERNAME=admin ADMIN_PASSWORD=<password> \
   python scripts/import_test_content.py --json path/to/content.json'

# With --replace (deletes the existing test first)
docker compose exec backend bash -c \
  'ADMIN_USERNAME=admin ADMIN_PASSWORD=<password> \
   python scripts/import_test_content.py --json path/to/content.json --replace'
```

#### Options

- `--json PATH` *(required)* — path to the content JSON file (inside the container)
- `--dry-run` — validate and print the full plan; needs no credentials, no network
- `--replace` — if a test with this slug exists, DELETE it first (blocks/questions/answers cascade); irreversible
- `--delay SECONDS` (default 0.4) — pause between HTTP requests, to stay under rate limits (200/min default bucket shared by `/blocks` and `/questions`)
- `--timeout SECONDS` (default 20) — per-request timeout
- `--base-url BASE_URL` (default `http://localhost:4001`) — backend base URL
- `-v, --verbose` — echo every request's method, path and status

Credentials: `ADMIN_USERNAME` and `ADMIN_PASSWORD` from environment (or `backend/.env`). Never flags — a password on the command line ends up in shell history.

### Input JSON format

```json
{
  "test": {
    "slug": "gdpr-audit",
    "name_uk": "GDPR Audit",
    "name_en": "GDPR Audit",
    "description_uk": "...",
    "description_en": "...",
    "report_type": "bizcheck"
  },
  "blocks": [
    {
      "order_index": 0,
      "title_uk": "Block Title",
      "title_en": "Block Title",
      "questions": [
        {
          "ref": "1",
          "parent_ref": null,
          "order_index": 0,
          "text_uk": "Question text",
          "text_en": "Question text",
          "note_uk": null,
          "note_en": null,
          "answers": [
            {
              "text_uk": "Answer 1",
              "text_en": "Answer 1",
              "score": 1,
              "next_ref": null
            },
            {
              "text_uk": "Answer 2",
              "text_en": "Answer 2",
              "score": 0,
              "next_ref": "2"
            }
          ]
        }
      ]
    }
  ]
}
```

- `ref` — logical id from the source spreadsheet ("1", "1.2", "3.1"); must be unique in the file
- `parent_ref` — makes this question a sub-question of another; resolves to `parent_question_id` in pass 2
- `next_ref` on an answer — branches the flow to another question; resolves to `next_question_id` in pass 2
- Every question needs **at least 2 answers**
- `test` may also carry optional fields forwarded as-is: `is_active`, `is_coming_soon`, `is_paid`, `price`, `currency`, `category`, `features`, `scoring_zones`, `zone_recommendations`, `order_index`

## Part 2: Quiz Branching Model and the Sub-Question Trap

### Architecture

The quiz is a tree of questions branching on user choices:

- **Top-level questions** (the main sequence) have `parent_question_id = null` (see `webdev/backend/database/db.py:359`)
- **Sub-questions** are reached **only** via `next_question_id` on an answer (see `webdev/backend/database/db.py:377`)
- A sub-question that has no `next_question_id` of its own returns the flow to the next top-level question

Frontend navigation walks this tree via `nextQuestion()` in `webdev/frontend/src/context/QuizContext.tsx:359-429`:

1. Parse the selected answer to check for `next_question_id` (a branch)
2. If there is a branch within the same block, navigate to it and push the current question onto the stack
3. If no branch, find the next top-level question in order
4. If no more top-level questions in this block, move to the next block with questions

### The trap: disconnected sub-questions

A **consecutive chain of sub-questions requires `next_question_id` on every question except the last**. Otherwise, the intermediate question is unreachable and never scored.

**Example (broken)**:

```json
{
  "ref": "1",
  "answers": [
    {"text_uk": "Yes", "next_ref": "1.1"}
  ]
},
{
  "ref": "1.1",
  "parent_ref": "1",
  "answers": [
    {"text_uk": "Strongly agree", "score": 1},
    {"text_uk": "Disagree", "score": 0}
  ]
},
{
  "ref": "1.2",
  "parent_ref": "1",
  "answers": [
    {"text_uk": "Strongly agree", "score": 1},
    {"text_uk": "Disagree", "score": 0}
  ]
}
```

Here, question 1.2 is **unreachable** because 1.1 has no `next_question_id` pointing to 1.2. The user selects an answer on 1.1 and jumps straight back to question 2, skipping 1.2 entirely. No error is raised; the score is calculated on fewer questions than intended.

**Correct**:

```json
{
  "ref": "1.1",
  "parent_ref": "1",
  "answers": [
    {"text_uk": "Strongly agree", "score": 1},
    {"text_uk": "Disagree", "score": 0}
  ],
  "next_ref": "1.2"  // ADD THIS
},
{
  "ref": "1.2",
  "parent_ref": "1",
  "answers": [
    {"text_uk": "Strongly agree", "score": 1},
    {"text_uk": "Disagree", "score": 0}
  ]
  // Last in the chain: no next_ref needed
}
```

Wait — `next_ref` is an **answer field**, not a question field. To make this work, put `next_question_id` on every answer of 1.1:

```json
{
  "ref": "1.1",
  "parent_ref": "1",
  "answers": [
    {
      "text_uk": "Strongly agree",
      "score": 1,
      "next_ref": "1.2"
    },
    {
      "text_uk": "Disagree",
      "score": 0,
      "next_ref": "1.2"
    }
  ]
},
```

Both answers point to the same follow-up, so the user is guaranteed to reach 1.2 regardless of their choice on 1.1.

### Verification after import

After any import, check that every sub-question is reachable:

```sql
-- Find sub-questions (parent_question_id IS NOT NULL) that are NOT
-- the target of any next_question_id. These are unreachable.
SELECT q.id, q.text_uk, q.parent_question_id
FROM questions q
WHERE q.parent_question_id IS NOT NULL
AND q.id NOT IN (
  SELECT DISTINCT next_question_id
  FROM answers
  WHERE next_question_id IS NOT NULL
)
ORDER BY q.id;
```

If this query returns rows, those questions are dead code and will never be answered by the user.

## Part 3: API Payload Naming — Write vs. Read

The importer and the admin panel write to `POST /api_crowe_bizcheck/questions` with one shape; the frontend reads from `GET /api_crowe_bizcheck/blocks/quiz?test=<slug>` with a different shape.

### On Write (admin panel, import script)

**Request payload** (see `webdev/backend/routes/questions.py:35-58`):

```json
{
  "block_id": 123,
  "text_uk": "Question text",
  "text_en": "Question text",
  "note_uk": "Helper text",
  "note_en": "Helper text",
  "parent_question_id": null,
  "answers": [
    {
      "text_uk": "Answer option 1",
      "text_en": "Answer option 1",
      "score": 1,
      "next_question_id": null
    }
  ]
}
```

- Answers are called `answers`
- Answer text fields are `text_uk` / `text_en`
- Branch target is `next_question_id`

### On Read (frontend quiz)

**Response body** (see `webdev/frontend/src/utils/quizContent.ts:7-31`):

```json
{
  "blocks": [
    {
      "id": 1,
      "title_uk": "Block title",
      "title_en": "Block title",
      "questions": [
        {
          "id": "1",
          "db_id": 123,
          "parent_question_id": null,
          "text_uk": "Question text",
          "text_en": "Question text",
          "note_uk": "Helper text",
          "note_en": "Helper text",
          "options": [
            {
              "label_uk": "Answer option 1",
              "label_en": "Answer option 1",
              "key": "a1",
              "score": 1,
              "next_question_id": null
            }
          ]
        }
      ]
    }
  ]
}
```

- Answers are called `options`
- Answer text fields are `label_uk` / `label_en`
- Branch target is still `next_question_id` (same name)

### The endpoint query

The quiz data endpoint is **`GET /api_crowe_bizcheck/blocks/quiz?test=<slug>`** (see `webdev/backend/routes/blocks.py:17-23`). Note:
- Query parameter is `test=<slug>` (not `test_id`)
- Both parameter name and value are case-insensitive (lowercased on server)
- Omitting `test` or passing an invalid slug returns `{"error": "Missing required query param: test"}` (400)

Passing `test_id=123` returns 400 — the API does not accept numeric IDs on this endpoint.

### Why the naming difference?

The write and read layers are independently authored:
- **Admin panel** (Flask routes + models) uses `answers` / `text_uk/en` / `next_question_id`
- **Frontend quiz** (React + TypeScript types) rebrands for UI clarity: `options` (the user sees them as selectable options) and `label` (the label the user reads)

The answer text in answers is authored content that flows directly into the PDF, Excel, and Telegram — using the internal field names (`text_uk/en`) on write ensures sanitization. The UI rebrands on read for clarity, but the underlying database column is unchanged.

