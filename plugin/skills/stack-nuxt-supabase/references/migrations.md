# Migrations and RPCs

Files: `supabase/migrations/YYYYMMDDHHMM_description.sql` (12-digit timestamp). Applied by hand in the Supabase SQL Editor unless the project says otherwise. Every file ends with:

```sql
INSERT INTO public._migrations (filename) VALUES ('YYYYMMDDHHMM_description.sql')
ON CONFLICT (filename) DO NOTHING;
```

## Idempotent — every file can run twice
- `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `DROP … IF EXISTS`, `CREATE OR REPLACE FUNCTION`.
- Changing a function's arguments creates an overload: `DROP FUNCTION IF EXISTS public.fn(<old signature>);` first.
- One-way changes without an `IF` form: wrap in `DO $$ BEGIN IF EXISTS (…information_schema…) THEN … END IF; END $$;`.
- Backfills: scope with `WHERE col IS NULL` so a re-run can't clobber newer data. Seeds: `ON CONFLICT DO NOTHING`.

## Never edit a committed migration
Fix forward with a new file that redefines the object. Check `git log --oneline -- <file>` when unsure.

## Grants
Only `service_role` reads tables and executes functions (the first migration sets default privileges). Never `GRANT … TO anon` / `TO authenticated`; don't rely on RLS for scoping.

## RPC conventions
| Op | Name | Returns | Notes |
|---|---|---|---|
| List | `list_<items>(filters…)` | `jsonb` (`{ rows, total }` when paginated) | `sql STABLE`; LIMIT/OFFSET inside a CTE before `jsonb_agg` |
| Create | `create_<item>(p_…)` | `jsonb` row | catch `unique_violation` with a readable message |
| Update | `update_<item>(p_id, p_… nullable)` | `void` | `IF NOT FOUND THEN RAISE EXCEPTION` |
| Delete | `delete_<item>(p_id)` | `void` | catch `foreign_key_violation` → "has related data" |

All `SECURITY DEFINER`, `plpgsql` when validating. Foreign keys are `ON DELETE RESTRICT`. Use UUID ids in the API; keep human-readable codes for display.

## Checking the live database
If `.mcp.json` has the read-only `supabase` server, use it to confirm a migration was applied (`_migrations` rows) and to read the live definition of a table or function before changing it. It can't write — migrations are still applied by the user.

## Finding the current definition of a function
Many migrations redefine the same function: search newest first — `grep -l "FUNCTION public.<name>" supabase/migrations/*.sql | sort | tail -1`.
