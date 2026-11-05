import "server-only"

import { readSettings } from "@/lib/settings/server"
import type { AppSettings } from "@/lib/settings/schema"
import {
  ENTRY_PROVIDER_ID,
  createEntryProvider,
} from "@/lib/providers/entry"
import type { AgentProvider, ProviderInfo } from "@/lib/providers/types"

/**
 * Entry Agents is the exclusive agent provider for the platform.
 */
export const PROVIDER_IDS = [
  ENTRY_PROVIDER_ID,
] as const

export type ProviderId = (typeof PROVIDER_IDS)[number]

function build(id: string, settings: AppSettings): AgentProvider | null {
  const providers = settings.providers
  if (id === ENTRY_PROVIDER_ID) return createEntryProvider(providers.entry, settings)
  return null
}

function isEnabled(id: string): boolean {
  return id === ENTRY_PROVIDER_ID
}

/**
 * The provider for `id`, or null when it is unknown.
 */
export async function getProvider(id: string): Promise<AgentProvider | null> {
  const settings = await readSettings()
  if (!isEnabled(id)) return null
  return build(id, settings)
}

/**
 * Lists the Entry Agents platform provider.
 */
export async function listProviders(): Promise<ProviderInfo[]> {
  const settings = await readSettings()
  const provider = build(ENTRY_PROVIDER_ID, settings)
  if (!provider) return []
  return [await provider.info()]
}

/** The active provider id is always Entry Agents. */
export async function resolveActiveProviderId(): Promise<string> {
  return ENTRY_PROVIDER_ID
}
