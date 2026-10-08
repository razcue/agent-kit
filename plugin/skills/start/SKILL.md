---
name: start
description: Guided kickoff for a new project or a big new piece of work — asks plain questions (what, for whom, which pages or features, look and feel, content) and turns the answers into the first spec. Use when the user says "start", "I want to build…", "new site/app/project", or when work/ is empty and the request is open-ended.
---

# Start

Adapt every message to the technical level in the session context. For a non-technical user: everyday words, one question at a time, examples instead of jargon, and you make every technical decision yourself (say it in one plain sentence).

## 1. Understand (ask, don't assume)
Ask only what you can't infer, one short message at a time:
1. **What** is it, in one sentence? What should a visitor or user be able to do?
2. **For whom**? Who uses it, on what device?
3. **Pages or features** — list them together; suggest a sensible first set and let the user trim it.
4. **Look and feel** — 2–3 adjectives, colours, a site they like.
5. **Content** — who writes texts and images; is there existing material?
6. **Done means** — what must work for the first version to count as finished?

## 2. Write the first spec
Create it with `node <scripts>/work.mjs new spec <slug> --title "…"`, then fill `spec.md` in the user's words:
- The acceptance criteria describe what the user will see or do (`**AC-1** Given a visitor on the home page, When they tap "Contact", Then they see the form`).
- Put "later" ideas under **Out**, so version one stays small.
- Record facts that will matter later with the `knowledge` skill (business vocabulary, audience, brand colours → `.knowledge/business/` and `.knowledge/ux/`).

## 3. Confirm, then build
Show the spec as a short list (what's in, what's out, how we'll know it's done). After the user approves, set `status: approved` and continue with the `spec` skill (plan → tasks → implement). For a content site, the first tasks are usually: pages in `content/`, navigation, colours in `app/assets/css/main.css`.

## 4. Show progress
After each visible change, tell the user how to see it (`npm run dev`, then open http://localhost:3000/<page>) and what to look for.
