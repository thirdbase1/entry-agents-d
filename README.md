<div align="center">
  <img src="public/icon.png" alt="Entry Agents Logo" width="80" height="80" />
  <h1>Entry Agents Desktop</h1>
  <p><strong>The autonomous AI software engineering desktop application powered by Entry Agents.</strong></p>

  <p>
    <a href="https://github.com/thirdbase1/entry-agents-d/releases"><img src="https://img.shields.io/github/v/release/thirdbase1/entry-agents-d?style=flat-square&color=emerald" alt="Release" /></a>
    <a href="https://entry-agents.dev"><img src="https://img.shields.io/badge/platform-entry--agents.dev-blue?style=flat-square" alt="Platform" /></a>
    <a href="https://tauri.app"><img src="https://img.shields.io/badge/shell-Tauri%20v2-orange?style=flat-square" alt="Tauri v2" /></a>
    <a href="https://nextjs.org"><img src="https://img.shields.io/badge/framework-Next.js%2016-black?style=flat-square" alt="Next.js 16" /></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-purple?style=flat-square" alt="License" /></a>
  </p>
</div>

---

## Overview

**Entry Agents Desktop (`entry-agents-d`)** is an elite, open-source native desktop development environment designed for autonomous coding agents. It connects directly to the **Entry Agents Platform** ([entry-agents.dev](https://entry-agents.dev)) to provide full-lifecycle software engineering assistance directly on your local codebase.

Built with a high-performance **Tauri v2** native shell, **Next.js 16**, and **React 19**, Entry Agents delivers sub-millisecond response times, zero-latency Pierre diff rendering, and local-first git worktree isolation without the overhead of traditional Electron applications.

---

## Key Features

- **⚡ Direct Platform Integration**: Automatically connects to Entry Agents (`https://entry-agents.dev`) with zero configuration or manual URL setup required.
- **🧠 Dynamic Live Models & 1M Context**: All available models (including `Step 5 Preview`, `GLM 5.3 Flash`, `DeepSeek V4.1 Flash`) and their massive context window capabilities stream live from the Entry API.
- **🛠️ Autonomous Workspace Toolset**:
  - `read_file` & `list_directory`: Intelligent workspace exploration and line-ranged reading.
  - `create_file` & `edit_file`: Atomic file writing and precise string-replacement edits.
  - `search_files` & `search_content`: Fast ripgrep/findstr content and glob search across project trees.
  - `run_command`: Controlled terminal execution inside your project root with output truncation safeguards.
  - `git_status` & `git_diff`: Live git inspection and staged/unstaged change tracking.
- **🔍 Pierre Multi-File Diffs**: Inspect live side-by-side or unified code diffs with syntax highlighting, token-level changes, and immediate rollback support.
- **🛡️ Granular Permission Policies**:
  - `read-only`: Safe code analysis and exploration without modifying files or executing shell commands.
  - `plan`: Architectural design mode; the agent formulates structural blueprints before proposing edits.
  - `edits`: Standard engineering mode; allows file creation and modifications with safety confirmations.
  - `full`: Unrestricted local autonomous development including shell commands and terminal builds.
- **🌿 Git Worktree Isolation**: Run concurrent agent sessions in isolated git worktrees without interfering with your active working branch.
- **🎨 Modern Dark Workspace**: Built-in high-contrast and soft dark themes, zoom controls, and custom typeface rendering.

---

## Architectural Comparison

| Dimension | Entry Agents Desktop | OpenCode | Void / Cursor | Traditional IDE Extensions |
| :--- | :--- | :--- | :--- | :--- |
| **Shell Technology** | **Tauri v2 Native Shell** | Terminal / CLI | Electron / Chromium | VS Code Webview sandbox |
| **Model Catalog** | **100% Dynamic from Entry API** | Manual config file | Static preset dropdowns | Stale local manifests |
| **Context Window** | **Full 1M Token Streaming** | Varies by provider | Hardcoded truncation | Fixed window limits |
| **Diff Viewer** | **Pierre Engine (Unified & Split)** | Terminal git diff | Custom split editor | Generic inline diffs |
| **Worktree Isolation** | **Native Per-Session Worktrees** | No | Manual git branching | Not supported |
| **Credential Safety** | **Zero Hardcoded Secrets** | Cleartext tokens | Local keyrings | In-memory token storage |

---

## Quickstart

### Prerequisites
- Node.js `>= 20.9.0`
- [Rust](https://rustup.rs/) (for Tauri desktop compilation)

### Development Setup

```bash
# Clone the repository
git clone https://github.com/thirdbase1/entry-agents-d.git
cd entry-agents-d

# Install dependencies
npm install --legacy-peer-deps

# Run web development server
npm run dev

# Run native desktop development shell
npm run desktop:dev
```

### Building the Desktop Executable

```bash
# Package the Tauri desktop binary
npm run desktop:build
```

---

## Project Structure

```text
├── app/                    # Next.js App Router (UI, routes, and settings)
│   ├── api/
│   │   ├── chat/           # SSE streaming chat execution route
│   │   └── models/         # Dynamic live model retrieval from Entry API
│   ├── hooks/              # Agent configuration, sessions, and keyboard hooks
│   └── settings/           # Clean Entry platform preferences & permission controls
├── components/             # Pierre diffs, chat transcripts, and UI primitives
├── lib/
│   ├── providers/          # Entry Agents native provider & workspace tool runner
│   │   ├── entry.ts        # Dynamic gateway client & tool execution logic
│   │   └── registry.ts     # Exclusive Entry platform provider registry
│   ├── settings/           # Type-safe application settings schema
│   └── store/              # Local session storage & transcript persistence
├── src-tauri/              # Native Tauri v2 Rust desktop shell & window manager
└── tests/                  # Node.js native test suite
```

---

## License

This project is licensed under the [MIT License](LICENSE).
