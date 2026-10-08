---
name: idempotent-migrations
title: Migrations can run twice
type: rule
status: active
tags: [sql, migrations, supabase]
summary: Every SQL migration must be safely re-runnable — IF [NOT] EXISTS, guarded DO blocks, scoped backfills, ON CONFLICT seeds, drop old function signatures first.
---

Migrations are applied by hand (SQL Editor) and sometimes re-run after a partial failure, so a file that assumes a clean state breaks the workflow.

- `ADD COLUMN IF NOT EXISTS`, `DROP … IF EXISTS`, `CREATE TABLE IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`.
- Changing a function's arguments creates an overload: `DROP FUNCTION IF EXISTS public.fn(<old args>)` first.
- One-way structural changes without an `IF` form: wrap in a `DO $$ … IF EXISTS (… information_schema …) …$$` guard.
- Backfills: `WHERE target IS NULL` so a re-run can't clobber newer data. Seeds: `ON CONFLICT DO NOTHING`.
- Track: `INSERT INTO public._migrations (filename) VALUES ('…') ON CONFLICT (filename) DO NOTHING;`

Related: [[never-edit-committed-migrations]].
