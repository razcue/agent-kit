---
name: adopt
description: Use BEFORE editing AGENTS.md / CLAUDE.md to shrink them or reduce per-session context, and when moving an existing project onto agent-kit — measure, map every section, move procedures into skills, area rules into folder CLAUDE.md files and facts into .knowledge/, one section at a time. Triggers: "adopt agent-kit", "slim AGENTS.md", "too many tokens", context over budget.
---

# Adopt

Nothing is lost: content moves, it isn't deleted, and each move is a small, reviewable step. Respect the project's git policy (the user may run every git command).

## 1. Measure
- `agent-kit context` (total per session, invisible skills) and `agent-kit context --sections` (cost of every heading). Note the starting total.
- If the project has no `agent-kit.json` yet: `npx @razcue/agent-kit init --kind existing` with the user's answers (it appends a managed block to AGENTS.md and backs up what it changes).

## 2. Classify every section (show the table to the user before moving anything)
| The section is… | Destination | Why |
|---|---|---|
| An invariant that applies to almost every task (≤ 15 lines total) | stays in AGENTS.md "Rules" | must always be in context |
| A procedure or step-by-step pattern (SOP, "how to write a route", templates) | a **project skill** `.claude/skills/<name>/SKILL.md` (short description, details in `references/`) | loads only when the task needs it |
| Rules for one area of the code (`server/`, `migrations/`, `app/components/`) | **folder `CLAUDE.md`** in that folder | loads only when files there are touched |
| A business concept, vocabulary, formula, environment fact | `.knowledge/<scope>/` entry (`knowledge` skill) | only its summary loads |
| A past decision with its reasons | `.knowledge/decisions/` (`decide` skill) | same |
| Derivable from the code, git history or package.json; or outdated | delete — after the user confirms | costs tokens for nothing |

## 3. Move, one section per step
For each section, biggest first:
1. Create the destination with the content (rewrite to be shorter if it can be — keep every rule and its reason).
2. Replace the section in AGENTS.md with nothing, or one pointer line when agents must know it exists (`Bitácora patterns: \`bitacora-logging\` skill.`).
3. Re-run `agent-kit context` and report: section → destination → tokens saved.

## 4. Auto-memory
Project rules stored in Claude's auto-memory (`~/.claude/projects/<project>/memory/`) are invisible to teammates and other tools. Propose moving the durable ones (rules, conventions, decisions) into `.knowledge/` (memory type `feedback`/`project` → `rule`/`decision`; `reference` → `reference`) and keep memory for personal notes. Move only what the user approves; leave a one-line memory pointing to the knowledge entry if useful.

## 5. Living specs for the existing code
Living specs (`work/specs/<capability>/spec.md`) are the source of truth future changes merge into. Bootstrap them gradually — never all at once:
1. Propose a capability list (areas users recognise: `auth`, `invoices`, `inventory`…) from routes, pages, RPCs and any help/docs content. The user trims it.
2. One capability per step: write its spec from what the code does **today** (notation: `spec` skill `references/notation.md`) — EARS requirements and the scenarios that matter (rules, money, permissions first). Run `specs.mjs lint <cap>`; show it; the user confirms or corrects.
3. Existing tests that prove a scenario can be renamed to start with its id over time; `specs.mjs trace <cap>` shows the gaps (preflight only warns for living-spec gaps).
4. A capability with no spec yet gets one the first time a change touches it (that change ADDs its requirements).

## 6. Finish
`agent-kit doctor` must pass the context budget. Summarise: tokens before → after, new skills, folder CLAUDE.md files, knowledge entries, and anything left for the user to decide.
