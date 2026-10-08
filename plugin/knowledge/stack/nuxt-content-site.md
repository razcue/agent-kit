---
name: nuxt-content-site
title: Simple content site (Nuxt + Nuxt Content)
type: howto
status: active
tags: [nuxt, content, static-site, non-technical]
summary: The "site" scaffold is one Nuxt app where every Markdown file in content/ is a page; colours live in app/assets/css/main.css; `npm run generate` builds static HTML.
---

- **Pages**: `content/<name>.md` → `/<name>` (frontmatter `title`, `description`). The navigation lists every page, ordered by file name — prefix with numbers (`1.about.md`) to reorder.
- **Look**: change the `@theme` colours in `app/assets/css/main.css`; text styling comes from Tailwind Typography (`prose`).
- **Components in Markdown**: Nuxt Content MDC syntax (`::component{prop="x"}`) for anything richer than text; add the Vue component in `app/components/content/`.
- **Build**: `npm run generate` → `.output/public` (any static host). Node ≥ 22.5 (built-in SQLite for Nuxt Content).
- Keep it simple: no database, no auth. When those are needed, it's time for the app monorepo ([[bff-only-data-access]]).
