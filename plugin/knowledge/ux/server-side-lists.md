---
name: server-side-lists
title: List pages paginate, filter and sort on the server
type: rule
status: active
tags: [ux, tables, pagination, sql]
summary: Pagination, filters and sorting run in the list RPC and are mirrored to the URL query; never filter a fully loaded array on the client.
---

- RPC: `LIMIT/OFFSET` inside a CTE before `jsonb_agg`, returning `{ rows, total }`.
- Sorting: `p_sort`, `p_dir` with a whitelisted CASE ladder and a deterministic tail ending in a unique column, applied to both the page CTE and the aggregate.
- Frontend: page, filters and sort live in the URL so views are shareable and survive reloads.
- Only sort on single-scale values — see [[no-mixed-scale-sort]].
