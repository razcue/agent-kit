---
name: stack-nuxt-supabase
description: Use BEFORE adding or changing pages, components, server routes (apps/*/server/api), auth, Zod schemas, SQL migrations or RPCs in the Nuxt 4 + shadcn-vue + Tailwind v4 + Supabase monorepo (apps/web, apps/app, apps/docs, packages/ui, packages/shared). Conventions and patterns, details in references/.
---

# Nuxt + Supabase stack

Open only the reference you need:

| Task | Reference |
|---|---|
| Server routes, auth, Supabase access, permissions | `references/bff.md` |
| SQL migrations, RPCs, grants | `references/migrations.md` |
| Pages, components, shadcn-vue, forms, tables | `references/ui.md` |
| Workspaces, shared packages, layers, commands | `references/monorepo.md` |

## Non-negotiables
- **The browser never reaches the database.** All data goes through `apps/app/server/api/*` with the service-role client; the browser uses Supabase for auth only. Never grant anything to `anon` / `authenticated`.
- **Writes go through RPCs** (SECURITY DEFINER SQL functions) called from server routes, after Zod validation.
- **Schemas are shared**: Zod schemas live in `packages/shared` and validate both the form and the server route.
- **Migrations are append-only and idempotent**: never edit a committed migration; every file can run twice.
- **npm workspaces only** (no pnpm/yarn). Run app commands with `-w <workspace>`.
- **UI components are owned code** in `packages/ui/components/ui` (shadcn-vue); add them with the shadcn-vue CLI from `packages/ui`.
