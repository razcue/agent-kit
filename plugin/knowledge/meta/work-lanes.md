---
name: work-lanes
title: Three work lanes, two methods
type: concept
status: active
tags: [workflow, sdd, tdd]
summary: Answer (read-only), Fast-track (≤3 files, no schema/permission/money) or Spec (proposal + deltas → approval → verified scenarios → merged living specs).
---

The lane is named before starting so the user can redirect early. Ticks require evidence (command + result).

SDD is **spec-anchored**: living specs in `work/specs/<capability>/spec.md` are the source of truth for how the system behaves now ([[ears-requirements]] + [[gherkin-scenarios]]).
- **Fast-track** keeps a small feature file in `work/features/` so progress survives restarts; a behaviour change edits its living spec in place. Work that grows past the threshold moves to Spec.
- **Spec** opens a change in `work/changes/<NNN-slug>/`: `proposal.md` (why, scope), delta specs `specs/<capability>.md` (ADDED / MODIFIED / REMOVED requirements), `plan.md`, `tasks.md`. When done, `specs.mjs merge` applies the deltas to the living specs; the change stays as the record of why.

The method is chosen at setup (`methodology` in `agent-kit.json`):
- **SDD** — each scenario is proven by a test or a reproducible check.
- **SDD + TDD** — every behaviour change starts with a failing test (`tdd` skill, cases by [[zombies-testing]]); `preflight` blocks changed logic files without a test.

See [[knowledge-scopes]].
