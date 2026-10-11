# Work

<!-- Managed by agent-kit (refreshed on init/upgrade). -->

| Path | What |
|---|---|
| `specs/<capability>/spec.md` | **Living specs** — how the system behaves now; the source of truth. EARS requirements (`cap.R1`) with Given/When/Then scenarios (`cap.R1.S1 … @boundary`, one ZOMBIES tag each). |
| `changes/NNN-slug/` | **Changes** (`spec` skill): `proposal.md` (why, scope) → `specs/<capability>.md` delta specs (ADDED / MODIFIED / REMOVED) → `plan.md` → `tasks.md`. Merged into the living specs when done (`specs.mjs merge NNN`); the folder stays as the record of why. |
| `features/NNN-slug.md` | Fast-track work (`feature` skill); a behaviour change edits its living spec in place. |
| `BOARD.md` | Generated overview (`work.mjs board`). |

Tests that prove a scenario start their name with its id (`it("auth.R2.S2 …")`); `specs.mjs trace` lists gaps. Tools: `agent-kit specs lint|next|merge|trace|list`, `agent-kit work status|board|trace|new`.
