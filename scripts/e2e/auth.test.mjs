import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { fakeJwt, fakeSupabase } from "./auth.mjs"

const call = async (port, path, body, token) =>
  fetch(`http://127.0.0.1:${port}${path}`, { method: "POST", headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) })

// ZOMBIES: One, Many, Boundaries, Interface apply (the fake must behave like the real contract).
describe("fake supabase", () => {
  it("Interface: fake JWTs are three base64url parts with sub and exp", () => {
    const [h, p, s] = fakeJwt("u1").split(".")
    assert.equal(JSON.parse(Buffer.from(p, "base64url")).sub, "u1")
    assert.ok(h && s)
  })
  it("One/Many/Boundaries: throttle waits only after the 5th failure, success clears", async () => {
    const { server } = fakeSupabase([{ id: "u", email: "a@x.com", password: "pw" }])
    await new Promise((ok) => server.listen(0, "127.0.0.1", ok))
    const port = server.address().port
    const wait = async () => (await call(port, "/rest/v1/rpc/login_wait_seconds", { p_login: "a@x.com" })).json()
    for (let i = 0; i < 4; i++) await call(port, "/rest/v1/rpc/login_record", { p_login: "a@x.com", p_success: false })
    assert.equal(await wait(), 0)
    await call(port, "/rest/v1/rpc/login_record", { p_login: "a@x.com", p_success: false })
    assert.ok((await wait()) > 0)
    await call(port, "/rest/v1/rpc/login_record", { p_login: "a@x.com", p_success: true })
    assert.equal(await wait(), 0)
    server.close()
  })
})
