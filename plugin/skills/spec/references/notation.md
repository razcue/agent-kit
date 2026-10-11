# Notation — EARS · Gherkin (BDD/ATDD) · ZOMBIES

One notation at every step: **proposal** (why/scope) → **EARS requirement** → **Given/When/Then scenarios** tagged with **ZOMBIES** → **tests named by scenario id** → QA checklist.

## Living spec — `work/specs/<capability>/spec.md`

```markdown
---
capability: auth
retired: [auth.R1, auth.R2.S2]   # written by `specs.mjs merge`; never reuse these ids
---

# Auth

## Purpose
Who can sign in and how. (1-3 lines)

## Requirements

### auth.R2 — Session restore
While a session is stored, the app shall restore it on reload.

#### auth.R2.S1 — Reload keeps the user signed in @simple
- Given a signed-in user
- When the page reloads
- Then the user is still signed in

#### auth.R2.S2 — Expired session @exception
- Given a stored session that has expired
- When the page reloads
- Then the login page is shown
```

- **Capability** = a folder name, lower-case words with `-` (`auth`, `invoices`, `user-roles`): one area of behaviour users recognise. Not a page, not a table.
- **IDs**: `cap.R<n>` requirement, `cap.R<n>.S<m>` scenario. Get them from `specs.mjs next <cap>` / `next <cap>.R<n>` — they count living, retired and pending-delta ids. Never renumber or reuse.

## EARS — one sentence per requirement

| Pattern | Template | Use for |
|---|---|---|
| Ubiquitous | The `<system>` shall `<response>`. | always true |
| Event | When `<trigger>`, the `<system>` shall `<response>`. | reacting to something |
| State | While `<state>`, the `<system>` shall `<response>`. | true during a state |
| Unwanted | If `<condition>`, then the `<system>` shall `<response>`. | errors, failures, abuse |
| Optional | Where `<feature/config>`, the `<system>` shall `<response>`. | only with a feature on |
| Complex | While `<state>`, when `<trigger>`, the `<system>` shall `<response>`. | combinations |

- `<system>` is concrete: "the BFF", "the invoices page", "the seed script" — not "it".
- One behaviour per requirement; split "and" into two requirements when they can fail separately.
- Measurable: numbers, limits, codes (`within 15 minutes`, `answers 409 PERIODO_CERRADO`).

## Scenarios — Gherkin, one ZOMBIES tag each

`#### cap.R1.S1 — <name> @<tag>` then `- Given …` / `- When …` / `- Then …` (`- And …` / `- But …` extend the previous step). Concrete domain values, observable outcomes (what a user or caller sees), no implementation detail.

Pick scenarios per requirement with ZOMBIES and tag each with the one category it covers:

| Tag | Ask | Example |
|---|---|---|
| `@zero` | nothing / empty | no invoices → empty state |
| `@one` | the single basic case | one line totals correctly |
| `@many` | several, order, duplicates | 3 lines, 2 currencies |
| `@boundary` | limits and edges | 5th failure blocks; last day of a period |
| `@interface` | the contract | 403 for another provincia; API shape |
| `@exception` | bad input, failure | invalid code → clear error, nothing saved |
| `@simple` | the happy path | create and see it in the list |

Every requirement needs at least one scenario; `specs.mjs lint` warns when none is `@exception` or `@boundary`. Keep only the categories that apply.

## ATDD — scenarios are the acceptance tests

- A test that proves a scenario **starts its name with the id**: `it("auth.R2.S2 shows the login page for an expired session", …)`.
- A scenario proven without a test (UI look, manual flow, SQL check) gets a ✅ row in the change's `tasks.md`: `| auth.R2.S2 | manual: reloaded with an expired token, login shown | ✅ |`.
- `specs.mjs trace [NNN|cap]` lists `✗ not covered`; preflight blocks a done change with gaps.

## Delta spec — `work/changes/NNN-slug/specs/<capability>.md`

```markdown
# Delta — auth

## Purpose            ← only for a new capability
## ADDED Requirements ← new ids from `specs.mjs next`
## MODIFIED Requirements ← the whole block as it must read after the change; scenarios left out are retired
## REMOVED Requirements  ← heading + `Reason: …`
```

`specs.mjs merge NNN` applies every delta of the change at once (all or nothing), retires removed ids and marks the proposal `merged: <date>`.
