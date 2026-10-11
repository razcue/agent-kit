-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- __DIR__/seed.sql — test data for dev / test / staging databases ONLY.
--
-- Run the whole file (SQL Editor, or a command from README.md). One
-- transaction: if anything fails, nothing changes. Run purge.sql first to
-- start again from a clean state.
--
-- Rules (stack skill references/test-data.md):
--   • Create data through the app's RPCs, not raw INSERTs, so derived state
--     (balances, stock, audit) stays consistent.
--   • Mark every row: codes / names start with '__PREFIX__' — purge.sql
--     deletes only marked rows. Match with starts_with(), never LIKE ('_' is
--     a LIKE wildcard).
--   • Dates relative to current_date, never fixed dates.
--   • One section per fixture, tagged with the scenarios it serves and its
--     ZOMBIES category — qa.mjs maps them into the QA checklist:
--       -- @fixture invoices.R2.S3 invoices.R2.S4 @boundary
--     Cover what applies: zero (an entity with no children), one, many,
--     boundaries (limits, period edges), interface (every role / scope),
--     exceptions (inactive, cancelled, invalid states).
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BEGIN;

-- Guard: refuse anywhere but dev / test / staging (see env.sql).
DO $$
BEGIN
  IF to_regclass('public._env') IS NULL THEN
    RAISE EXCEPTION 'test data refused: public._env is missing — run env.sql and set this environment';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public._env WHERE name IN ('dev', 'test', 'staging')) THEN
    RAISE EXCEPTION 'test data refused: public._env does not flag this database as dev / test / staging';
  END IF;
END $$;

-- Guard: one seed at a time — purge.sql removes the previous one.
-- Point it at the first table the seed writes to:
-- DO $$ BEGIN
--   IF EXISTS (SELECT 1 FROM public.<table> WHERE starts_with(codigo, '__PREFIX__')) THEN
--     RAISE EXCEPTION 'test data already present — run purge.sql first';
--   END IF;
-- END $$;

-- ── Fixtures ────────────────────────────────────────────────────────────
-- One section per fixture. Example:
--
-- -- @fixture <cap>.R1.S1 @simple
-- SELECT public.create_<item>(p_codigo => '__PREFIX__ONE', p_label => 'Test one');

COMMIT;
