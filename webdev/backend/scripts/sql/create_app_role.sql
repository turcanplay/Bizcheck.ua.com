-- =====================================================================
--  BizCheck — dedicated (non-superuser) Postgres role for the backend
--  Audit finding INFO-4: "Postgres runs as superuser"
-- =====================================================================
--
--  WHAT THIS FIXES
--  ---------------
--  Today the backend connects as `postgres`, the cluster superuser. Any SQL
--  injection that survived the parameterised-query layer, any leaked
--  DATABASE_URL, and any compromise of the backend container would come with
--  the ability to read/write EVERY database in the cluster, write files via
--  COPY ... TO PROGRAM, create extensions, and disable RLS. The role below
--  can do exactly what the application does and nothing else.
--
--  WHY THE ROLE IS NOT AS TIGHT AS IT COULD BE
--  -------------------------------------------
--  `migrate()` (database/db.py) runs on EVERY backend boot and issues DDL:
--  CREATE TABLE, ALTER TABLE, CREATE INDEX, plus ALTER TABLE ... ALTER COLUMN
--  TYPE and RENAME COLUMN in the language migrations. A read/write-only role
--  would make the container crash-loop at startup. So the app role owns its
--  schema (which is what grants it DDL) but is NOT a superuser, NOT
--  CREATEROLE, NOT CREATEDB, NOT REPLICATION, and cannot touch anything
--  outside that schema.
--
--  IDEMPOTENT — safe to run again on an already-migrated cluster.
--
--  HOW TO RUN (see webdev/backend/DATABASE_ROLE.md for the full procedure):
--      docker compose exec -T db psql -v ON_ERROR_STOP=1 \
--          -U postgres -d bizzcheck \
--          -v app_password="'<STRONG_PASSWORD>'" \
--          < backend/scripts/sql/create_app_role.sql
--
--  Requires: a superuser connection (only a superuser can create a role) and
--  psql, because of the \gexec / :variable syntax.
-- =====================================================================

\set ON_ERROR_STOP on

-- Fail loudly instead of silently creating a passwordless role.
-- The RAISE (rather than a bare \quit) is deliberate: psql's \quit takes no
-- status argument, so the abort path used to exit 0 — a script that "failed"
-- while telling the caller it succeeded. With ON_ERROR_STOP the exception below
-- exits 3, so a wrapper/CI can actually detect it.
\if :{?app_password}
\else
  \echo '!! Missing -v app_password="''...''" — aborting.'
  DO $$ BEGIN RAISE EXCEPTION 'app_password not provided'; END $$;
\endif

BEGIN;

-- ---------------------------------------------------------------------
-- 1. The role.
--    NOSUPERUSER/NOCREATEDB/NOCREATEROLE/NOREPLICATION/NOBYPASSRLS are
--    spelled out rather than left to defaults, so a later ALTER that
--    accidentally widens them is visible in a diff.
-- ---------------------------------------------------------------------
SELECT format(
    'CREATE ROLE bizcheck_app LOGIN PASSWORD %L
       NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS
       CONNECTION LIMIT 50',
    :app_password
)
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'bizcheck_app')
\gexec

-- Re-running rotates the password and re-asserts the restrictions, so a role
-- that was manually widened gets pulled back into line.
SELECT format(
    'ALTER ROLE bizcheck_app WITH PASSWORD %L
       NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS
       CONNECTION LIMIT 50',
    :app_password
)
\gexec

-- WHY 50 AND NOT 30 (the value this script used to carry)
-- ------------------------------------------------------
-- The pool is sized PER WORKER PROCESS and gunicorn runs 4 of them
-- (backend/Dockerfile: --workers 4). The real ceiling is therefore
--     4 workers x DB_POOL_MAX (default 10, database/db.py) = 40 connections,
-- not DB_POOL_MAX. The old limit of 30 was BELOW that ceiling, so a burst
-- would have hit "too many connections for role bizcheck_app" — the role
-- change would have looked like a random production outage. 50 keeps 10
-- connections of headroom and stays far under the postgres:16-alpine default
-- max_connections=100 (minus 3 superuser-reserved slots, which the superuser
-- keeps for psql/pg_dump/a rolling deploy).
-- If you raise DB_POOL_MAX, raise this too: ALTER ROLE ... CONNECTION LIMIT n.
-- scripts/check-db-role.sh verifies this relation on the live cluster.

-- Pin the schema: nothing else exists for this role to resolve into, but being
-- explicit means a future schema can never silently shadow `public`.
ALTER ROLE bizcheck_app SET search_path = public;

-- ---------------------------------------------------------------------
-- 2. Database-level privileges.
--    CONNECT only. No CREATE on the database → the role cannot add new
--    schemas next to its own.
--
--    The database name is taken from the connection (current_database())
--    instead of being hard-coded as `bizzcheck`: DB_NAME is configurable in
--    .env, and a hard-coded name made the script fail on any install that
--    changed it — right in the middle of a security procedure.
-- ---------------------------------------------------------------------
SELECT format('REVOKE ALL ON DATABASE %I FROM PUBLIC', current_database())
\gexec
SELECT format('GRANT CONNECT ON DATABASE %I TO bizcheck_app', current_database())
\gexec

-- The maintenance databases the postgres image always creates (`postgres`,
-- `template1`) grant CONNECT to PUBLIC by default, so without this the app
-- role could still open a session there and read pg_catalog — the claim
-- "no access to any other database in the cluster" was simply not true.
-- It can do nothing there (no CREATE, owns nothing), but the door was open.
-- Only PUBLIC's grant is touched; superusers are unaffected, and
-- `pg_isready`/`psql -U postgres` keep working. Reverse with:
--     GRANT CONNECT ON DATABASE postgres TO PUBLIC;
SELECT format('REVOKE CONNECT ON DATABASE %I FROM PUBLIC', datname)
  FROM pg_database
 WHERE datname IN ('postgres', 'template1')
   AND datname <> current_database()
\gexec

-- ---------------------------------------------------------------------
-- 3. Schema ownership = the DDL privilege the migration needs.
--    Owning `public` lets the role CREATE TABLE / ALTER TABLE / CREATE INDEX
--    inside it — and only inside it.
--
--    Postgres 15+ already revokes CREATE on public from PUBLIC; the REVOKE
--    below makes that explicit for clusters restored from an older dump.
-- ---------------------------------------------------------------------
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
ALTER  SCHEMA public OWNER TO bizcheck_app;
GRANT  USAGE, CREATE ON SCHEMA public TO bizcheck_app;

-- ---------------------------------------------------------------------
-- 4. Objects that already exist were created BY postgres, so they are still
--    owned by postgres and the app role could not ALTER them. Hand them over.
--    (No-op on a fresh database — there is nothing to reassign.)
-- ---------------------------------------------------------------------
DO $$
DECLARE
    obj record;
BEGIN
    FOR obj IN
        SELECT c.relname, c.relkind
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public'
           AND c.relkind IN ('r', 'S', 'v', 'm', 'p')   -- table, sequence, view, matview, partitioned
           AND c.relowner <> (SELECT oid FROM pg_roles WHERE rolname = 'bizcheck_app')
    LOOP
        EXECUTE format(
            CASE obj.relkind
                WHEN 'S' THEN 'ALTER SEQUENCE public.%I OWNER TO bizcheck_app'
                WHEN 'v' THEN 'ALTER VIEW public.%I OWNER TO bizcheck_app'
                WHEN 'm' THEN 'ALTER MATERIALIZED VIEW public.%I OWNER TO bizcheck_app'
                ELSE             'ALTER TABLE public.%I OWNER TO bizcheck_app'
            END, obj.relname);
    END LOOP;
END
$$;

-- ---------------------------------------------------------------------
-- 5. DML on everything in the schema, now and in the future.
--
--    Mostly belt-and-braces: the role OWNS these objects after step 4, and an
--    owner already holds every privilege on them (including TRUNCATE, DROP and
--    REFERENCES — do not claim otherwise). These grants matter for the objects
--    step 4 could not reach and for anything postgres creates out of band.
-- ---------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES    IN SCHEMA public TO bizcheck_app;
GRANT USAGE, SELECT                  ON ALL SEQUENCES IN SCHEMA public TO bizcheck_app;

-- Applies to objects created LATER by postgres (e.g. a manual hotfix table),
-- so the app does not silently lose access after an out-of-band change.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO bizcheck_app;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO bizcheck_app;

-- ---------------------------------------------------------------------
-- 6. information_schema — migrate() reads it.
--    migrate_ro_to_uk() / migrate_ru_to_en() decide whether to RENAME a column
--    by querying information_schema.columns. That view only shows columns of
--    tables the CURRENT user has some privilege on: a role without access sees
--    zero rows, the rename is skipped SILENTLY, and the app then queries
--    `name_uk` on a table that still has `name_ro`. That is the second reason
--    step 4 (ownership transfer) is not optional — the first being DDL.
--    USAGE here comes from PUBLIC by default; granting it explicitly makes the
--    dependency visible instead of accidental.
--    pg_advisory_xact_lock (used by migrate() to serialise concurrent worker
--    boots) needs NO privilege at all — it works for any role.
-- ---------------------------------------------------------------------
GRANT USAGE ON SCHEMA information_schema TO bizcheck_app;

COMMIT;

-- ---------------------------------------------------------------------
-- 7. Verification — rolsuper/rolcreatedb/rolcreaterole/rolreplication must all
--    print `f`, and rolconnlimit must be >= 4 x DB_POOL_MAX (see above).
-- ---------------------------------------------------------------------
SELECT rolname, rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolconnlimit
  FROM pg_roles
 WHERE rolname = 'bizcheck_app';

-- Nothing in `public` may still belong to postgres, or the next migrate() dies
-- with "must be owner of table ...". Expected result: 0 rows.
SELECT c.relname AS still_owned_by_postgres, pg_get_userbyid(c.relowner) AS owner
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'public'
   AND c.relkind IN ('r', 'S', 'v', 'm', 'p')
   AND pg_get_userbyid(c.relowner) <> 'bizcheck_app';
