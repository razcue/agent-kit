---
name: no-mixed-scale-sort
title: Never sort a column that mixes scales
type: rule
status: active
tags: [ux, tables, money]
summary: A column is sortable only if every row is on the same scale and unit — multi-currency amounts sort by a common equivalent or not at all.
---

Sorting raw amounts across currencies, or rates across different currency pairs, is meaningless. If the row carries a normalized equivalent (e.g. USD), sort by it (NULLS LAST); otherwise give the column no sort affordance. Dates, counts, codes, names and enums are fine.
