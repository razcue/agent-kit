# Knowledge

Agent-oriented project knowledge: one concept per file, linked with `[[name]]`.
Only each entry's `summary` loads at session start; agents open files on demand.

| Folder | What goes here |
|---|---|
| `business/` | Business concepts, rules, formulas, vocabulary |
| `env/` | Environments, services, URLs, deploy facts (never secrets) |
| `decisions/` | Project decisions (ADRs) — written with the `decide` skill |
| `ux/` | Project-specific UI/UX rules |
| `stack/` | How this project uses the stack, beyond the global rules |
| `local/` | Machine-only notes — gitignored |

Global stack / meta / ux knowledge comes from agent-kit. Indexes are generated:
`node <agent-kit>/plugin/scripts/knowledge.mjs index` (the `knowledge` skill runs it).
