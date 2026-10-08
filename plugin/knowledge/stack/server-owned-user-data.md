---
name: server-owned-user-data
title: Roles and user fields are server-owned
type: rule
status: active
tags: [auth, supabase, security]
summary: A user's role and scope come only from a server-owned table; server-owned user fields go in app_metadata; never read user_metadata (users can edit it).
---

Supabase lets any signed-in user change their own `user_metadata` (`auth.updateUser({ data })`). Anything authorization reads from there can be forged.

- Role and scope: a `user_roles`-style table, read by the server (cached briefly, bypassed after writes).
- Display name and other server-owned fields: `app_metadata`, written via the admin API.
- Suspended or deleted users must be rejected on every request, not just at login.

Related: [[bff-only-data-access]].
