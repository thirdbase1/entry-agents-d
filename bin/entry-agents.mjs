#!/usr/bin/env node
/**
 * entry-agents — the command line onto a running Entry Agents subagent bridge.
 *
 * Every command is a call to the app's MCP endpoint (`/api/mcp`), found
 * through `$ENTRY_AGENTS_DIR/bridge.json`, which the server rewrites with its
 * current URL and keeps the bridge token in. So a subagent started from here
 * is the same thing one started by an agent inside the app is: a chat in the
 * window, streaming live, persisted.
 *
 *   entry-agents harnesses
 *   entry-agents models <harness>
 *   entry-agents run <harness> [--model m] [--cwd dir] [--title t] [--session id]
 *                [--background] [--wait s] [--timeout s] [--json] <prompt… | ->
 *   entry-agents send <run-id|session-id> [--interrupt] [--background] <message… | ->
 *   entry-agents status <run-id> [--wait seconds] [--full] [--json]
 *   entry-agents cancel <run-id>
 *   entry-agents list
 *   entry-agents mcp            stdio MCP server proxying to the running app
 *   entry-agents mcp-config     how to register it with Claude Code / Entry
 *
 * `entry-agents mcp` is what an agent *outside* the app (a CLI in your
 * terminal) should be given: the desktop app picks a fresh port at every
 * launch, and the proxy re-reads bridge.json per message, so the registration
 * never goes stale.
 *
 * No dependencies — Node 18+ only.
 */

import { readFileSync } from "node:fs"
import { homedir } from "node:os"
import { join, resolve } from "node:path"
import { createInterface } from "node:readline"
import { fileURLToPath } from "node:url"

const SELF = fileURLToPath(import.meta.url)

function dataDir() {
  return process.env.ENTRY_AGENTS_DIR || process.env.AGENT_UI_DIR || join(homedir(), ".entry-agents")
}

function bridge() {
  let file
  try {
    file = JSON.parse(readFileSync(join(dataDir(), "bridge.json"), "utf8"))
  } catch {
    throw new Error(
      `No ${join(dataDir(), "bridge.json")} — start Entry Agents first (open it once so it can record its address).`
    )
  }
  const url = process.env.ENTRY_AGENTS_URL || process.env.AGENT_UI_URL || file.url
  if (!url) throw new Error("Entry Agents has not recorded its address yet — open its window once.")
  const base = new URL("/api/mcp", url)
  const scoped = process.env.ENTRY_AGENTS_MCP_URL || process.env.AGENT_UI_MCP_URL
    ? new URL(process.env.ENTRY_AGENTS_MCP_URL || process.env.AGENT_UI_MCP_URL)
    : base
  if (scoped.origin !== base.origin || scoped.pathname !== base.pathname) {
    throw new Error("Scoped bridge URL must point to the local Entry Agents MCP endpoint.")
  }
  return { url: scoped.toString(), token: file.token }
}

let nextId = 1

async function rpc(method, params) {
  const { url, token } = bridge()
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: nextId++, method, params }),
  }).catch((err) => {
    throw new Error(`Entry Agents is not answering at ${url} (${err.message}). Is it running?`)
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || `Entry Agents answered ${res.status}`)
  if (body.error) throw new Error(body.error.message)
  return body.result
}

async function tool(name, args = {}) {
  const result = await rpc("tools/call", { name, arguments: args })
  const data =
    result.structuredContent ?? result.content?.map((part) => part.text).join("\n")
  if (result.isError) {
    throw new Error(typeof data === "string" ? data : JSON.stringify(data))
  }
  return data
}

function parseFlags(argv) {
  const flags = {}
  const rest = []
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index]
    if (arg === "--background" || arg === "--json" || arg === "--full" || arg === "--interrupt") {
      flags[arg.slice(2)] = true
    }
    else if (arg.startsWith("--")) flags[arg.slice(2)] = argv[++index]
    else rest.push(arg)
  }
  return { flags, rest }
}

async function readStdin() {
  const chunks = []
  for await (const chunk of process.stdin) chunks.push(chunk)
  return Buffer.concat(chunks).toString("utf8")
}

function clean(text) {
  return String(text).replace(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g, "")
}

function out(text) {
  process.stdout.write(`${clean(text)}\n`)
}

function note(text) {
  process.stderr.write(`${clean(text)}\n`)
}

function print(data, json) {
  if (json || typeof data !== "object") {
    out(typeof data === "string" ? data : JSON.stringify(data, null, 2))
    return
  }
  if (typeof data.answer === "string") {
    out(data.answer)
    note(`\n[${data.status} · ${data.harness} · session ${data.session_id} · run ${data.run_id}]`)
    return
  }
  out(JSON.stringify(data, null, 2))
}

function proxyFailure(err) {
  const code = err?.cause?.code ?? err?.code
  if (code === "ECONNREFUSED" || code === "ENOTFOUND" || code === "EHOSTUNREACH") {
    return "Entry Agents is not running (connection refused). Start the app and try again; run and chat ids survive in its saved chats."
  }
  if (code === "UND_ERR_HEADERS_TIMEOUT" || code === "UND_ERR_BODY_TIMEOUT" || code === "ETIMEDOUT") {
    return "Entry Agents took too long to answer this call. The app is up — call again (keep wait_seconds at 240 or less)."
  }
  return `Entry Agents did not answer: ${err?.message ?? err}${code ? ` (${code})` : ""}`
}

async function stdioProxy() {
  const lines = createInterface({ input: process.stdin })
  const inFlight = new Set()
  for await (const line of lines) {
    if (!line.trim()) continue
    const task = forward(line).finally(() => inFlight.delete(task))
    inFlight.add(task)
  }
  await Promise.allSettled(inFlight)
}

async function forward(line) {
  {
    let message
    try {
      message = JSON.parse(line)
    } catch {
      return
    }
    const isRequest = message.id !== undefined && message.id !== null
    try {
      const { url, token } = bridge()
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
          Authorization: `Bearer ${token}`,
        },
        body: line,
      })
      if (!isRequest) return
      const body = await res.json()
      process.stdout.write(`${JSON.stringify(body)}\n`)
    } catch (err) {
      if (!isRequest) return
      process.stdout.write(
        `${JSON.stringify({
          jsonrpc: "2.0",
          id: message.id,
          error: { code: -32000, message: proxyFailure(err) },
        })}\n`
      )
    }
  }
}

const WAIT_SLICE = 240

async function waitingTool(name, args, total) {
  let left = Math.max(0, total)
  let data = await tool(name, { ...args, wait_seconds: Math.min(left, WAIT_SLICE) })
  left -= WAIT_SLICE
  while (left > 0 && (data.status === "running" || data.status === "queued")) {
    data = await tool("get_subagent", { run_id: data.run_id, wait_seconds: Math.min(left, WAIT_SLICE) })
    left -= WAIT_SLICE
  }
  return data
}

async function main() {
  const [command, ...argv] = process.argv.slice(2)
  const { flags, rest } = parseFlags(argv)
  switch (command) {
    case "harnesses": {
      const data = await tool("list_harnesses")
      if (flags.json) return print(data, true)
      for (const h of data.harnesses) {
        const reason = h.available ? "" : `  (${h.unavailable_reason ?? "unavailable"})`
        out(`${h.available ? "●" : "○"} ${h.id.padEnd(24)} ${h.name}${reason}`)
      }
      return
    }
    case "models": {
      if (!rest[0]) throw new Error("usage: entry-agents models <harness>")
      const data = await tool("list_models", { harness: rest[0] })
      if (flags.json) return print(data, true)
      for (const m of data.models) {
        const name = m.name && m.name !== m.id ? `  — ${m.name}` : ""
        out(`${m.id}${name}`)
      }
      return
    }
    case "run": {
      const [harness, ...words] = rest
      let prompt = words.join(" ")
      if (!prompt || prompt === "-") prompt = await readStdin()
      if (!harness || !prompt.trim()) {
        throw new Error("usage: entry-agents run <harness> [flags] <prompt… | ->")
      }
      const data = await waitingTool(
        "run_subagent",
        {
          harness,
          prompt,
          model: flags.model,
          cwd: flags.cwd ? resolve(flags.cwd) : process.cwd(),
          title: flags.title,
          session_id: flags.session,
          background: !!flags.background,
          ...(flags.timeout ? { timeout_seconds: Number(flags.timeout) } : null),
        },
        flags.background ? 0 : Number(flags.wait ?? 3600)
      )
      print(data, flags.json)
      if (data.status === "error") process.exitCode = 1
      return
    }
    case "status": {
      if (!rest[0]) throw new Error("usage: entry-agents status <run-id> [--wait s]")
      print(
        await waitingTool(
          "get_subagent",
          { run_id: rest[0], ...(flags.full ? { detail: "full" } : null) },
          Number(flags.wait ?? 0)
        ),
        flags.json
      )
      return
    }
    case "send": {
      const [ref, ...words] = rest
      let message = words.join(" ")
      if (!message || message === "-") message = await readStdin()
      if (!ref || !message.trim()) {
        throw new Error("usage: entry-agents send <run-id|session-id> [--interrupt] <message… | ->")
      }
      const data = await waitingTool(
        "message_subagent",
        {
          ...(ref.startsWith("r") ? { run_id: ref } : { session_id: ref }),
          message,
          interrupt: !!flags.interrupt,
          background: !!flags.background,
        },
        flags.background ? 0 : Number(flags.wait ?? 3600)
      )
      print(data, flags.json)
      if (data.status === "error") process.exitCode = 1
      return
    }
    case "cancel": {
      if (!rest[0]) throw new Error("usage: entry-agents cancel <run-id>")
      print(await tool("cancel_subagent", { run_id: rest[0] }), true)
      return
    }
    case "list":
      print(await tool("list_subagents"), true)
      return
    case "mcp":
      return stdioProxy()
    case "mcp-config": {
      const cmd = `claude mcp add --scope user entry-agents -- node ${JSON.stringify(SELF)} mcp`
      console.log(`Register the bridge with Claude Code or Entry (once):\n\n  ${cmd}\n`)
      console.log("Chats started inside Entry Agents get it automatically; this is for a CLI you run yourself.")
      return
    }
    default:
      console.log(readFileSync(SELF, "utf8").split("\n").slice(2, 20).map((l) => l.replace(/^ \*\s?/, "")).join("\n"))
      if (command && command !== "help" && command !== "--help") process.exitCode = 1
  }
}

main().catch((err) => {
  note(`entry-agents: ${err.message}`)
  process.exitCode = 1
})
