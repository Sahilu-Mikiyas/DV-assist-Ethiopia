-- Run once as the database administrator after applying migrations.
-- Set role passwords interactively with psql's `\\password role_name` command;
-- never put credentials in this file or in shell history.
-- These roles must not own the database, schema, tables, or append-only trigger function.

\if :{?database_name}
\else
\set database_name ethio_dv_assist
\endif

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dvassist_runtime') THEN
        CREATE ROLE dvassist_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dvassist_backup') THEN
        CREATE ROLE dvassist_backup LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
    END IF;
END
$$;

ALTER ROLE dvassist_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
ALTER ROLE dvassist_backup LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
ALTER ROLE dvassist_runtime SET search_path = public;
ALTER ROLE dvassist_backup SET search_path = public;

GRANT CONNECT ON DATABASE :"database_name" TO dvassist_runtime, dvassist_backup;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE CREATE ON SCHEMA public FROM dvassist_runtime, dvassist_backup;
GRANT USAGE ON SCHEMA public TO dvassist_runtime, dvassist_backup;

-- API tables: current handlers only need read, insert, and update access.
GRANT SELECT, INSERT, UPDATE ON TABLE
    users, auth_challenges, sessions, role_grants, cases, auth_rate_limits, auth_email_outbox
TO dvassist_runtime;

-- Append-only audit/event rows may be read and inserted, never changed or removed.
GRANT SELECT, INSERT ON TABLE case_events, audit_events TO dvassist_runtime;
REVOKE UPDATE, DELETE, TRUNCATE ON TABLE case_events, audit_events FROM dvassist_runtime;

-- A backup login can read the database but cannot mutate application data.
GRANT SELECT ON ALL TABLES IN SCHEMA public TO dvassist_backup;

