#!/usr/bin/env node
// @name: auth
// @summary: End-to-end test of the app template's auth flow — the built Nuxt server + real supabase-js against a fake Supabase (Auth + RPC): login, wrong password, /me, logout, throttle 429, email domain.
// @usage: node scripts/e2e/auth.mjs --app <scaffold>/apps/app   (the app must be built: npm run build -w @<name>/app)
// @tags: [e2e, auth, templates, release]
// @test: auth.test.mjs
import { spawn } from "node:child_process"
import { createServer } from "node:http"
import { existsSync } from "node:fs"
import { join, resolve } from "node:path"
import { pathToFileURL } from "node:url"

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url")
export const fakeJwt = (sub) => `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub, role: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600 })}.sig`

/** Fake Supabase: just the endpoints the BFF uses, with the throttle rules of 000000000001_login_throttle.sql. */
export function fakeSupabase(users) {
  const failures = []
  const calls = []
  const tokens = new Map()
  const user = (u) => ({ id: u.id, aud: "authenticated", role: "authenticated", email: u.email, app_metadata: { name: u.name }, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" })
  const server = createServer((req, res) => {
    let body = ""
    req.on("data", (c) => (body += c))
    req.on("end", () => {
      const url = new URL(req.url, "http://x")
      const json = body ? JSON.parse(body) : {}
      calls.push({ method: req.method, path: url.pathname, body: json, auth: req.headers.authorization ?? "" })
      const send = (status, data) => {
        res.writeHead(status, { "content-type": "application/json" })
        res.end(data === undefined ? "" : JSON.stringify(data))
      }
      if (url.pathname === "/auth/v1/token" && url.searchParams.get("grant_type") === "password") {
        const u = users.find((x) => x.email === json.email && x.password === json.password)
        if (!u) return send(400, { code: 400, error_code: "invalid_credentials", msg: "Invalid login credentials" })
        const token = fakeJwt(u.id)
        tokens.set(token, u)
        return send(200, { access_token: token, token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: `r-${u.id}`, user: user(u) })
      }
      if (url.pathname === "/auth/v1/user") {
        const u = tokens.get((req.headers.authorization ?? "").replace(/^Bearer /, ""))
        return u ? send(200, user(u)) : send(401, { code: 401, msg: "invalid JWT" })
      }
      if (url.pathname === "/auth/v1/logout") {
        tokens.delete((req.headers.authorization ?? "").replace(/^Bearer /, ""))
        return send(204)
      }
      if (url.pathname === "/rest/v1/rpc/login_wait_seconds") {
        const recent = failures.filter((f) => f.login === json.p_login && Date.now() - f.at < 15 * 60_000)
        return send(200, recent.length >= 5 ? 900 : 0)
      }
      if (url.pathname === "/rest/v1/rpc/login_record") {
        if (json.p_success) for (let i = failures.length - 1; i >= 0; i--) failures[i].login === json.p_login && failures.splice(i, 1)
        else failures.push({ login: json.p_login, at: Date.now() })
        return send(204)
      }
      send(404, { message: `fake supabase: no route ${req.method} ${url.pathname}` })
    })
  })
  return { server, calls, failures }
}

const listen = (server) => new Promise((ok) => server.listen(0, "127.0.0.1", () => ok(server.address().port)))

async function waitFor(url, ms = 15_000) {
  const until = Date.now() + ms
  while (Date.now() < until) {
    try {
      if ((await fetch(url)).ok) return
    } catch {}
    await new Promise((r) => setTimeout(r, 200))
  }
  throw new Error(`app server did not start: ${url}`)
}

async function main(argv) {
  const app = resolve(argv[argv.indexOf("--app") + 1] ?? "")
  const entry = join(app, ".output", "server", "index.mjs")
  if (!argv.includes("--app") || !existsSync(entry)) {
    console.error("usage: auth.mjs --app <scaffold>/apps/app  (build it first)")
    return 2
  }
  const fake = fakeSupabase([{ id: "11111111-1111-4111-8111-111111111111", email: "ana@example.com", password: "secret123", name: "Ana" }])
  const supaPort = await listen(fake.server)
  const appPort = 4600 + Math.floor(Math.random() * 300)
  const proc = spawn("node", [entry], {
    env: {
      ...process.env,
      PORT: String(appPort),
      NUXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${supaPort}`,
      NUXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      NUXT_SUPABASE_SERVICE_ROLE_KEY: "service-key",
      NUXT_PUBLIC_AUTH_EMAIL_DOMAIN: "example.com",
    },
    stdio: "ignore",
  })
  const base = `http://127.0.0.1:${appPort}`
  const results = []
  const check = (name, ok, detail = "") => results.push({ name, ok, detail })
  const post = (path, body, token) =>
    fetch(base + path, { method: "POST", headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body ?? {}) })
  try {
    await waitFor(`${base}/api/health`)
    let r = await post("/api/auth/login", { email: "ana", password: "wrong-pass" })
    check("wrong password → 401", r.status === 401, `got ${r.status}`)
    check("failure recorded for the derived email", fake.failures.some((f) => f.login === "ana@example.com"))

    r = await post("/api/auth/login", { email: "ana", password: "secret123" })
    const session = await r.json()
    check("short login + domain → 200 with session", r.status === 200 && Boolean(session.access_token && session.refresh_token), `got ${r.status}`)
    check("user name from app_metadata", session.user?.name === "Ana", JSON.stringify(session.user))
    check("success clears failures", !fake.failures.some((f) => f.login === "ana@example.com"))

    r = await fetch(`${base}/api/auth/me`, { headers: { authorization: `Bearer ${session.access_token}` } })
    const me = await r.json()
    check("/api/auth/me with token → user", r.status === 200 && me.user?.email === "ana@example.com", `got ${r.status}`)

    r = await post("/api/auth/logout", {}, session.access_token)
    check("logout → 200 and revoked at Supabase", r.status === 200 && fake.calls.some((c) => c.path === "/auth/v1/logout"), `got ${r.status}`)
    r = await fetch(`${base}/api/auth/me`, { headers: { authorization: `Bearer ${session.access_token}` } })
    check("revoked token → 401", r.status === 401, `got ${r.status}`)

    for (let i = 0; i < 5; i++) await post("/api/auth/login", { email: "ana", password: "nope-nope" })
    r = await post("/api/auth/login", { email: "ana", password: "secret123" })
    check("6th attempt after 5 failures → 429", r.status === 429, `got ${r.status}`)
  } finally {
    proc.kill()
    fake.server.close()
  }
  for (const c of results) console.log(`${c.ok ? "✓" : "✗"} ${c.name}${c.ok ? "" : ` (${c.detail})`}`)
  const failed = results.filter((c) => !c.ok).length
  console.log(failed ? `\n${failed} check(s) failed` : `\nPASS — ${results.length} auth checks`)
  return failed ? 1 : 0
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main(process.argv.slice(2)).then((c) => process.exit(c))
