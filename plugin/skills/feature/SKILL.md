---
name: feature
description: Use BEFORE making any small code change — a fix, a tweak, a small UI addition (≤3 files, no schema, permission or money change). Opens a work/features file with goal, tasks and evidence so the work survives session restarts. Triggers: "fix", "tweak", "small change", "change X to Y", "add X to the page". Bigger or riskier work → `spec` skill.
---

# Fast-track lane

1. **Check the lane.** More than ~3 files, a migration, a permission or a money rule → stop and use the `spec` skill instead. Say so in one line.
2. **Open a feature file** with `node <scripts>/work.mjs new feature <slug> [--title "…"]` (next free number, updates the board) — skip it only for a one-line edit. It looks like:
   ```markdown
   ---
   status: in-progress # in-progress | done
   ---
   # <Goal in one line>
   - [ ] <task>
     - evidence: <command → result, or what you checked>
   ```
3. **Do the work.** Follow existing patterns and the knowledge entries listed at session start. If the method is **SDD + TDD**, any logic change goes through the `tdd` loop (failing test first); in **SDD**, add or update a test when the change has logic. Helper scripts go through the `scripts` skill.
4. **Tick tasks only with evidence**: the check you ran and its result, written under the task.
5. **Finish**: run the project checks (AGENTS.md), set `status: done` (a new session sees active work files automatically, so keep `status` and the next open task accurate), and tell the user what changed and anything they must do (under the project's git flow). A new lasting fact → `knowledge` skill.
