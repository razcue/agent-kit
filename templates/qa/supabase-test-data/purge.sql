-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- __DIR__/purge.sql — removes ONLY the test data (rows marked '__PREFIX__').
--
-- dev / test / staging only. One transaction: all or nothing. Real data is
-- never touched: every DELETE is scoped to marked rows or their children.
--
-- Keep it complete: every table seed.sql writes to (directly or through an
-- RPC) appears here, children before parents (foreign keys are ON DELETE
-- RESTRICT). Preflight warns when migrations change and this file doesn't.
-- Tables the app forbids deleting from (append-only logs) are left alone.
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

-- ── Children first, then parents ────────────────────────────────────────
-- DELETE FROM public.<child>  WHERE <parent>_id IN (SELECT id FROM public.<parent> WHERE starts_with(codigo, '__PREFIX__'));
-- DELETE FROM public.<parent> WHERE starts_with(codigo, '__PREFIX__');

COMMIT;
