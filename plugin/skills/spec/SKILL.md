---
name: spec
description: Spec-driven lane (SDD × TDD) for big or risky work — a new module or page set, schema/RPC changes, permissions, money, anything over ~3 files. Opens a change (proposal + delta specs), gets approval, implements test-first, verifies every scenario and merges into the living specs. Use when the user says "spec", "plan this", "new module", or the work exceeds the fast-track lane.
---

# Spec lane

Living specs in `work/specs/<capability>/spec.md` say how the system behaves **now**. A change says how it will differ. Create it with `node <scripts>/work.mjs new change <slug> [--title "…"]` → `work/changes/NNN-slug/{proposal,plan,tasks}.md` (board updated). Delta specs go in `specs/<capability>.md` from this skill's `templates/delta.md`. **Notation** (EARS, scenarios, ZOMBIES tags, ids): `references/notation.md` — read it before writing a delta. Keep files short: contracts, not essays.

## 1. Ground (no writing yet)
- Search knowledge for the domain words (`knowledge.mjs find …`) and read only the hits that matter.
- `specs.mjs list`, then read the living specs of the capabilities this touches — they are the source of truth for current behaviour.
- Read the code the change touches. Note existing patterns.

## 2. Proposal + delta specs → **stop for approval**
- `proposal.md`: why, what changes (in / out), capabilities touched, open questions.
- One delta per capability: ADDED requirements (ids from `specs.mjs next <cap>`), MODIFIED (whole block as it must read after), REMOVED (with reason). Each requirement is one EARS sentence; its scenarios are Given/When/Then, each tagged with the ZOMBIES category it covers. Money, permissions and data rules always get `@exception` / `@boundary` scenarios.
- `specs.mjs lint NNN` must report no errors.
- Show the user the requirements with their scenarios and the open questions. Do not continue until they approve. Record answers in the proposal; set `status: approved`.

## 3. Plan
`plan.md`: files to add/change, schema and RPC changes, risks. If the session context lists QA test data: plan the fixtures per scenario with ZOMBIES (stack skill `references/test-data.md`). Link knowledge with `[[name]]`. A choice with lasting impact → `decide` skill, linked.

## 4. Tasks
`tasks.md`: ordered checklist, each task tagged with the scenario ids it covers. The method in the session context decides the shape:
- **SDD + TDD**: per scenario, a **test task before** its implementation task; extra unit cases with ZOMBIES.
- **SDD**: an implementation task, then a verification task per scenario (a test where there is logic, otherwise a reproducible check).
- **QA** (only when the session context lists it): schema/RPC changes or scenarios needing data → a task "extend seed + purge for <ids>".
- **Traceability**: a test proving a scenario starts its name with the id (`it("auth.R2.S2 shows the login page …")`). Without a test: a ✅ row in the verification table.

## 5. Implement
One task at a time. In SDD + TDD follow the `tdd` skill. Tick a task only with evidence (command + result under it). Helper scripts → `scripts` skill. If reality contradicts the deltas, stop and update them with the user first.

## 6. Verify
- Project checks (AGENTS.md) and tests (`tdd.mjs run`, `--all` before closing).
- Fill the scenario → evidence table in `tasks.md`. `work.mjs trace NNN`: no `✗ not covered`.
- `preflight` skill. Non-trivial diffs: ask the `reviewer` agent to review against the deltas.

## 7. Close
`specs.mjs merge NNN` (all deltas or nothing; resolve conflicts it names; it also refreshes the QA checklist), then `status: done` in the proposal and `work.mjs board`. Promote lasting facts to knowledge. Summarise what shipped and what the user must do (migrations, env vars, git steps under the project's git flow).
