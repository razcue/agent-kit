---
name: shared-zod-schemas
title: One Zod schema per contract, shared by form and server
type: rule
status: active
tags: [typescript, zod, validation]
summary: Each module has row/create/update Zod schemas in packages/shared, used by the form, the server route (readValidatedBody) and tests — never duplicated.
---

Per module export `xRowSchema` (shape returned by the list RPC), `createXSchema` (required fields with DB-matching constraints) and `updateXSchema` (all optional), plus their inferred types. Keep enums next to them. The DB constraints are the last line; the schema is the first. `packages/shared` must not import Nuxt or Vue, so tests and server can use it.
