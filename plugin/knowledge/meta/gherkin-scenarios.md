---
name: gherkin-scenarios
title: Scenarios as acceptance tests (BDD / ATDD)
type: howto
status: active
tags: [specs, sdd, bdd, atdd, gherkin, testing]
summary: Requirements have Given/When/Then scenarios with one ZOMBIES tag; they are the acceptance tests — a test proving one starts its name with the scenario id.
---

- **BDD** (Behaviour-Driven Development, Dan North): behaviour described as examples in the domain's words — `Given` context, `When` action, `Then` observable outcome (`And` / `But` extend a step).
- **ATDD** (Acceptance-Test-Driven Development): the examples are agreed before code and become the acceptance tests.
- **ZOMBIES** chooses which examples to write: tag each scenario `@zero @one @many @boundary @interface @exception @simple` ([[zombies-testing]]); `specs.mjs lint` warns when a requirement has no `@exception` / `@boundary`.

Traceability: `it("auth.R2.S2 shows the login page for an expired session")`; manual proof → `| auth.R2.S2 | manual: … | ✅ |` in the change's tasks.md. `specs.mjs trace` lists gaps; preflight blocks a done change with any. Scenario ids are stable and never reused, so tests, QA runs and seed fixtures keep pointing at the right behaviour. Requirements: [[ears-requirements]].
