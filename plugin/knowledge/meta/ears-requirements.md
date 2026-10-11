---
name: ears-requirements
title: Requirements in EARS
type: howto
status: active
tags: [specs, sdd, ears, requirements]
summary: Each living-spec requirement is one EARS sentence (The/When/While/If…then/Where …, the <system> shall …): concrete system, one behaviour, measurable.
---

EARS (Easy Approach to Requirements Syntax, Mavin et al., Rolls-Royce 2009) constrains a requirement to one of five templates so it is unambiguous and testable:

| Pattern | Template |
|---|---|
| Ubiquitous | The `<system>` shall `<response>`. |
| Event-driven | When `<trigger>`, the `<system>` shall `<response>`. |
| State-driven | While `<state>`, the `<system>` shall `<response>`. |
| Unwanted behaviour | If `<condition>`, then the `<system>` shall `<response>`. |
| Optional feature | Where `<feature>`, the `<system>` shall `<response>`. |
| Complex | combinations, e.g. While `<state>`, when `<trigger>`, the `<system>` shall `<response>`. |

In agent-kit a requirement is `### cap.R<n> — name` followed by its EARS sentence; `specs.mjs lint` rejects any other shape. Its acceptance tests are the [[gherkin-scenarios]] under it. Part of [[work-lanes]].
