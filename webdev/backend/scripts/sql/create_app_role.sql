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
\if :{?app_password}
\else
  \echo '!! Missing -v app_password="''...''" — aborting.'
  \quit 1
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
       CONNECTION LIMIT 30',
    :app_password
)
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'bizcheck_app')
\gexec

-- Re-running rotates the password and re-asserts the restrictions, so a role
-- that was manually widened gets pulled back into line.
SELECT format(
    'ALTER ROLE bizcheck_app WITH PASSWORD %L
       NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS
       CONNECTION LIMIT 30',
    :app_password
)
\gexec

-- CONNECTION LIMIT 30 must stay above DB_POOL_MAX (default 20, see
-- database/db.py) with headroom for psql/pg_dump, or the pool starves.

-- ---------------------------------------------------------------------
-- 2. Database-level privileges.
--    CONNECT only. No CREATE on the database → the role cannot add new
--    schemas next to its own.
-- ---------------------------------------------------------------------
REVOKE ALL ON DATABASE bizzcheck FROM PUBLIC;
GRANT  CONNECT ON DATABASE bizzcheck TO bizcheck_app;

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
--    TRUNCATE and REFERENCES are deliberately NOT granted: the application
--    never truncates and never needs to create foreign keys onto tables it
--    does not own (it owns them all, so ownership covers that anyway).
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
-- 6. Close the doors the app never uses.
--    Note: pg_advisory_xact_lock (used by migrate() to serialise concurrent
--    worker boots) needs NO special privilege — it works for any role.
-- ---------------------------------------------------------------------
REVOKE ALL ON SCHEMA information_schema FROM bizcheck_app;
GRANT  USAGE ON SCHEMA information_schema TO bizcheck_app;   -- migrate() probes it

COMMIT;

-- ---------------------------------------------------------------------
-- 7. Verification — should print f,f,f,f for the four "can it" columns.
-- ---------------------------------------------------------------------
SELECT rolname, rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolconnlimit
  FROM pg_roles
 WHERE rolname = 'bizcheck_app';
