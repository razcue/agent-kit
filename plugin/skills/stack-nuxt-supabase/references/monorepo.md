# Monorepo

```
apps/web      Nuxt, prerendered public site        npm run dev -w @<p>/web
apps/app      Nuxt SPA + BFF (Supabase)            npm run dev -w @<p>/app
apps/docs     Docus (Nuxt Content) help/wiki       npm run dev -w @<p>/docs
packages/ui   Nuxt layer: shadcn-vue components, Tailwind theme, cn()
packages/shared  Zod schemas + utils (TS source, no build step)
supabase/migrations  SQL migrations
```

- npm workspaces; install from the root (`npm install`). Add a dependency to one app: `npm install <pkg> -w @<p>/app`.
- `packages/ui` is a **Nuxt layer**: apps use it with `extends: ["@<p>/ui"]` and get its components, CSS and `cn()` (import from `@ui/lib/utils`; the `@ui` alias is defined in the layer's nuxt.config). Paths inside a layer config must be absolute (`fileURLToPath(new URL(…, import.meta.url))`).
- `packages/shared` exports TypeScript directly: `import { x } from "@<p>/shared/schemas/x"`. Keep it free of Nuxt/Vue imports so the server, the client and tests can all use it.
- `apps/docs` uses Docus (Nuxt UI based), so it does not extend `packages/ui`.
- Root scripts: `npm run check` (typecheck + test), `npm test` (Vitest), `npm run dev:<app>`.
- Tests: `*.test.ts` next to the code; Vitest runs from the root.
