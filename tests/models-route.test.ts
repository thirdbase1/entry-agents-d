import assert from "node:assert/strict"
import { test } from "node:test"

import { GET } from "@/app/api/models/route"

test("GET /api/models defaults to Entry provider and returns live models from Gateway", async () => {
  const req = new Request("http://localhost:3000/api/models?provider=entry")
  const res = await GET(req)
  assert.equal(res.status, 200)

  const data = await res.json()
  assert.equal(data.providerId, "entry")
  assert.ok(Array.isArray(data.models))
  assert.equal(data.capabilities.tools, true)
  assert.equal(data.capabilities.resume, true)
  assert.equal(data.capabilities.effort, true)
  assert.equal(data.capabilities.vision, true)
})
