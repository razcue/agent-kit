-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- __DIR__/env.sql
--
-- Which environment this database is. seed.sql and purge.sql refuse to run
-- unless it says dev, test or staging. Create the table in EVERY environment
-- (production included), then set its value once per environment:
--
--   INSERT INTO public._env (name) VALUES ('dev')        -- or 'test' / 'staging' / 'production'
--   ON CONFLICT (id) DO UPDATE SET name = excluded.name;
--
-- No row (or 'production') = test data refused. Re-runnable.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS public._env (
  id   boolean PRIMARY KEY DEFAULT true CHECK (id),
  name text NOT NULL CHECK (name IN ('dev', 'test', 'staging', 'production'))
);

COMMENT ON TABLE public._env IS
  'One row: which environment this database is (dev/test/staging/production). Test-data scripts run only on dev/test/staging.';
