"use client"

import * as React from "react"
import { toast } from "sonner"

import { HarnessLogo } from "@/components/provider-logo"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import type { PermissionMode } from "@/lib/providers/types"
import type { AppSettings } from "@/lib/settings/schema"

import {
  ProviderField,
  ProviderRow,
  RefreshButton,
  SetupLink,
} from "./provider-row"
import { StatusBadge, statusKey, useProviderStatus } from "./provider-status"
import { SettingsRow, SettingsSection } from "./section"
import type { AppSettingsApi } from "./use-app-settings"

const PERMISSION_MODES: Array<{ id: PermissionMode; label: string; desc: string }> = [
  { id: "read-only", label: "Read only", desc: "Agent can only view workspace files and history" },
  { id: "plan", label: "Plan", desc: "Agent designs architectural plans before proposing changes" },
  { id: "edits", label: "Edit files", desc: "Agent can create, read, and modify workspace code" },
  { id: "full", label: "Full access", desc: "Agent has unconstrained file and terminal execution access" },
]

export function ProvidersSection({
  settings,
  loaded,
  update,
  flush,
}: AppSettingsApi) {
  const { phase, map, refresh } = useProviderStatus(loaded)
  const [refreshing, setRefreshing] = React.useState<string | null>(null)
  const refreshLock = React.useRef(false)
  const providers = settings.providers
  const entry = providers.entry ?? {
    enabled: true,
    baseUrl: "https://entry-agents.dev",
    apiKey: "",
    permissionMode: "edits",
  }

  const setProviders = React.useCallback(
    (patch: Partial<AppSettings["providers"]>) =>
      update((current) => ({
        ...current,
        providers: { ...current.providers, ...patch },
      })),
    [update]
  )

  const refreshProviders = React.useCallback(
    async (id?: string) => {
      if (refreshLock.current) return
      refreshLock.current = true
      setRefreshing(id ?? "all")
      try {
        await flush()
        await refresh(true)
        const models = await fetch("/api/models?provider=entry&refresh=1").then(
          (r) => r.json()
        )
        if (models.error) {
          toast.error("Entry Agents Gateway", { description: models.error })
        } else {
          toast.success("Entry Agents connected", {
            description: `${models.models?.length ?? 0} live models available`,
          })
        }
      } catch {
        toast.error("Failed to connect to Entry Agents")
      } finally {
        refreshLock.current = false
        setRefreshing(null)
      }
    },
    [flush, refresh]
  )

  const status = map[statusKey("entry")]

  return (
    <SettingsSection
      id="providers"
      title="Agent Provider"
      description="Entry Agents platform powers autonomous agent sessions, live models, and workspace capabilities."
      action={
        <RefreshButton
          name="provider status"
          busy={refreshing !== null || phase === "loading"}
          disabled={!loaded}
          onClick={() => void refreshProviders()}
        />
      }
    >
      <ProviderRow
        id="entry"
        name="Entry Agents"
        enabled={entry.enabled !== false}
        disabled={!loaded}
        defaultOpen={true}
        onEnabledChange={(enabled) =>
          setProviders({
            entry: { ...entry, enabled },
          })
        }
        status={
          <StatusBadge
            phase={phase}
            status={status ?? { available: true }}
            enabled={entry.enabled !== false}
          />
        }
        onRefresh={() => void refreshProviders("entry")}
        refreshing={refreshing === "all" || refreshing === "entry"}
      >
        <div className="grid gap-4">
          <div className="rounded-md border border-border/40 bg-muted/30 px-3 py-2.5">
            <div className="flex items-center justify-between text-[12px]">
              <span className="font-medium text-foreground">Entry Platform API</span>
              <span className="inline-flex items-center gap-1.5 font-medium text-emerald-500">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live & Connected
              </span>
            </div>
            <p className="mt-1 text-[11.5px] text-muted-foreground">
              All models, context windows, and agent capabilities stream directly from the Entry API.
            </p>
          </div>

          <ProviderField label="Permissions">
            <Select
              value={entry.permissionMode || "edits"}
              onValueChange={(mode) =>
                setProviders({
                  entry: {
                    ...entry,
                    permissionMode: mode as PermissionMode,
                  },
                })
              }
            >
              <SelectTrigger
                size="sm"
                aria-label="Default permission mode"
                className="h-8 text-[12px]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERMISSION_MODES.map((mode) => (
                  <SelectItem key={mode.id} value={mode.id}>
                    <div className="flex flex-col text-left">
                      <span className="font-medium">{mode.label}</span>
                      <span className="text-[11px] text-muted-foreground">{mode.desc}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ProviderField>

          <div className="flex items-center justify-between border-t border-border/40 pt-2">
            <p className="text-[11.5px] text-muted-foreground">
              Models and context windows are streamed dynamically from Entry Agents.
            </p>
            <SetupLink href="https://entry-agents.dev">
              entry-agents.dev
            </SetupLink>
          </div>
        </div>
      </ProviderRow>
    </SettingsSection>
  )
}
