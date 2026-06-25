# Backend — Middleware, Crypto, Validators, DB

## Middleware (`backend/middleware/`)

### `admin_middleware.py`
- **`@admin_required`** — validates admin JWT from the **`admin_session` httpOnly cookie**
  (not a header). For unsafe methods (POST/PATCH/PUT/DELETE) also requires `X-CSRF-Token`
  header == `admin_csrf` cookie (double-submit; both non-empty and equal). GET/HEAD/OPTIONS
  skip CSRF. On success sets `request.admin = True`.
  Errors: 401 (missing/expired/invalid token, not admin), 403 (CSRF missing/invalid).
- **`@submission_owner_or_admin`** — passes if **either** a valid admin session **or** an
  `X-Submission-Token` header matching the `{sub_id}` in the URL (via
  `Submission.find_id_by_token`). Sets `request.submission_authorized = True`.
  Errors: 400 (missing id), 401 (no token), 403 (wrong token/id — same status to prevent enumeration).

### `auth_middleware.py` (legacy)
- **`@auth_required`** — validates a user JWT from `Authorization: Bearer <token>` (HS256, `JWT_SECRET`),
  checks `exp`, sets `request.user_id`. Used only by the legacy user/results routes.

## Crypto (`backend/utils/crypto.py`) — PII at rest

Fernet (AES-128-CBC + HMAC-SHA256). Key from `PII_ENCRYPTION_KEY` (accepts a Fernet base64 key
**or** any passphrase, derived via SHA-256).
- `PII_FIELDS = ("first_name", "last_name", "email", "phone")`.
- `encrypt_value(plaintext)` / `decrypt_value(ciphertext)` — None-safe single value.
  `decrypt_value` falls back to the raw value on `InvalidToken` (tolerates legacy plaintext rows).
- `encrypt_fields(data, fields=PII_FIELDS)` — copy with listed fields encrypted (before INSERT/UPDATE).
- `decrypt_row(row, …)` / `decrypt_rows(rows, …)` — copy with listed fields decrypted (after SELECT).
- Used exclusively by `models/submission.py`. **Raw SQL bypasses this — always go through the model.**

## Validators (`backend/utils/validators.py`) — sanitization

Mandatory on every write-path free-text field. HTML strip (stored-XSS guard) + length cap (DoS guard).
- Length constants: `MAX_NAME 100`, `MAX_EMAIL 254`, `MAX_PHONE 20`, `MAX_SHORT 200`, `MAX_URL 500`,
  `MAX_TEXT 2000`, `MAX_LONG 10000`, `MAX_SLUG 80`, `MAX_LANG 5`.
- `clean_text(value, max_len=MAX_TEXT, *, allow_empty=True, strip_html=True)` — coerce→str, trim,
  strip HTML, drop control chars (except tab/newline), truncate. Raises if empty and `allow_empty=False`.
- `clean_optional(value, max_len=MAX_SHORT, **kw)` — like `clean_text` but returns `None` instead of `""`.
- `clean_slug(value)` — enforce `[a-z0-9_-]+`, else `ValueError`.
- `clean_int(value, *, min_value, max_value)` — parse + clamp.
- `clean_float(value, *, min_value, max_value, step)` — parse, snap to step grid (e.g. 0.5 ratings),
  clamp, reject NaN/inf, round to 1 decimal.
- `clean_lang(value, default="ro")` — whitelist `ro`/`ru`.
- `clean_bool(value)` — `"1"/"true"/"yes"/"on"` → True.

## Database (`backend/database/db.py`)

- **Pool**: singleton `psycopg2` `ThreadedConnectionPool`. Uses `DATABASE_URL` if set, else
  `DB_HOST/PORT/NAME/USER/PASSWORD`. Size via `DB_POOL_MIN` (def 5) / `DB_POOL_MAX` (def 20),
  min pre-warmed at startup. `get_conn` / `put_conn`.
- **Helpers** (all `RealDictCursor`, rollback on error, return conn to pool in `finally`):
  - `query(sql, params, fetch_one, fetch_all, commit)` — general query.
  - `execute(sql, params)` — statement + commit; returns first row if any.
  - `execute_many(sql, params_list)` — loop in one transaction.
- **`migrate()`** — full idempotent schema build under `pg_advisory_xact_lock(1)`. See
  [`../architecture/03-data-model.md`](../architecture/03-data-model.md) for the rules.
- **`close()`** — close pool (registered via `atexit` in `server.py`).

## Tests (`backend/tests/`)

- `test_unit_security.py` — runs **without** a backend or DB (Flask test client + monkeypatched model).
  Use this for new auth/middleware/validator logic. Run:
  `cd webdev/backend && venv/Scripts/python -m pytest tests/test_unit_security.py -v`.
- `test_security.py` — integration; needs a live backend on `:4001`, fixtures expect
  `ADMIN_USERNAME=admin / ADMIN_PASSWORD=admin`.
