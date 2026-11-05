import assert from "node:assert/strict"
import { test } from "node:test"

import {
  createEntryProvider,
  ENTRY_PROVIDER_ID,
  ENTRY_TOOLS,
} from "@/lib/providers/entry"
import { getProvider, listProviders, resolveActiveProviderId } from "@/lib/providers/registry"
import { DEFAULT_SETTINGS } from "@/lib/settings/schema"

test("Entry provider initializes with correct identity and capabilities", async () => {
  const provider = createEntryProvider(DEFAULT_SETTINGS.providers.entry, DEFAULT_SETTINGS)
  const info = await provider.info()

  assert.equal(info.id, ENTRY_PROVIDER_ID)
  assert.equal(info.name, "Entry Agents")
  assert.equal(info.available, true)
  assert.equal(info.capabilities.tools, true)
  assert.equal(info.capabilities.resume, true)
  assert.equal(info.capabilities.effort, true)
  assert.equal(info.capabilities.vision, true)
  assert.equal(info.capabilities.mcp, true)
  assert.deepEqual(info.capabilities.permissionModes, ["read-only", "plan", "edits", "full"])
})

test("Entry provider dynamically fetches models and context from Gateway", async () => {
  const provider = createEntryProvider(DEFAULT_SETTINGS.providers.entry, DEFAULT_SETTINGS)
  const models = await provider.listModels()

  assert.ok(Array.isArray(models))
  if (models.length > 0) {
    for (const m of models) {
      assert.ok(m.contextLength && m.contextLength >= 128_000, `Expected contextLength for ${m.id}`)
    }
  }
})

test("Entry provider tools include file, search, command, and git capabilities", () => {
  const toolNames = ENTRY_TOOLS.map((t) => t.function.name)
  assert.ok(toolNames.includes("read_file"))
  assert.ok(toolNames.includes("create_file"))
  assert.ok(toolNames.includes("edit_file"))
  assert.ok(toolNames.includes("list_directory"))
  assert.ok(toolNames.includes("search_files"))
  assert.ok(toolNames.includes("search_content"))
  assert.ok(toolNames.includes("run_command"))
  assert.ok(toolNames.includes("git_status"))
  assert.ok(toolNames.includes("git_diff"))
})

test("Registry resolves Entry provider as active provider", async () => {
  const provider = await getProvider(ENTRY_PROVIDER_ID)
  assert.ok(provider !== null)

  const info = await provider.info()
  assert.equal(info.id, ENTRY_PROVIDER_ID)
  assert.equal(info.name, "Entry Agents")

  const allProviders = await listProviders()
  assert.equal(allProviders.length, 1)
  assert.equal(allProviders[0].id, ENTRY_PROVIDER_ID)
  assert.equal(allProviders[0].available, true)

  const activeId = await resolveActiveProviderId()
  assert.equal(activeId, ENTRY_PROVIDER_ID)
})
