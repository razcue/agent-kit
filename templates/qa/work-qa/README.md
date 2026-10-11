# QA

<!-- Managed by agent-kit (refreshed on init/upgrade). -->

| File | What |
|---|---|
| `checklist.md` | Generated from the living specs (`work/specs/`): one item per scenario — EARS requirement, Given / When / Then steps, ZOMBIES tag, the test-data fixture behind it. Never edited by hand: `qa.mjs sync` (also run by `specs.mjs merge`). |
| `checklist.html` | The same checklist as an offline page: record pass / fail / blocked / n/a and notes, then **Export run** and save the file in `runs/`. |
| `runs/YYYY-MM-DD.md` | One QA pass: a result and a note per scenario, plus the scenario's text hash at run time. Start one with `qa.mjs run`. |

`qa.mjs status` shows the latest result per scenario; a scenario whose text changed after it passed shows **re-check**, one never tested shows **never run**.
