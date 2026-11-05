import { NextResponse } from "next/server"

import { getProvider, resolveActiveProviderId } from "@/lib/providers/registry"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * `GET /api/models?provider=<id>` — models of the Entry Agents provider plus
 * its capabilities.
 */
export async function GET(req: Request) {
  const requested = new URL(req.url).searchParams.get("provider")?.trim()
  const providerId = requested || (await resolveActiveProviderId())
  const provider = await getProvider(providerId)

  if (!provider) {
    return NextResponse.json(
      { providerId, models: [], error: `Unknown or disabled provider "${providerId}"` },
      { status: 404 }
    )
  }

  const info = await provider.info()
  if (!info.available) {
    return NextResponse.json({
      providerId,
      models: [],
      capabilities: info.capabilities,
      error: info.unavailableReason ?? "Provider unavailable",
    })
  }

  try {
    const models = await provider.listModels()
    const capabilities = (await provider.info().catch(() => info)).capabilities
    const visionModels = provider.visionModels
      ? await provider.visionModels().catch(() => [])
      : undefined
    const effortModels = provider.effortModels
      ? await provider.effortModels().catch(() => [])
      : undefined
    const groups = provider.listModelGroups
      ? await provider.listModelGroups().catch(() => undefined)
      : undefined

    return NextResponse.json({
      providerId,
      models,
      capabilities,
      ...(visionModels ? { visionModels } : null),
      ...(effortModels ? { effortModels } : null),
      ...(groups?.length ? { groups } : null),
    })
  } catch (err) {
    return NextResponse.json({
      providerId,
      models: [],
      capabilities: info.capabilities,
      error: err instanceof Error ? err.message : "Failed to list models",
    })
  }
}
