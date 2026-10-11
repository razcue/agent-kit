---
name: stack-nuxt-content-site
description: Use BEFORE adding or changing pages, texts, navigation, colours, images or components in this Nuxt Content site (content/*.md, app/, nuxt.config.ts). Conventions for Markdown pages, frontmatter, ordering, styling tokens, MDC components, SEO and the static build.
---

# Nuxt Content site

One Nuxt 4 app; every Markdown file in `content/` is a page. No database, no login — when those are needed, it's time for the app monorepo.

## Pages
- `content/<name>.md` → `/<name>`; `content/index.md` is the home page; folders make sub-paths (`content/servicios/precios.md` → `/servicios/precios`).
- Frontmatter on every page: `title` (navigation + browser tab) and `description` (search engines, link previews).
- Navigation lists every page, home first, then by file name — prefix files with numbers to reorder (`1.about.md`, `2.contact.md`); the number doesn't appear in the URL.
- Write content in plain Markdown: headings, lists, links, images. Keep one topic per page.

## Look
- Colours live in `app/assets/css/main.css` under `@theme` (`--color-background`, `--color-foreground`, `--color-primary`, `--color-border`). Change those tokens instead of adding colours in pages.
- Text styling comes from Tailwind Typography (`prose` on the page wrapper).
- Images go in `public/` and are referenced from the root (`![Our shop](/shop.jpg)`); always write the alt text.

## Richer blocks
- For anything beyond text, create a Vue component in `app/components/content/` (e.g. `Contact.vue`) and use it in Markdown with MDC: `::contact{email="hola@example.com"}` … `::`.
- Keep components small and presentational; content stays in Markdown so a non-technical owner can edit it.

## Build and check
- `npm run dev` → preview at http://localhost:3000; tell the user which page to open after each change.
- `npm run check` (typecheck + tests) before finishing; `npm run generate` builds the static site into `.output/public` (any static host: Vercel, Netlify, GitHub Pages).
- Node ≥ 22.5 (Nuxt Content uses Node's built-in SQLite).

## Working with a non-technical owner
Describe changes by what they will see ("the contact page now shows your phone"), never by file names, unless asked. Content wording is theirs: propose, don't impose.
