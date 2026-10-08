# UI (shadcn-vue + Tailwind v4)

- Vue 3 Composition API, `<script setup lang="ts">`. Pages compose components; logic lives in composables.
- Components are shadcn-vue owned code in `packages/ui/components/ui`. Add one: `cd packages/ui && npx shadcn-vue@latest add <name>`. Edit freely.
- Theme tokens (`--background`, `--primary`, … oklch, `.dark` variant) live in `packages/ui/assets/css/tailwind.css`. Use token classes (`bg-primary`), or Tailwind's stock scale (`bg-green-500/15`) — don't invent color names that aren't tokens.
- Page-specific components: `apps/app/app/components/<module>/` (e.g. `ThingsTable.vue`, `ThingFormDialog.vue`).

## Patterns
- **Table component**: props `data`, `loading`, `canManage`; emits `edit`, `toggleActive`, `delete`. Loading → centered spinner; empty → one row "No data".
- **Form dialog**: props `open`, `mode`, `item`, `saving`; reset the form in `watch(() => props.open)`. Validate with the shared Zod schema before emitting.
- **Optimistic updates** after create/update/delete instead of full reloads.
- **List pages**: pagination, filters and sort are server-side and mirrored to the URL query.

Cross-project UI/UX rules (confirmations, select states, help popovers…) are in global knowledge, scope `ux` — check the session index.
