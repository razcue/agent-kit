---
name: never-edit-committed-migrations
title: Never edit a committed migration
type: rule
status: active
tags: [sql, migrations, git]
summary: Once a migration file is committed it is frozen, even if not yet applied — fix forward with a new migration that redefines the object.
---

Other environments (or the user's own database) may already have applied the committed file; editing it makes environments silently diverge.

Write a new migration that redefines the object (`CREATE OR REPLACE FUNCTION …`). When unsure whether a file is committed, check `git log --oneline -- <file>`. A file can look new in the working tree yet already be in history if the user committed between turns. Related: [[idempotent-migrations]].
