# Test data (seed / purge)

Only when `agent-kit.json` has `qa.testData: true`. Files in `qa.testDataDir` (default `supabase/test-data/`): `env.sql`, `seed.sql`, `purge.sql`, `README.md`. Marker prefix: `qa.testPrefix` (default `TEST_`).

## When to touch them
- A change that adds or alters tables / RPCs, or whose scenarios need data to be tried by hand → a task "extend seed + purge for <scenario ids>" before the change is done.
- Every table the seed writes to (directly or through an RPC) must be cleaned by `purge.sql`. Preflight warns when migrations change and neither file does.

## Writing fixtures — ZOMBIES on data
One section per fixture, tagged with the scenarios it serves and the ZOMBIES category it covers:

```sql
-- @fixture invoices.R2.S3 invoices.R2.S4 @boundary
SELECT public.create_invoice(p_codigo => 'TEST_INV_EDGE', p_fecha => current_date - 15, …);
```

| Tag | Data to create |
|---|---|
| `@zero` | a parent with no children (client without invoices, empty warehouse) |
| `@one` / `@simple` | one ordinary, valid record per main entity |
| `@many` | several records: lists, totals, pagination, ordering, duplicates |
| `@boundary` | limits: max lengths, 0 and maximum amounts, first/last day of a period, rounding edges (0.0005) |
| `@interface` | one record per role / provincia / location, so scoping and 403s can be checked |
| `@exception` | inactive, cancelled, expired, half-finished and other invalid states the UI must handle |

`qa.mjs gaps` lists scenarios without a fixture (fine when a scenario needs no data) and fixtures naming unknown scenarios (always fix).

## Rules
- **Through the app's RPCs**, not raw INSERTs, so derived state (balances, stock, audit rows) is consistent. Raw INSERT only where no RPC exists or it refuses past dates — say why in a comment.
- **Mark every row**: codes and names start with the prefix. Match with `starts_with(col, 'TEST_')`, never `LIKE 'TEST_%'` (`_` is a LIKE wildcard).
- **Relative dates**: `current_date - 30`, never `'2026-01-15'`.
- **One transaction** per file (`BEGIN; … COMMIT;`) and the `_env` guard first — keep both from the template.
- **Purge order**: children before parents (FKs are `ON DELETE RESTRICT`); every DELETE scoped to marked rows or their children. Append-only tables the app forbids deleting from are left alone.
- **Re-runnable**: seed refuses when its rows exist ("run purge.sql first"); purge then seed rebuilds.
- **`_env`** exists in every environment (`env.sql`, or the init migration in the monorepo template); set once per environment. No row or `production` → both scripts refuse.

## Applying (the user decides)
The SQL Editor is the supported path: tell the user which file to run. When the Supabase CLI or psql is available you may show the command and run it **only after the user approves**:

```bash
supabase db query --linked -f supabase/test-data/purge.sql   # --local / --db-url "<url>"
supabase db query --linked -f supabase/test-data/seed.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/test-data/seed.sql
```

Never `supabase db reset` to reset test data on a shared database — it rebuilds everything.
