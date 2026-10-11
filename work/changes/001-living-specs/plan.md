# Plan — Living specs and standard notation (EARS + BDD/ATDD + ZOMBIES)

## Changes
| Area | File | Change |
|------|------|--------|
| Script | `plugin/scripts/specs.mjs` (+ `specs.test.mjs`) | parse living specs / deltas; `lint`, `next`, `merge`, `trace`, `list` (pure functions, guarded main) |
| Script | `plugin/scripts/work.mjs` | `new change <slug>` (was `new spec`; alias kept), collect `work/changes/`, legacy `NNN/AC-n` trace kept for changes without deltas |
| Script | `plugin/scripts/preflight.mjs` | unmerged/uncovered done change → violation; living-spec gaps + lint → warnings |
| Script | `plugin/scripts/session-start.mjs` / `context.mjs` | one-line living-spec summary; active changes |
| CLI | `cli/lib/upgrade.mjs` | move `work/specs/NNN-*` → `work/changes/` (backup, report) |
| CLI | `cli/lib/init.mjs` | managed AGENTS.md block: lanes + notation line; `work/specs/`, `work/changes/` |
| Skills | `spec` (+ `templates/proposal.md`, `templates/delta.md`, `references/notation.md`), `feature`, `start`, `tdd`, `adopt` | notation, deltas, merge on close, living-spec edits in fast-track, bootstrap for existing code |
| Knowledge | `plugin/knowledge/meta/ears-requirements.md`, `gherkin-scenarios.md`; update `work-lanes`, `zombies-testing` | standard notation entries |
| Templates | `templates/base/work/README.md` | new layout |
| Site / docs | `site/index.html`, `site/es/index.html`, README, CHANGELOG | spec-anchored workflow |
| E2E | `scripts/e2e/triggers.mjs`, `live.mjs` | spec skill writes an EARS + scenario delta |

## Decisions
- Spec-anchored, not spec-as-source: code stays the implementation; living specs state behaviour; tests link by scenario ID.
- One notation per step: proposal (why/scope) → EARS requirement → Gherkin scenarios tagged with ZOMBIES → tests named by scenario ID → QA checklist (002).
- IDs stable and never reused (retired list in the spec frontmatter) so tests, QA runs and fixtures never point to the wrong thing.
- Merge is a script (deterministic); writing requirements is the skill (judgment).

## Risks
- Breaking projects on the old layout → upgrade migration + legacy trace (specs.R8).
- Skill token cost grows → notation lives in `references/notation.md`, loaded on demand; lint test caps descriptions.
- EARS lint false positives on natural language → match the leading keyword pattern only (`The … shall`, `When …, the … shall`, …), case-insensitive.
