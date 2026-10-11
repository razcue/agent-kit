-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 000000000000_init.sql
--
-- Migration tracking, environment flag (_env) + Data API lockdown: only service_role (the BFF) reads
-- tables and executes functions. The anon key ships in the browser, so
-- anything granted to anon/authenticated would bypass every server check.
-- Re-runnable.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS public._migrations (
  filename   text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;

GRANT ALL     ON ALL TABLES    IN SCHEMA public TO service_role;
GRANT ALL     ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES    FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL     ON TABLES    TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL     ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO service_role;

-- Which environment this database is (dev / test / staging / production). Test-data
-- scripts (supabase/test-data/) refuse to run unless it says dev, test or staging.
-- Set it once per environment:
--   INSERT INTO public._env (name) VALUES ('dev') ON CONFLICT (id) DO UPDATE SET name = excluded.name;
CREATE TABLE IF NOT EXISTS public._env (
  id   boolean PRIMARY KEY DEFAULT true CHECK (id),
  name text NOT NULL CHECK (name IN ('dev', 'test', 'staging', 'production'))
);

INSERT INTO public._migrations (filename) VALUES ('000000000000_init.sql')
ON CONFLICT (filename) DO NOTHING;
