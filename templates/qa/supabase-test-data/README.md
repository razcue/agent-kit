# Test data

Scripts for **dev / test / staging databases only** — they refuse to run anywhere else.

| File | What |
|---|---|
| `env.sql` | Creates `public._env` (which environment a database is). Run it in **every** environment, then set the value once (see the file). |
| `seed.sql` | Creates the test data through the app's RPCs, every row marked `__PREFIX__`. One transaction. |
| `purge.sql` | Deletes only the marked rows, children first. One transaction. |

Fixtures in `seed.sql` are tagged `-- @fixture <scenario ids> @<zombies>`; the QA checklist (`work/qa/checklist.md`) shows which fixture provides each scenario's data, and `agent-kit` `qa.mjs gaps` lists the missing ones.

## Apply

**Supabase SQL Editor (supported path):** paste the whole file and run it. Start again with `purge.sql`, then `seed.sql`.

From a terminal (agents show the command and ask before running it):

```bash
# Supabase CLI (a version whose `supabase db query --help` lists --file)
supabase db query --linked -f __DIR__/purge.sql
supabase db query --linked -f __DIR__/seed.sql      # --local for the local stack, --db-url "<url>" for another

# psql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f __DIR__/seed.sql
```

Never use `supabase db reset` on a shared database to reset test data: it rebuilds the whole database. `purge.sql` removes only the test rows.
