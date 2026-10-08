---
name: help-in-popovers
title: Form help lives in popovers, not inline text
type: rule
status: active
tags: [ux, forms]
summary: Explanations of a field go in a question-icon popover next to its label, never as paragraphs inside the form.
---

Multi-step dialogs are already tall; inline help pushes inputs down and is read only once. Pattern: a ghost icon button with a help icon, as `PopoverTrigger as-child`, in the same row as the `Label`; the prose goes in `PopoverContent`.
