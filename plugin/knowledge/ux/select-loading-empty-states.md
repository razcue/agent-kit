---
name: select-loading-empty-states
title: Data-driven selects show loading and empty items
type: rule
status: active
tags: [ux, forms, select]
summary: A select whose options come from data shows one disabled "Loading..." item while loading and one disabled "No data" item when empty — it never opens blank.
---

```vue
<SelectItem v-if="loading" value="loading" disabled>Loading...</SelectItem>
<SelectItem v-else-if="items.length === 0" value="no-data" disabled>No data</SelectItem>
<SelectItem v-for="i in items" :key="i.id" :value="i.id">{{ i.label }}</SelectItem>
```
Fixed enum selects don't need it. Comboboxes use their empty slot. Every select has a `SelectValue` with a placeholder inside its trigger. Use the app's language for the labels.
