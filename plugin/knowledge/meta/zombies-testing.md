---
name: zombies-testing
title: Choosing test cases with ZOMBIES
type: howto
status: active
tags: [testing, tdd, zombies, scripts]
summary: Pick test cases with ZOMBIES — Zero, One, Many, Boundaries, Interface, Exceptions, Simple — keeping only the categories that apply and starting with the simplest.
---

| Letter | Ask | Example in this stack |
|---|---|---|
| **Z**ero | What happens with nothing? | empty list → `{ rows: [], total: 0 }`; amount `0`; no args |
| **O**ne | One item / the basic case | one invoice line totals correctly |
| **M**any | Several items, order, duplicates | three lines in two currencies; same SKU twice |
| **B**oundaries | Limits and edges | `0.0005` rounding to 3 decimals; max length of a code; first/last day of a period |
| **I**nterface | Is the contract right? | function signature, CLI args and exit code, the Zod schema shape |
| **E**xceptions | Bad input and failures | invalid code → clear error; missing env var → non-zero exit; RPC error mapped to 400 |
| **S**imple | Start simple, grow | write the Zero/One cases first, then Many and Boundaries |

Use real values from the domain and constraints (DB checks, schema rules). Report only the categories that apply; don't pad with trivial tests. Used by [[work-lanes]] (SDD + TDD) and the `scripts` skill.
