---
name: spec
description: Spec-driven lane (SDD × TDD) for big or risky work — a new module or page set, schema/RPC changes, permissions, money, anything over ~3 files. Writes work/specs/<NNN-slug>/{spec,plan,tasks}.md, gets the user's approval, then implements (test-first in SDD + TDD) and verifies every acceptance criterion. Use when the user says "spec", "plan this", "new module", or the work exceeds the fast-track lane.
---

# Spec lane

Artifacts live in `work/specs/<NNN>-<slug>/`. Create them with `node <scripts>/work.mjs new spec <slug> [--title "…"]` (next free number, files from this skill's `templates/`, board updated). Keep each file short: the spec is a contract, not an essay.

## 1. Ground (no writing yet)
- Search knowledge for the domain words (`knowledge.mjs find …`, path in the session context) and read only the hits that matter.
- Read the code the change touches. Note existing patterns to follow.

## 2. Spec → **stop for approval**
Fill `spec.md`: problem, scope / out of scope, numbered acceptance criteria (`AC-1` … in Given / When / Then), open questions.
- Each AC must be testable. Money, permissions and data rules always get an AC.
- Show the user the ACs and open questions. Do not continue until they approve. Record answers in the spec.

## 3. Plan
Fill `plan.md`: files to add/change, schema and RPC changes, risks. Link knowledge entries with `[[name]]`. A choice with lasting impact → record it with the `decide` skill and link it.

## 4. Tasks
Fill `tasks.md`: ordered checklist, tasks tagged with the ACs they cover. The method in the session context decides the shape:
- **SDD + TDD**: for every AC, a **test task comes before** its implementation task; pick the test cases with ZOMBIES.
- **Traceability**: a test that proves an AC names it as `NNN/AC-n` (spec number), e.g. `it("004/AC-2 rejects a duplicate code", …)`. An AC proven without a test gets a ✅ row in the verification table. `work.mjs trace NNN` lists the gaps; preflight blocks a `done` spec with any.
- **SDD**: an implementation task, then a verification task per AC (a test where there is logic, otherwise a reproducible check).

## 5. Implement
One task at a time. In SDD + TDD follow the `tdd` skill (red → green → refactor). Tick a task only with evidence — the command you ran and its result go under the task. Helper scripts go through the `scripts` skill. If reality contradicts the spec, stop and update the spec with the user first.

## 6. Verify
- Run the project checks (see AGENTS.md) and the tests (`tdd.mjs run`, or `--all` before closing).
- Fill the AC → evidence table at the end of `tasks.md`; every AC needs a test or a reproducible check. Run `work.mjs trace NNN`: no `✗ not covered`.
- Run the `preflight` skill. For non-trivial diffs, ask the `reviewer` agent to review against the spec.

## 7. Close
Set `status: done` in the spec frontmatter and refresh `work.mjs board`. Promote anything a future session must know to knowledge (`knowledge` skill). Summarise what shipped and what the user must do (migrations to apply, env vars, git steps under the project's git flow).
