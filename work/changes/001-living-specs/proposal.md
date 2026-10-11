---
id: 001-living-specs
status: done # draft | approved | done | dropped
merged: 2026-10-11
---

# Living specs and standard notation (EARS + BDD/ATDD + ZOMBIES)

## Why
Kit specs are per-change: once done they are history, and nothing states how the system behaves *now*. Each step also uses ad-hoc wording. Move the kit to **spec-anchored** SDD (OpenSpec's level): living specs per capability are the source of truth, changes carry deltas that merge into them, and every step uses one standard notation — EARS for requirements, Gherkin (BDD) scenarios as acceptance tests (ATDD), ZOMBIES to choose the scenarios and test cases. The two lanes stay: fast-track for small work, spec lane for complex work.

## What changes
- In:
  - **Layout** (`work/`):
    - `specs/<capability>/spec.md` — living spec, source of truth.
    - `changes/NNN-slug/{proposal,plan,tasks}.md` + `changes/NNN-slug/specs/<capability>.md` — a change and its delta specs (`## ADDED` / `## MODIFIED` / `## REMOVED Requirements`).
    - `features/NNN-slug.md` — fast-track, unchanged lane; when it changes behaviour it edits the living spec directly (one requirement or scenario).
    - `qa/` — next to `specs/` (spec 002).
  - **Notation**:
    - Requirement: `### <cap>.R<n> — <name>` + one EARS sentence (ubiquitous `The <system> shall …`, event `When …`, state `While …`, unwanted `If … then …`, optional `Where …`, or a combination).
    - Scenario: `#### <cap>.R<n>.S<m> — <name> @<zombies>` + `Given / When / Then / And` lines. Tag = one ZOMBIES category (`@zero @one @many @boundary @interface @exception @simple`).
    - IDs are stable: never reused, a removed requirement keeps its number retired.
  - **ATDD traceability**: a test proving a scenario starts its name with the scenario ID (`it("auth.R1.S2 blocks the 6th attempt", …)`); a scenario proven without a test gets a ✅ row in the change's verification table.
  - **`plugin/scripts/specs.mjs`** (no deps): `lint` (EARS shape, scenario shape, ZOMBIES tag, unique IDs, delta targets exist), `next <cap>` (next free R/S id), `merge NNN` (apply a done change's deltas to the living specs; refuses on conflicts), `trace [NNN|cap]` (scenario → tests/✅), `list` (capabilities, requirement and scenario counts).
  - **Skills**: `spec` (writes proposal + deltas in the notation; ZOMBIES picks scenarios; closes with `specs.mjs merge`), `feature` (edits the living spec when behaviour changes), `start` (first change = ADDED requirements), `tdd` (test names use scenario IDs), `adopt` (bootstrap living specs for an existing codebase, one capability at a time, user-approved). Notation reference in `plugin/skills/spec/references/notation.md`; global knowledge entries `ears-requirements`, `gherkin-scenarios` (ZOMBIES entry exists).
  - **Preflight**: violation when a done change has uncovered scenarios or was not merged; warning for living-spec scenarios with no test/✅ and for lint findings.
  - **Upgrade path**: existing `work/specs/NNN-slug/` folders move to `work/changes/NNN-slug/` (`spec.md` kept as the proposal); their `NNN/AC-n` traces keep working (legacy, read-only).
  - Board/session context show active changes plus a one-line living-spec summary (capabilities, requirement count) — not the specs themselves.
- Out:
  - Executable Gherkin (Cucumber runners): scenarios are prose acceptance tests mapped to ordinary unit/e2e tests by ID.
  - OpenSpec file compatibility beyond the same delta headings.
  - Moving agent-kit's own `work/` to the new layout (done after release, as its first dogfood change).

## Capabilities
- `specs` — new: living specs, the notation, changes, merge, ids and trace. Acceptance criteria are scenarios in `specs/specs.md` (converted from the original `AC-n` list).

## Open questions
- [x] Q1 ID format → `auth.R1.S2` (confirmed).
- [x] Q2 → work items live in `work/changes/NNN-slug/` (OpenSpec's term), `proposal.md` is the first artifact; done changes stay in place with `status: done`.
- [x] Q3 → rename `spec.md` → `proposal.md`; "spec" only means the living spec (confirmed).

## Links
- Knowledge: [[work-lanes]], [[zombies-testing]]
- Prior art: OpenSpec (delta specs, archive merge), Kiro (EARS), Playwright test plans
