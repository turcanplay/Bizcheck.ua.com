"""
PostgreSQL database connection pool and migration manager.
Supports DATABASE_URL (Railway/Render) or individual DB_* env vars.
"""

import os
import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor

_pool = None


_POOL_MIN = int(os.getenv("DB_POOL_MIN", "5"))
_POOL_MAX = int(os.getenv("DB_POOL_MAX", "20"))


def get_pool():
    """Get or create the singleton connection pool.

    min_conns pre-warmed at startup → zero-latency acquisition under burst.
    Tune via DB_POOL_MIN / DB_POOL_MAX env vars if traffic pattern changes.
    """
    global _pool
    if _pool is None:
        database_url = os.getenv("DATABASE_URL")
        if database_url:
            _pool = pool.ThreadedConnectionPool(_POOL_MIN, _POOL_MAX, dsn=database_url)
        else:
            _pool = pool.ThreadedConnectionPool(
                _POOL_MIN, _POOL_MAX,
                host=os.getenv("DB_HOST", "localhost"),
                port=int(os.getenv("DB_PORT", "5432")),
                dbname=os.getenv("DB_NAME", "bizzcheck"),
                user=os.getenv("DB_USER", "postgres"),
                password=os.getenv("DB_PASSWORD", "postgres"),
            )
    return _pool


def get_conn():
    """Get a connection from the pool."""
    return get_pool().getconn()


def put_conn(conn):
    """Return a connection to the pool."""
    get_pool().putconn(conn)


def query(sql, params=None, fetch_one=False, fetch_all=False, commit=False):
    """
    Execute a SQL query with parameterized values.

    Args:
        sql: SQL string with %s placeholders.
        params: Tuple of parameter values.
        fetch_one: Return a single row as dict.
        fetch_all: Return all rows as list of dicts.
        commit: Whether to commit the transaction.

    Returns:
        Dict, list of dicts, lastrowid, or None depending on flags.
    """
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, params)
            if commit:
                conn.commit()
            if fetch_one:
                row = cur.fetchone()
                return dict(row) if row else None
            if fetch_all:
                return [dict(r) for r in cur.fetchall()]
            if commit:
                # For INSERT ... RETURNING, try to fetch
                try:
                    row = cur.fetchone()
                    return dict(row) if row else None
                except psycopg2.ProgrammingError:
                    return None
            return None
    except Exception:
        conn.rollback()
        raise
    finally:
        put_conn(conn)


def execute(sql, params=None):
    """Execute a statement (INSERT/UPDATE/DELETE) and commit."""
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, params)
            conn.commit()
            try:
                return dict(cur.fetchone()) if cur.description else None
            except psycopg2.ProgrammingError:
                return None
    except Exception:
        conn.rollback()
        raise
    finally:
        put_conn(conn)


def execute_many(sql, params_list):
    """Execute a statement for each params tuple in a single transaction."""
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            results = []
            for params in params_list:
                cur.execute(sql, params)
                try:
                    results.append(dict(cur.fetchone()))
                except psycopg2.ProgrammingError:
                    pass
            conn.commit()
            return results
    except Exception:
        conn.rollback()
        raise
    finally:
        put_conn(conn)


def migrate():
    """Create the full BizCheck schema in one shot.

    Single source of truth for the database layout. Uses CREATE TABLE IF NOT EXISTS
    so repeated calls from multi-worker gunicorn boot are safe. No incremental
    ALTERs: when the schema changes, drop the DB and re-run.

    Tables: users, tests, blocks, questions, answers, submissions, results.
    Payment-related columns on users/submissions are reserved for a future paid
    flow; no application logic currently reads or gates on them.
    """
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            # Advisory lock prevents concurrent migration from multiple workers
            cur.execute("SELECT pg_advisory_xact_lock(1)")

            cur.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id                 SERIAL       PRIMARY KEY,
                    username           VARCHAR(100) NOT NULL UNIQUE,
                    email              VARCHAR(255) NOT NULL UNIQUE,
                    password_hash      TEXT         NOT NULL,
                    -- Reserved for future paid flow; unused today.
                    is_paid            BOOLEAN      NOT NULL DEFAULT FALSE,
                    paid_at            TIMESTAMPTZ  DEFAULT NULL,
                    subscription_tier  VARCHAR(50)  DEFAULT NULL,
                    payment_provider   VARCHAR(50)  DEFAULT NULL,
                    payment_ref        VARCHAR(255) DEFAULT NULL,
                    created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
                );

                CREATE TABLE IF NOT EXISTS tests (
                    id                    SERIAL       PRIMARY KEY,
                    slug                  VARCHAR(100) UNIQUE NOT NULL,
                    name_ro               VARCHAR(255) NOT NULL,
                    name_ru               VARCHAR(255) NOT NULL DEFAULT '',
                    description_ro        TEXT         NOT NULL DEFAULT '',
                    description_ru        TEXT         NOT NULL DEFAULT '',
                    scoring_zones         JSONB        NOT NULL DEFAULT '{"safe": 80, "developing": 70, "warn": 65, "risk": 0}',
                    zone_recommendations  JSONB        DEFAULT NULL,
                    is_active             BOOLEAN      NOT NULL DEFAULT TRUE,
                    is_coming_soon        BOOLEAN      NOT NULL DEFAULT FALSE,
                    is_paid               BOOLEAN      NOT NULL DEFAULT FALSE,
                    price                 NUMERIC(10,2) DEFAULT NULL,
                    currency              VARCHAR(3)   NOT NULL DEFAULT 'MDL',
                    category              VARCHAR(50)  DEFAULT NULL,
                    features              JSONB        NOT NULL DEFAULT '[]',
                    report_type           VARCHAR(32)  NOT NULL DEFAULT 'bizcheck',
                    created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
                );
                ALTER TABLE tests ADD COLUMN IF NOT EXISTS report_type VARCHAR(32) NOT NULL DEFAULT 'bizcheck';
                ALTER TABLE tests ALTER COLUMN report_type SET DEFAULT 'bizcheck';
                ALTER TABLE tests ADD COLUMN IF NOT EXISTS is_coming_soon BOOLEAN NOT NULL DEFAULT FALSE;
                -- Display order on the public catalog (lower = first / left). Admin-editable.
                ALTER TABLE tests ADD COLUMN IF NOT EXISTS order_index INTEGER NOT NULL DEFAULT 0;
                -- 3 distinct report layouts: 'bizcheck' (per-block detail), 'standard' (per-question
                -- checklist), 'premium' (short).
                -- Previous migration remapped block-based 'bizcheck' rows to 'standard' by mistake.
                -- Revert ONLY on first run: if no 'bizcheck' rows exist yet, assume every current
                -- 'standard' row is actually a pre-cutover block-based test. Once any bizcheck row
                -- exists, the EXISTS subquery returns true → UPDATE touches 0 rows (idempotent).
                UPDATE tests SET report_type = 'bizcheck'
                 WHERE report_type = 'standard'
                   AND NOT EXISTS (
                       SELECT 1 FROM tests AS t2 WHERE t2.report_type = 'bizcheck' LIMIT 1
                   );
                -- Add 'risk' threshold (4th zone) to any existing scoring_zones that don't have it.
                UPDATE tests
                   SET scoring_zones = scoring_zones || '{"risk": 0}'::jsonb
                 WHERE scoring_zones IS NOT NULL
                   AND NOT (scoring_zones ? 'risk');
                CREATE INDEX IF NOT EXISTS idx_tests_slug     ON tests(slug);
                CREATE INDEX IF NOT EXISTS idx_tests_active   ON tests(is_active);
                CREATE INDEX IF NOT EXISTS idx_tests_category ON tests(category);

                CREATE TABLE IF NOT EXISTS blocks (
                    id          SERIAL       PRIMARY KEY,
                    test_id     INTEGER      NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
                    title_ro    VARCHAR(255) NOT NULL,
                    title_ru    VARCHAR(255) NOT NULL,
                    order_index INTEGER      NOT NULL DEFAULT 0,
                    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
                );
                CREATE INDEX IF NOT EXISTS idx_blocks_test ON blocks(test_id);

                CREATE TABLE IF NOT EXISTS questions (
                    id                 SERIAL      PRIMARY KEY,
                    block_id           INTEGER     NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
                    parent_question_id INTEGER     DEFAULT NULL REFERENCES questions(id) ON DELETE SET NULL,
                    text_ro            TEXT        NOT NULL,
                    text_ru            TEXT        NOT NULL,
                    note_ro            TEXT        DEFAULT NULL,
                    note_ru            TEXT        DEFAULT NULL,
                    purpose_ro         TEXT        DEFAULT NULL,
                    purpose_ru         TEXT        DEFAULT NULL,
                    example_ro         TEXT        DEFAULT NULL,
                    example_ru         TEXT        DEFAULT NULL,
                    order_index        INTEGER     NOT NULL DEFAULT 0,
                    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
                CREATE INDEX IF NOT EXISTS idx_questions_block  ON questions(block_id);
                CREATE INDEX IF NOT EXISTS idx_questions_parent ON questions(parent_question_id);

                CREATE TABLE IF NOT EXISTS answers (
                    id               SERIAL      PRIMARY KEY,
                    question_id      INTEGER     NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
                    next_question_id INTEGER     DEFAULT NULL REFERENCES questions(id) ON DELETE SET NULL,
                    text_ro          TEXT        NOT NULL,
                    text_ru          TEXT        NOT NULL,
                    score            REAL        NOT NULL DEFAULT 0,
                    explanation_ro   TEXT        DEFAULT NULL,
                    explanation_ru   TEXT        DEFAULT NULL,
                    risk_ro          TEXT        DEFAULT NULL,
                    risk_ru          TEXT        DEFAULT NULL,
                    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
                CREATE INDEX IF NOT EXISTS idx_answers_question ON answers(question_id);

                CREATE TABLE IF NOT EXISTS results (
                    id              SERIAL      PRIMARY KEY,
                    user_id         INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    block_id        INTEGER     NOT NULL,
                    score           REAL        NOT NULL,
                    total_questions INTEGER     NOT NULL,
                    completed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
                CREATE INDEX IF NOT EXISTS idx_results_user  ON results(user_id);
                CREATE INDEX IF NOT EXISTS idx_results_block ON results(block_id);

                CREATE TABLE IF NOT EXISTS submissions (
                    id                    SERIAL       PRIMARY KEY,
                    test_id               INTEGER      REFERENCES tests(id),
                    -- PII stored as Fernet ciphertext (TEXT accommodates ~3-4x expansion).
                    -- Nullable: contact info is collected after the quiz, not upfront.
                    first_name            TEXT         DEFAULT NULL,
                    last_name             TEXT         DEFAULT NULL,
                    email                 TEXT         DEFAULT NULL,
                    phone                 TEXT         DEFAULT NULL,
                    sector                VARCHAR(255) DEFAULT NULL,
                    company_size          VARCHAR(50)  DEFAULT NULL,
                    company_age           VARCHAR(50)  DEFAULT NULL,
                    company_revenue       VARCHAR(50)  DEFAULT NULL,
                    language              VARCHAR(5)   DEFAULT 'ro',
                    total_score           REAL         DEFAULT NULL,
                    answers_json          JSONB        DEFAULT NULL,
                    selected_answers_json JSONB        DEFAULT NULL,
                    block_scores_json     JSONB        DEFAULT NULL,
                    pdf_data              BYTEA        DEFAULT NULL,
                    status                VARCHAR(20)  NOT NULL DEFAULT 'started',
                    consent               BOOLEAN      NOT NULL DEFAULT FALSE,
                    -- Reserved for future paid flow; unused today.
                    is_paid               BOOLEAN      NOT NULL DEFAULT FALSE,
                    paid_at               TIMESTAMPTZ  DEFAULT NULL,
                    payment_provider      VARCHAR(50)  DEFAULT NULL,
                    payment_ref           VARCHAR(255) DEFAULT NULL,
                    -- Telegram deep-link delivery.
                    tg_token              VARCHAR(64)  DEFAULT NULL,
                    tg_token_expires      TIMESTAMPTZ  DEFAULT NULL,
                    tg_chat_id            BIGINT       DEFAULT NULL,
                    tg_username           VARCHAR(100) DEFAULT NULL,
                    tg_first_name         VARCHAR(100) DEFAULT NULL,
                    tg_last_name          VARCHAR(100) DEFAULT NULL,
                    created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
                );
                -- Idempotent migrations for pre-existing DBs (older schema without these columns)
                ALTER TABLE submissions ADD COLUMN IF NOT EXISTS test_id          INTEGER      REFERENCES tests(id);
                ALTER TABLE submissions ADD COLUMN IF NOT EXISTS company_revenue  VARCHAR(50)  DEFAULT NULL;
                ALTER TABLE submissions ADD COLUMN IF NOT EXISTS is_paid          BOOLEAN      NOT NULL DEFAULT FALSE;
                ALTER TABLE submissions ADD COLUMN IF NOT EXISTS paid_at          TIMESTAMPTZ  DEFAULT NULL;
                ALTER TABLE submissions ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(50)  DEFAULT NULL;
                ALTER TABLE submissions ADD COLUMN IF NOT EXISTS payment_ref      VARCHAR(255) DEFAULT NULL;
                ALTER TABLE submissions ADD COLUMN IF NOT EXISTS tg_token         VARCHAR(64)  DEFAULT NULL;
                ALTER TABLE submissions ADD COLUMN IF NOT EXISTS tg_token_expires TIMESTAMPTZ  DEFAULT NULL;
                ALTER TABLE submissions ADD COLUMN IF NOT EXISTS tg_chat_id       BIGINT       DEFAULT NULL;
                ALTER TABLE submissions ADD COLUMN IF NOT EXISTS tg_username      VARCHAR(100) DEFAULT NULL;
                ALTER TABLE submissions ADD COLUMN IF NOT EXISTS tg_first_name    VARCHAR(100) DEFAULT NULL;
                ALTER TABLE submissions ADD COLUMN IF NOT EXISTS tg_last_name     VARCHAR(100) DEFAULT NULL;
                ALTER TABLE submissions ADD COLUMN IF NOT EXISTS selected_answers_json JSONB  DEFAULT NULL;
                ALTER TABLE submissions ADD COLUMN IF NOT EXISTS pdf_data         BYTEA        DEFAULT NULL;
                -- Contact info is now collected after the quiz; drop legacy NOT NULL on first_name.
                ALTER TABLE submissions ALTER COLUMN first_name DROP NOT NULL;
                ALTER TABLE submissions ADD COLUMN IF NOT EXISTS status           VARCHAR(20)  NOT NULL DEFAULT 'started';
                -- Opaque per-submission token (issued at POST, required for PATCH/PDF/email).
                -- Prevents IDOR: knowing a sub_id is no longer enough to mutate it.
                ALTER TABLE submissions ADD COLUMN IF NOT EXISTS submission_token VARCHAR(64)  DEFAULT NULL;
                -- Fire-once guard for the sales Telegram notification (see services/sales_notify.py).
                ALTER TABLE submissions ADD COLUMN IF NOT EXISTS sales_notified   BOOLEAN      NOT NULL DEFAULT FALSE;
                -- Telegram message id of the sales notification, so later contact info
                -- (e.g. email/phone left in the bot) can EDIT the same message in-place.
                ALTER TABLE submissions ADD COLUMN IF NOT EXISTS sales_msg_id     BIGINT       DEFAULT NULL;
                ALTER TABLE submissions ADD COLUMN IF NOT EXISTS sales_msg_is_doc BOOLEAN      NOT NULL DEFAULT FALSE;

                CREATE INDEX IF NOT EXISTS idx_submissions_test       ON submissions(test_id);
                CREATE INDEX IF NOT EXISTS idx_submissions_tg_token   ON submissions(tg_token);
                CREATE INDEX IF NOT EXISTS idx_submissions_tg_chat_id ON submissions(tg_chat_id);
                CREATE UNIQUE INDEX IF NOT EXISTS idx_submissions_submission_token
                    ON submissions(submission_token) WHERE submission_token IS NOT NULL;

                CREATE TABLE IF NOT EXISTS templates (
                    id             SERIAL        PRIMARY KEY,
                    slug           VARCHAR(100)  UNIQUE NOT NULL,
                    title_ro       VARCHAR(255)  NOT NULL,
                    title_ru       VARCHAR(255)  NOT NULL DEFAULT '',
                    description_ro TEXT          NOT NULL DEFAULT '',
                    description_ru TEXT          NOT NULL DEFAULT '',
                    is_active      BOOLEAN       NOT NULL DEFAULT TRUE,
                    is_coming_soon BOOLEAN       NOT NULL DEFAULT FALSE,
                    is_paid        BOOLEAN       NOT NULL DEFAULT FALSE,
                    price          NUMERIC(10,2) DEFAULT NULL,
                    currency       VARCHAR(3)    NOT NULL DEFAULT 'MDL',
                    category       VARCHAR(50)   DEFAULT NULL,
                    features       JSONB         NOT NULL DEFAULT '[]',
                    created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
                );
                ALTER TABLE templates ADD COLUMN IF NOT EXISTS is_coming_soon BOOLEAN NOT NULL DEFAULT FALSE;
                CREATE INDEX IF NOT EXISTS idx_templates_slug     ON templates(slug);
                CREATE INDEX IF NOT EXISTS idx_templates_active   ON templates(is_active);
                CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);

                CREATE TABLE IF NOT EXISTS template_files (
                    id           SERIAL       PRIMARY KEY,
                    template_id  INTEGER      NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
                    filename     VARCHAR(255) NOT NULL,
                    pdf_data     BYTEA        NOT NULL,
                    file_size    INTEGER      NOT NULL DEFAULT 0,
                    order_index  INTEGER      NOT NULL DEFAULT 0,
                    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
                );
                CREATE INDEX IF NOT EXISTS idx_template_files_template ON template_files(template_id);

                CREATE TABLE IF NOT EXISTS testimonials (
                    id          SERIAL       PRIMARY KEY,
                    name        VARCHAR(100) NOT NULL,
                    role        VARCHAR(150) DEFAULT NULL,
                    quote_ro    TEXT         NOT NULL DEFAULT '',
                    quote_ru    TEXT         NOT NULL DEFAULT '',
                    rating      SMALLINT     NOT NULL DEFAULT 5,
                    avatar_url  VARCHAR(500) DEFAULT NULL,
                    order_index INTEGER      NOT NULL DEFAULT 0,
                    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
                    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
                );
                CREATE INDEX IF NOT EXISTS idx_testimonials_active ON testimonials(is_active);

                CREATE TABLE IF NOT EXISTS faq_items (
                    id          SERIAL      PRIMARY KEY,
                    question_ro TEXT        NOT NULL,
                    question_ru TEXT        NOT NULL DEFAULT '',
                    answer_ro   TEXT        NOT NULL DEFAULT '',
                    answer_ru   TEXT        NOT NULL DEFAULT '',
                    order_index INTEGER     NOT NULL DEFAULT 0,
                    is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
                    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
                CREATE INDEX IF NOT EXISTS idx_faq_active ON faq_items(is_active);

                -- Key/value store for editable page configuration (CTA button
                -- targets, etc). Admin-managed via /admin/site-settings.
                CREATE TABLE IF NOT EXISTS site_settings (
                    setting_key   VARCHAR(64)  PRIMARY KEY,
                    setting_value TEXT         NOT NULL DEFAULT '',
                    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
                );

                -- Testimonials: allow half-star ratings (4.5) and track which
                -- rows were submitted by the public (vs admin-curated). The
                -- `lang` column records the single language a public review was
                -- written in — public reviews live in ONE language only.
                ALTER TABLE testimonials ALTER COLUMN rating TYPE NUMERIC(2,1) USING rating::numeric;
                ALTER TABLE testimonials ALTER COLUMN rating SET DEFAULT 5;
                ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS lang VARCHAR(5) NOT NULL DEFAULT 'ro';
                ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS is_user_submitted BOOLEAN NOT NULL DEFAULT FALSE;
            """)

            conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        put_conn(conn)


def close():
    """Close the connection pool gracefully."""
    global _pool
    if _pool:
        _pool.closeall()
        _pool = None
