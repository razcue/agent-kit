---
name: work-lanes
title: Three work lanes, two methods
type: concept
status: active
tags: [workflow, sdd, tdd]
summary: Every request is Answer (read-only), Fast-track (≤3 files, no schema/permission/money change) or Spec (spec → approval → tasks → verified ACs); the project method is SDD or SDD + TDD (tests first, enforced by preflight).
---

The lane is named before starting so the user can redirect early. Fast-track keeps a small feature file in `work/features/` so progress survives restarts; Spec keeps `spec.md`, `plan.md`, `tasks.md` in `work/specs/<NNN-slug>/`. A fast-track change that grows past the threshold moves to Spec. Ticks require evidence (command + result).

The method is chosen at setup (`methodology` in `agent-kit.json`):
- **SDD** — each acceptance criterion is proven by a test or a reproducible check.
- **SDD + TDD** — every behaviour change starts with a failing test (`tdd` skill, cases by [[zombies-testing]]); `preflight` blocks changed logic files without a test.

See [[knowledge-scopes]].
