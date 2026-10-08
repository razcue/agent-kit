---
name: decide
description: Record an architecture or design decision (ADR) in the right scope — project decisions in .knowledge/decisions, cross-project ones in global meta. Use when a choice with lasting impact is made or asked about ("let's go with…", "we decided…", "should we use X or Y" once settled), or when an earlier decision is replaced.
---

# Decide

1. **Search** existing decisions (`knowledge.mjs find <words>`). If one already covers it, update or supersede it — don't duplicate.
2. **Scope:** only this project → `.knowledge/decisions/`. Every project of this stack, or the way of working → global `meta/` (see the `knowledge` skill for writability).
3. **Status:** you may draft with `status: proposed`. Only the user accepts: set `active` after they confirm.
4. **Write** `<scope>/<name>.md`:
   ```markdown
   ---
   name: bff-only-data-access
   title: The browser never calls the database directly
   type: decision
   status: proposed
   tags: [architecture, security]
   summary: All data goes through server routes with the service key; the browser uses Supabase for auth only.
   date: YYYY-MM-DD
   supersedes: # name of the replaced decision, if any
   ---

   ## Context
   The forces at play, in 2-5 lines.

   ## Decision
   What we do, stated as a rule.

   ## Consequences
   What gets easier, what gets harder, what to watch.
   ```
5. **Superseding:** set the old entry's `status: superseded` and add `Superseded by [[new-name]].` at its top.
6. Run `knowledge.mjs index` (+ `--global` if global) and `check`. If the decision changes a rule in AGENTS.md, point out the line to update.
