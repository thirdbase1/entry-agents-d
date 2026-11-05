import "server-only"

import { existsSync, promises as fs } from "node:fs"
import { isAbsolute, resolve } from "node:path"
import { exec } from "node:child_process"
import { promisify } from "node:util"

import type { ModelOption } from "@/components/ui/model-picker"
import type {
  AgentProvider,
  AgentRunOptions,
  AgentStreamEvent,
  PermissionMode,
  ProviderInfo,
} from "@/lib/providers/types"
import type { AppSettings, EntrySettings } from "@/lib/settings/schema"
import { withPromptContext } from "@/lib/providers/system-prefix"
import { LineBuffer } from "@/lib/stream-framing"
import { getDeviceAuthService } from "@/lib/auth/device-auth"

const execAsync = promisify(exec)

export const ENTRY_PROVIDER_ID = "entry"

const DEFAULT_GATEWAY_URL = "https://entry-agents.dev"

const PERMISSION_MODES: PermissionMode[] = ["read-only", "plan", "edits", "full"]

/** Cached models dynamically retrieved from the Gateway */
let gatewayModelsCache: ModelOption[] | null = null
let lastGatewayFetchMs = 0
const CACHE_TTL_MS = 60_000

export const ENTRY_TOOLS = [
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read the contents of a file within the workspace.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Relative or absolute file path" },
          start_line: { type: "integer", description: "Optional starting line (1-based)" },
          end_line: { type: "integer", description: "Optional ending line (inclusive)" },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_file",
      description: "Create a new file or overwrite an existing file with the provided content.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path to create" },
          content: { type: "string", description: "Content to write into the file" },
        },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "edit_file",
      description: "Perform an exact string replacement in a file.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path to modify" },
          target: { type: "string", description: "The exact substring to replace" },
          replacement: { type: "string", description: "The new content to replace target with" },
        },
        required: ["path", "target", "replacement"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_directory",
      description: "List directory contents including files and subdirectories.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Directory path to list (default: current directory)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_files",
      description: "Search for filenames matching a glob pattern.",
      parameters: {
        type: "object",
        properties: {
          pattern: { type: "string", description: "Filename pattern or glob (e.g. *.ts, routes)" },
        },
        required: ["pattern"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_content",
      description: "Search file contents for text or regex pattern.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query or regex" },
          path: { type: "string", description: "Optional subdirectory to search in" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "run_command",
      description: "Execute a command in the shell within the workspace directory.",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string", description: "Shell command line to execute" },
        },
        required: ["command"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "git_status",
      description: "Get the current git working tree status.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "git_diff",
      description: "Get the unstaged or staged git diff of the workspace.",
      parameters: {
        type: "object",
        properties: {
          staged: { type: "boolean", description: "Whether to return staged diff" },
        },
      },
    },
  },
]

function resolveWorkspacePath(baseDir: string, targetPath: string): string {
  if (isAbsolute(targetPath)) return targetPath
  return resolve(baseDir, targetPath)
}

async function executeWorkspaceTool(
  name: string,
  args: Record<string, unknown>,
  cwd: string,
  mode: PermissionMode
): Promise<{ output: string; exitCode?: number }> {
  const isMutating = name === "create_file" || name === "edit_file" || name === "run_command"

  if (mode === "read-only" && isMutating) {
    return {
      output: `Permission denied: Tool '${name}' cannot execute in read-only mode. Switch to 'edits' or 'full' mode.`,
      exitCode: 1,
    }
  }

  if (mode === "plan" && isMutating) {
    if (name === "create_file") {
      return { output: `[PLAN SIMULATION] Would create file '${args.path}' with ${String(args.content ?? "").length} characters.` }
    }
    if (name === "edit_file") {
      return { output: `[PLAN SIMULATION] Would edit file '${args.path}' replacing exact target text.` }
    }
    if (name === "run_command") {
      return { output: `[PLAN SIMULATION] Would execute command: '${args.command}'` }
    }
  }

  try {
    switch (name) {
      case "read_file": {
        const filePath = resolveWorkspacePath(cwd, String(args.path))
        if (!existsSync(filePath)) {
          return { output: `Error: File not found: ${args.path}`, exitCode: 1 }
        }
        const content = await fs.readFile(filePath, "utf8")
        const lines = content.split("\n")
        const start = typeof args.start_line === "number" ? Math.max(1, args.start_line) : 1
        const end = typeof args.end_line === "number" ? Math.min(lines.length, args.end_line) : lines.length
        const sliced = lines.slice(start - 1, end).join("\n")
        return { output: sliced }
      }

      case "create_file": {
        const filePath = resolveWorkspacePath(cwd, String(args.path))
        const content = String(args.content ?? "")
        await fs.mkdir(resolve(filePath, ".."), { recursive: true })
        await fs.writeFile(filePath, content, "utf8")
        return { output: `Successfully wrote ${content.length} characters to ${args.path}` }
      }

      case "edit_file": {
        const filePath = resolveWorkspacePath(cwd, String(args.path))
        if (!existsSync(filePath)) {
          return { output: `Error: File not found: ${args.path}`, exitCode: 1 }
        }
        const content = await fs.readFile(filePath, "utf8")
        const target = String(args.target ?? "")
        const replacement = String(args.replacement ?? "")
        if (!content.includes(target)) {
          return { output: `Error: Target string not found in ${args.path}`, exitCode: 1 }
        }
        const updated = content.replace(target, replacement)
        await fs.writeFile(filePath, updated, "utf8")
        return { output: `Successfully updated ${args.path}` }
      }

      case "list_directory": {
        const dirPath = resolveWorkspacePath(cwd, String(args.path || "."))
        if (!existsSync(dirPath)) {
          return { output: `Error: Directory not found: ${dirPath}`, exitCode: 1 }
        }
        const entries = await fs.readdir(dirPath, { withFileTypes: true })
        const formatted = entries
          .map((e) => `${e.isDirectory() ? "[DIR]  " : "[FILE] "} ${e.name}`)
          .join("\n")
        return { output: formatted || "(empty directory)" }
      }

      case "search_files": {
        const { stdout } = await execAsync(
          process.platform === "win32"
            ? `dir /b /s "*${String(args.pattern).replace(/[*]/g, "")}*"`
            : `find . -name "*${args.pattern}*"`,
          { cwd }
        ).catch(() => ({ stdout: "" }))
        return { output: stdout.trim() || "No matching files found." }
      }

      case "search_content": {
        const query = String(args.query).replace(/"/g, '\\"')
        const searchPath = args.path ? String(args.path) : "."
        const cmd = process.platform === "win32"
          ? `findstr /s /i /n /c:"${query}" ${searchPath}\\*`
          : `grep -rn "${query}" "${searchPath}"`
        const { stdout } = await execAsync(cmd, { cwd }).catch(() => ({ stdout: "" }))
        return { output: stdout.trim() || "No matches found." }
      }

      case "run_command": {
        const cmd = String(args.command)
        const { stdout, stderr } = await execAsync(cmd, { cwd, timeout: 60_000 })
        const combined = `${stdout}\n${stderr}`.trim()
        return { output: combined || "(command completed with no output)" }
      }

      case "git_status": {
        const { stdout } = await execAsync("git status -s", { cwd }).catch(() => ({
          stdout: "Not a git repository or git not available.",
        }))
        return { output: stdout.trim() || "Working tree clean." }
      }

      case "git_diff": {
        const flag = args.staged ? "--staged" : ""
        const { stdout } = await execAsync(`git diff ${flag}`, { cwd }).catch(() => ({
          stdout: "",
        }))
        return { output: stdout.trim() || "(no diff)" }
      }

      default:
        return { output: `Unknown tool: ${name}`, exitCode: 1 }
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    return { output: `Tool execution error: ${errorMsg}`, exitCode: 1 }
  }
}

export function createEntryProvider(
  settings?: EntrySettings,
  appSettings?: AppSettings
): AgentProvider {
  void appSettings;
  const conf: EntrySettings = settings ?? {
    enabled: true,
    baseUrl: process.env.GATEWAY_BASE_URL || DEFAULT_GATEWAY_URL,
    apiKey: process.env.GATEWAY_API_KEY || "",
    permissionMode: "edits",
  }

  const baseUrl = (
    process.env.GATEWAY_BASE_URL ||
    conf.baseUrl ||
    DEFAULT_GATEWAY_URL
  ).replace(/\/+$/, "")

  // Active session token retrieved directly from OS Credential Store (Windows DPAPI, macOS Keychain)
  const authSession = getDeviceAuthService().getActiveSession()
  const apiKey =
    authSession?.accessToken ||
    process.env.ENTRY_SESSION_TOKEN ||
    process.env.GATEWAY_API_KEY ||
    conf.apiKey ||
    ""

  return {
    async info(): Promise<ProviderInfo> {
      return {
        id: ENTRY_PROVIDER_ID,
        name: "Entry Agents",
        description: "Official Entry platform gateway and autonomous coding agent",
        capabilities: {
          tools: true,
          resume: true,
          effort: true,
          vision: true,
          mcp: true,
          permissionModes: PERMISSION_MODES,
          defaultPermissionMode: conf.permissionMode || "edits",
        },
        available: conf.enabled !== false,
      }
    },

    /**
     * Dynamically retrieves all available models and their context windows
     * from the Gateway. Zero hardcoded models.
     */
    async listModels(): Promise<ModelOption[]> {
      const now = Date.now()
      if (gatewayModelsCache && now - lastGatewayFetchMs < CACHE_TTL_MS) {
        return gatewayModelsCache
      }

      const endpoints = [
        "https://entry-agents.dev/api/models",
        "https://entry-gateway-six.vercel.app/v1/models",
        `${baseUrl}/api/models`,
        `${baseUrl}/models`,
      ]

      for (const ep of endpoints) {
        try {
          const controller = new AbortController()
          const timer = setTimeout(() => controller.abort(), 4000)
          const headers: Record<string, string> = {}
          if (apiKey) {
            headers["Authorization"] = `Bearer ${apiKey}`
            headers["Cookie"] = `better-auth.session_token=${apiKey}`
          }
          const res = await fetch(ep, {
            headers,
            signal: controller.signal,
          }).finally(() => clearTimeout(timer))

          if (res.ok) {
            const json = (await res.json()) as {
              data?: Array<{
                id: string
                name?: string
                context_window?: number
                owned_by?: string
                protocols?: string[]
              }>
              models?: Array<{
                id: string
                name?: string
                context_window?: number
                contextLength?: number
                owned_by?: string
              }>
            }

            const rawModels = json.data || json.models
            if (Array.isArray(rawModels) && rawModels.length > 0) {
              const mapped: ModelOption[] = rawModels.map((m) => {
                const ctx = m.context_window || (m as { contextLength?: number }).contextLength || 1_000_000
                const ctxLabel = ctx >= 1_000_000 ? `${(ctx / 1_000_000).toFixed(0)}M` : `${Math.round(ctx / 1000)}k`
                return {
                  id: m.id,
                  name: m.name ? `${m.name} (${ctxLabel} ctx)` : `${m.id} (${ctxLabel} ctx)`,
                  description: `${m.name || m.id} · ${ctxLabel} context window`,
                  contextLength: ctx,
                  group: m.owned_by || "entry",
                }
              })
              gatewayModelsCache = mapped
              lastGatewayFetchMs = now
              return mapped
            }
          }
        } catch {
          // try next gateway endpoint
        }
      }

      if (gatewayModelsCache) {
        return gatewayModelsCache
      }

      return []
    },

    async effortModels(): Promise<string[]> {
      const models = await this.listModels()
      return models.map((m) => m.id)
    },

    async visionModels(): Promise<string[]> {
      const models = await this.listModels()
      return models.map((m) => m.id)
    },

    async *run(options: AgentRunOptions): AsyncGenerator<AgentStreamEvent> {
      const cwd = options.cwd || process.cwd()
      const mode = options.permissionMode || conf.permissionMode || "edits"

      yield {
        type: "status",
        stage: "connecting",
        text: "Connecting to Entry Agents platform...",
      }

      const messages: Array<{
        role: "system" | "user" | "assistant" | "tool"
        content: string
        tool_call_id?: string
        tool_calls?: unknown[]
      }> = [
        {
          role: "system",
          content:
            "You are Entry Agents, an elite autonomous software engineering agent. " +
            "You write clean, modular, correct, and secure code. " +
            "When analyzing or modifying code, use your provided tools to read, edit, and test files in the workspace.",
        },
      ]

      if (options.standingContext?.trim()) {
        messages.push({
          role: "system",
          content: options.standingContext.trim(),
        })
      }

      if (options.history && options.history.length > 0) {
        for (const turn of options.history) {
          messages.push({
            role: turn.role,
            content: turn.content,
          })
        }
      }

      messages.push({
        role: "user",
        content: withPromptContext(options.prompt, {
          turnContext: options.turnContext,
        }),
      })

      // Determine model dynamically from Entry Agents catalog or user option
      const models = await this.listModels().catch(() => [])
      if (!options.model && models.length === 0) {
        yield {
          type: "error",
          message: "No models available from Entry Agents. Please ensure your connection to https://entry-agents.dev is active.",
        }
        return
      }
      const modelId = options.model || models[0].id

      const urlCandidates = [
        `${baseUrl}/chat/completions`,
        "https://entry-gateway-six.vercel.app/v1/chat/completions",
        "https://entry-agents.dev/v1/chat/completions",
      ]

      let targetUrl = urlCandidates[0]
      const maxToolSteps = 15
      let stepCount = 0

      while (stepCount < maxToolSteps) {
        stepCount++

        const requestBody = {
          model: modelId,
          messages,
          tools: ENTRY_TOOLS,
          stream: true,
          ...(options.effort ? { reasoning_effort: options.effort } : {}),
        }

        let res: Response | null = null
        let fetchError: Error | null = null

        for (const candidate of urlCandidates) {
          try {
            const controller = new AbortController()
            const linkSignal = () => {
              if (options.signal.aborted) controller.abort()
            }
            options.signal.addEventListener("abort", linkSignal)

            const reqHeaders: Record<string, string> = {
              "Content-Type": "application/json",
            }
            if (apiKey) {
              reqHeaders["Authorization"] = `Bearer ${apiKey}`
              reqHeaders["Cookie"] = `better-auth.session_token=${apiKey}`
            }

            const attempt = await fetch(candidate, {
              method: "POST",
              headers: reqHeaders,
              body: JSON.stringify(requestBody),
              signal: controller.signal,
            })

            if (attempt.ok && attempt.body) {
              res = attempt
              targetUrl = candidate
              break
            }
          } catch (err: unknown) {
            fetchError = err instanceof Error ? err : new Error(String(err))
          }
        }

        if (!res || !res.body) {
          if (options.signal.aborted) return
          yield {
            type: "error",
            message: fetchError
              ? `Failed to reach Entry Agents Gateway (${targetUrl}): ${fetchError.message}`
              : `Entry Agents returned an error or is unreachable at ${baseUrl}`,
          }
          return
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        const lines = new LineBuffer()

        let currentAssistantContent = ""
        const currentToolCalls: Array<{
          id: string
          type: "function"
          function: { name: string; arguments: string }
        }> = []

        let usage: { input?: number; output?: number; reasoningTokens?: number } | undefined

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          for (const line of lines.push(decoder.decode(value, { stream: true }))) {
            const trimmed = line.trim()
            if (!trimmed || trimmed.startsWith(":")) continue
            if (!trimmed.startsWith("data:")) continue

            const payload = trimmed.slice(5).trim()
            if (payload === "[DONE]") break

            try {
              const chunk = JSON.parse(payload) as {
                choices?: Array<{
                  delta?: {
                    content?: string | null
                    reasoning_content?: string | null
                    tool_calls?: Array<{
                      index?: number
                      id?: string
                      function?: { name?: string; arguments?: string }
                    }>
                  }
                  finish_reason?: string | null
                }>
                usage?: {
                  prompt_tokens?: number
                  completion_tokens?: number
                  reasoning_tokens?: number
                }
              }

              if (chunk.usage) {
                usage = {
                  input: chunk.usage.prompt_tokens,
                  output: chunk.usage.completion_tokens,
                  reasoningTokens: chunk.usage.reasoning_tokens,
                }
              }

              const choice = chunk.choices?.[0]
              const delta = choice?.delta

              if (delta?.reasoning_content) {
                yield { type: "thinking", text: delta.reasoning_content }
              }

              if (delta?.content) {
                currentAssistantContent += delta.content
                yield { type: "text", text: delta.content }
              }

              if (delta?.tool_calls) {
                for (const tc of delta.tool_calls) {
                  const idx = tc.index ?? 0
                  if (!currentToolCalls[idx]) {
                    currentToolCalls[idx] = {
                      id: tc.id || `call_${Date.now()}_${idx}`,
                      type: "function",
                      function: { name: tc.function?.name || "", arguments: "" },
                    }
                  }
                  if (tc.function?.name) {
                    currentToolCalls[idx].function.name = tc.function.name
                  }
                  if (tc.function?.arguments) {
                    currentToolCalls[idx].function.arguments += tc.function.arguments
                  }
                }
              }
            } catch {
              // Ignore parse errors on malformed SSE lines
            }
          }
        }

        if (currentToolCalls.length === 0) {
          // Model finished turn with no tool calls
          yield {
            type: "done",
            usage,
          }
          return
        }

        // We have tool calls: execute them locally within workspace
        messages.push({
          role: "assistant",
          content: currentAssistantContent,
          tool_calls: currentToolCalls,
        })

        for (const tc of currentToolCalls) {
          const callId = tc.id
          const fnName = tc.function.name
          let parsedArgs: Record<string, unknown> = {}
          try {
            parsedArgs = JSON.parse(tc.function.arguments || "{}")
          } catch {
            parsedArgs = { raw: tc.function.arguments }
          }

          yield {
            type: "tool",
            id: callId,
            name: fnName,
            status: "running",
            input: tc.function.arguments,
          }

          const result = await executeWorkspaceTool(fnName, parsedArgs, cwd, mode)

          yield {
            type: "tool",
            id: callId,
            name: fnName,
            status: result.exitCode ? "error" : "done",
            output: result.output,
            exitCode: result.exitCode,
          }

          messages.push({
            role: "tool",
            tool_call_id: callId,
            content: result.output,
          })
        }

        // Loop back for model to respond to tool outputs
      }

      yield {
        type: "done",
      }
    },
  }
}
