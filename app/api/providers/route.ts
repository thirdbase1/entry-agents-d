import { NextResponse } from "next/server"

import { forgetClaudeCodeProbe } from "@/lib/claude-code-probe"
import { listProviders } from "@/lib/providers/registry"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * The desktop shell's health check reads this header before it navigates to
 * the port: the sidecar is handed a per-launch token in the environment, and
 * a server that cannot echo it is something else listening on loopback.
 */
const LAUNCH_HEADER = "x-entry-agents-launch"

function launchHeaders(): HeadersInit | undefined {
  const token = process.env.ENTRY_AGENTS_LAUNCH_TOKEN || process.env.AGENT_UI_LAUNCH_TOKEN
  return token ? { [LAUNCH_HEADER]: token, "x-agent-ui-launch": token } : undefined
}

/** Every provider plus live availability — drives the composer's picker. */
export async function GET(req: Request) {
  try {
    if (new URL(req.url).searchParams.get("refresh") === "1") {
      forgetClaudeCodeProbe()
    }
    return NextResponse.json(
      { providers: await listProviders() },
      { headers: launchHeaders() }
    )
  } catch (err) {
    return NextResponse.json(
      {
        providers: [],
        error: err instanceof Error ? err.message : "Failed to list providers",
      },
      { status: 500, headers: launchHeaders() }
    )
  }
}
