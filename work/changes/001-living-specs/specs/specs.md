# Delta — specs

## Purpose
Living specs as the source of truth: one notation (EARS requirements, Given/When/Then scenarios with one ZOMBIES tag), changes whose deltas merge into the living specs, stable ids, and every scenario traced to a test or a check.

## ADDED Requirements

### specs.R1 — Requirements in EARS
When `specs.mjs lint` checks a requirement, the linter shall accept only an EARS sentence (ubiquitous, event, state, unwanted, optional or complex) and report any other sentence with its id and the expected patterns.

#### specs.R1.S1 — Every pattern recognised @many
- Given one sentence per EARS pattern and one free-text sentence
- When each is classified
- Then the six patterns are recognised and the free text is not

#### specs.R1.S2 — Free text reported @exception
- Given a living spec whose requirement `auth.R1` reads "Throttle logins."
- When `specs.mjs lint` runs
- Then it reports `auth.R1: requirement is not EARS` with the expected patterns and exits 1

### specs.R2 — Scenario notation
When `specs.mjs lint` checks a scenario, the linter shall report a missing or unknown ZOMBIES tag, missing or out-of-order Given / When / Then steps, a duplicate id, an id outside its requirement, an id outside the capability and a requirement without scenarios.

#### specs.R2.S1 — Malformed scenarios reported @exception
- Given scenarios without a tag, with `@happy`, without a Then step, with a duplicate id and with an id under another requirement
- When `specs.mjs lint` runs
- Then each problem is reported with the scenario's id

#### specs.R2.S2 — Happy path only @boundary
- Given a requirement whose scenarios are all `@simple`
- When `specs.mjs lint` runs
- Then it warns to consider `@exception` or `@boundary`, without an error

### specs.R3 — Merge into the living specs
When `specs.mjs merge NNN` runs on an approved or done change, the merger shall append ADDED requirements, replace MODIFIED blocks, remove REMOVED requirements, retire removed ids and the scenarios a MODIFIED block leaves out, and mark the proposal `merged:` with the date.

#### specs.R3.S1 — Added, modified, removed @many
- Given a delta that ADDs `auth.R3`, MODIFIES `auth.R2` and REMOVES `auth.R1`
- When it is merged
- Then the living spec has R2 replaced and R3 appended, R1 gone, and `retired: [auth.R1, auth.R2.S2]`

#### specs.R3.S2 — New capability @one
- Given a delta for `billing`, which has no living spec yet
- When it is merged
- Then `work/specs/billing/spec.md` is created with its purpose and requirements

#### specs.R3.S3 — Second merge changes nothing @boundary
- Given a change already merged
- When `specs.mjs merge` runs again
- Then it says so and no file changes

### specs.R4 — Merge conflicts
If a delta modifies or removes a requirement missing from the living spec or adds a taken or retired id, then the merger shall name every conflict and write nothing.

#### specs.R4.S1 — Conflicts named @exception
- Given deltas that REMOVE a missing `auth.R7`, ADD a taken `auth.R2`, ADD a retired `auth.R3` and MODIFY a missing `auth.R8`
- When each is merged
- Then each conflict is named and nothing is merged

#### specs.R4.S2 — All or nothing @exception
- Given a change with one valid delta and one conflicting delta
- When it is merged
- Then no living spec changes and the proposal is not marked merged

### specs.R5 — Next free id
When `specs.mjs next` runs for a capability or a requirement, the CLI shall print the id after every living, retired and pending-delta id.

#### specs.R5.S1 — Retired and pending ids skipped @boundary
- Given `auth` with requirements up to R2, `auth.R7` retired and a pending delta adding `auth.R3`
- When the next ids are asked for
- Then they are `auth.R8` and `auth.R4`, and scenario ids skip retired and pending ones too

### specs.R6 — Scenario trace
When `specs.mjs trace` or `work.mjs trace` runs, the CLI shall show for each scenario the tests whose name contains its id, its ✅ verification row, or "not covered".

#### specs.R6.S1 — Tests and checks @one
- Given a test named `auth.R1.S1 …` and a ✅ row for `auth.R2.S2`
- When the scenarios are traced
- Then those two are covered and `auth.R2.S1` is not (`auth.R2.S10` doesn't count for `auth.R2.S1`)

#### specs.R6.S2 — A change traced by scenario id @interface
- Given a change with a delta and a ✅ row in its tasks
- When the change is traced
- Then its rows are the delta's scenario ids

### specs.R7 — Preflight on changes and specs
If a done change has an uncovered scenario or is not merged into the living specs, then preflight shall report a violation, and it shall warn about approved changes with gaps, uncovered living-spec scenarios and notation errors.

#### specs.R7.S1 — Done blocks, approved warns @exception
- Given a done change with an uncovered scenario, not merged, and an approved change with gaps
- When preflight runs
- Then the done change is two violations and the approved one a warning

#### specs.R7.S2 — Notation errors as warnings @interface
- Given an open delta whose requirement is not EARS
- When preflight runs
- Then the lint error appears as a warning with the file and id

### specs.R8 — Old layout upgraded
When `agent-kit upgrade` runs on a project with `work/specs/NNN-slug/` folders, the CLI shall move them untouched to `work/changes/` and keep their `NNN/AC-n` traces working.

#### specs.R8.S1 — Folders moved, traces kept @one
- Given `work/specs/004-old/spec.md` with `**AC-1**` and a living spec `work/specs/auth/`
- When the layout is migrated twice
- Then the folder is in `work/changes/004-old/` unchanged, the living spec stays, the second run moves nothing, and a `004/AC-1` test still covers it

#### specs.R8.S2 — Through the CLI @interface
- Given an initialised project with `work/specs/003-old/`
- When `agent-kit upgrade --yes` runs
- Then it prints the move and the folder is in `work/changes/`

### specs.R9 — The spec lane writes the notation
When the `spec` skill opens a change for complex work, the agent shall write a proposal and delta specs whose requirements are EARS and whose scenarios are Given/When/Then with ZOMBIES tags, passing `specs.mjs lint`.

#### specs.R9.S1 — Live spec lane @simple
- Given a scaffolded monorepo and a request for an invoices module
- When Claude Code runs it with the plugin
- Then the change has a proposal and lint-clean deltas

### specs.R10 — Fast-track keeps the living spec true
When a fast-track change alters behaviour that a living spec describes, the `feature` skill shall update that requirement or scenario in place and `specs.mjs lint` shall pass.

#### specs.R10.S1 — Live fast-track lane @simple
- Given a living spec describing a "Sign out" button
- When Claude Code renames it to "Log out"
- Then the code and the living spec both say "Log out" and lint passes
