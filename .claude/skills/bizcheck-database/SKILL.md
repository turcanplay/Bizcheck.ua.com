---
name: bizcheck-database
description: Change the PostgreSQL schema or DB layer in webdev/backend. Use when adding a table or column, writing a migration, editing migrate() in database/db.py, tuning the connection pool, or seeding data.
---

# BizCheck — Database & Migrations

**Read first:** `documentation/architecture/03-data-model.md` (tables/relationships) and
`documentation/backend/04-middleware-utils.md` (pool + helpers).

## Migration model (idempotent, runs every boot)
`migrate()` in `webdev/backend/database/db.py` is the **single source of truth** for the schema. It runs
on every backend boot under `pg_advisory_xact_lock(1)` (serializes concurrent worker boots). Pattern:
`CREATE TABLE IF NOT EXISTS` + `ALTER TABLE … ADD COLUMN IF NOT EXISTS`.

## Recipe — add a column
1. Inside the `migrate()` SQL block, append:
   `ALTER TABLE <table> ADD COLUMN IF NOT EXISTS <name> <type> <default>;`
2. Surface it in the relevant `models/<entity>.py` (insert/select/update field lists).
3. Update `documentation/architecture/03-data-model.md`.
4. If it's user free-text, sanitize on write (`bizcheck-auth-security`); if PII, wire encryption (`bizcheck-backend-models`).

## Recipe — add a table
1. `CREATE TABLE IF NOT EXISTS …` + needed indexes inside `migrate()`.
2. Add a model class; add a service; add routes as needed.

## Invariants that bite
- **Idempotent only.** Never `DROP COLUMN`/destructive DDL in `migrate()` (not idempotent across replicas).
- Don't create a separate migrations folder — everything goes in `migrate()`.
- Data backfills must be idempotent (guard with `WHERE NOT EXISTS`/conditional `UPDATE`, like the existing
  `report_type` and `scoring_zones` backfills).
- Pool: `ThreadedConnectionPool`, size via `DB_POOL_MIN`/`DB_POOL_MAX`. Use `db.query/execute/execute_many`
  (they handle cursor, commit, rollback, and returning the connection to the pool).

## Seeding (out of request path)
- `scripts/seed.py` — populate blocks/questions/answers (skips if seeded).
- `scripts/seed_tests.py` — **DESTRUCTIVE** truncate + load `scripts/seeds/*.sql` (business/gdpr/hr).

## Don'ts
- Don't drop columns or run non-idempotent DDL in `migrate()`.
- Don't bind the standalone-bot Postgres (repo-root compose) to `0.0.0.0` — keep `127.0.0.1`.
