---
name: static-dialog-headers
title: Dialog title and description never react to input
type: rule
status: active
tags: [ux, dialogs, layout]
summary: DialogTitle/DialogDescription render static text; values that echo user input go in the form body next to their field.
---

The header sits above the form, so content that changes while typing reflows the whole dialog. Values fixed for the dialog's lifetime (the record being edited, a total passed as a prop) may be interpolated.
