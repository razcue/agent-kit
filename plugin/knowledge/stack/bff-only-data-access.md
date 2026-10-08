---
name: bff-only-data-access
title: The browser never reaches the database
type: decision
status: active
tags: [architecture, security, supabase]
summary: All data goes through server routes using the service-role key; the browser uses Supabase for auth only, and anon/authenticated get no grants.
date: 2026-09-27
---

## Context
In a Supabase SPA the anon key ships in the bundle and the session token sits in localStorage. Anything granted to `anon` or `authenticated` is reachable from any browser console, bypassing every permission and scope check written in the server routes. An audit of an earlier project found exactly that leak.

## Decision
- Server routes (`server/api/*`) are the only data path. They validate input (Zod), check permission and scope, then call RPCs or do scoped reads with the service-role client.
- Migrations revoke everything from `anon`/`authenticated` and set default privileges so new tables/functions are `service_role` only.
- RLS is not used for scoping; scope filters are explicit in code and fail closed.

## Consequences
One extra hop per request; in exchange there is a single place for validation, permissions, rate limits and audit. See [[idempotent-migrations]], [[server-owned-user-data]].
