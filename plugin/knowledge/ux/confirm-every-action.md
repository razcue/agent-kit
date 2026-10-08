---
name: confirm-every-action
title: Every data-changing button opens a dialog first
type: rule
status: active
tags: [ux, dialogs]
summary: No one-click mutations — every button that writes opens a confirmation or form dialog that says concretely what will change and whether it can be undone.
---

Navigation buttons (links, "View", history) need no confirmation; only buttons that write.

The confirmation names the affected record in human terms and says whether the action can be undone. When a decision has several sensible outcomes, offer them as separate buttons in the same dialog instead of asking twice. Prefer a promise-based helper (`await confirm({...})`). With reka-ui, don't put option handlers on `AlertDialogAction` — it closes before a fall-through `@click` runs.
