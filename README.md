<div align="center">
  <img src="public/icon.png" alt="Entry Agents logo" width="76" height="76" />
  <h1>Entry Agents Desktop</h1>
  <p><strong>A local-first desktop workspace for building software with AI agents.</strong></p>
  <p>
    <a href="https://github.com/thirdbase1/entry-agents-d/releases"><img src="https://img.shields.io/github/v/release/thirdbase1/entry-agents-d?style=flat-square" alt="Latest release" /></a>
    <a href="https://entry-agents.dev"><img src="https://img.shields.io/badge/platform-Entry%20Agents-blue?style=flat-square" alt="Entry Agents platform" /></a>
    <a href="https://tauri.app"><img src="https://img.shields.io/badge/desktop-Tauri%20v2-orange?style=flat-square" alt="Tauri v2" /></a>
    <a href="https://nextjs.org"><img src="https://img.shields.io/badge/app-Next.js%2016-black?style=flat-square" alt="Next.js 16" /></a>
  </p>
</div>

---

## What it is

Entry Agents Desktop brings the Entry Agents model platform into a desktop coding workspace. It runs on your computer, works with local project folders and Git repositories, and connects to the Entry Agents Gateway for model inference.

The application combines a Tauri v2 desktop shell with a locally hosted Next.js application. The shell starts a bundled Node.js server on a loopback address and opens the desktop window after the server passes its readiness check. Your project files and the app's session data remain on your machine; model requests are sent to the configured Entry endpoint.

This repository is the desktop client. The hosted model and account platform is maintained separately at [entry-agents.dev](https://entry-agents.dev).

## What you can do

### Agent-assisted coding

- Start and continue chats associated with local working directories.
- Choose a model from the live Entry model catalogue.
- Stream model output, reasoning events, and tool activity into the conversation.
- Let the agent inspect files, create files, edit files, search the project, run commands, and inspect Git state.
- Attach files and images where supported by the selected model.
- Use permission modes to control which operations the Entry coding provider may perform.

### Work with multiple agents

- Start subagent runs through the app's MCP bridge.
- See subagent activity and results in the workspace.
- Continue or message existing subagent sessions.
- Run subagents in a shared working directory or, where supported, an isolated Git worktree.
- Connect compatible local agent harnesses that are installed and available on the machine.

Subagent runs use the same chat execution and persistence path as normal conversations. The available harnesses depend on the local tools installed and detected by the app.

### Project and Git workflow

- Browse project files and inspect file contents.
- Review staged and unstaged changes with syntax-aware diffs powered by [Pierre Diffs](https://github.com/pierrecomputer/pierre).
- Inspect Git status, create commits, push changes, and revert changes.
- Create separate Git worktrees so concurrent agent sessions can work on separate branches.
- Capture and restore per-turn Git checkpoints.
- Track development processes started during agent work.

### Workspace tools

The application includes a file workspace, chat history, command palette, notes, memory, task and plan views, usage summaries, and configurable appearance settings. It also provides an MCP endpoint and a small CLI for interacting with the running desktop application and its subagents.

## How it is built

Entry Agents Desktop is not an Electron application.

| Layer | Technology | Responsibility |
| --- | --- | --- |
| Desktop shell | Rust, Tauri v2 | Native window, lifecycle, sidecar startup, desktop integrations, and packaging |
| Application UI | Next.js 16, React 19, TypeScript | Chat workspace, settings, file views, activity, and application routes |
| Local application server | Node.js 22 standalone runtime | Runs the Next.js server on the user's machine |
| Package tooling | Bun | Dependency installation and JavaScript/TypeScript scripts |
| Agent platform | Entry Agents Gateway | Model catalogue and OpenAI-compatible streaming chat completions |
| Local persistence | JSON files | Sessions, transcripts, settings, memory, notes, and related app state |
| Git integration | Git CLI | Status, diffs, commits, worktrees, checkpoints, and repository operations |

### Request and execution flow

1. The Tauri shell starts the bundled Node.js runtime and the packaged Next.js standalone server.
2. The desktop app waits for a health response that includes a per-launch token before showing the application window.
3. The UI requests the live model catalogue from the Entry provider.
4. When a chat turn starts, the local server sends the selected model and conversation to the Entry Gateway using a streaming chat-completions request.
5. When the model requests a tool, the local Entry provider executes the corresponding workspace operation on the computer and sends the result back to the model.
6. The server streams events to the UI and persists the conversation locally.

The Entry provider is the application's primary chat provider. Other compatible local agent harnesses are exposed through the subagent system; they are not additional selectable primary model providers in the provider registry.

### Permission modes

The Entry provider exposes four application-level modes:

| Mode | Behavior |
| --- | --- |
| `read-only` | Blocks file creation, file edits, and shell-command execution through the Entry tool set |
| `plan` | Simulates mutating tool requests instead of applying them |
| `edits` | Allows file changes and shell-command execution |
| `full` | Allows the same mutating tool operations without the narrower default mode |

These are application-level controls, not an operating-system security sandbox. In modes that allow command execution, commands run with the permissions of the desktop user's account. Review the selected mode and the agent's requested actions before allowing work on important files.

## Download

The latest published desktop release is available from the [GitHub Releases page](https://github.com/thirdbase1/entry-agents-d/releases).

The current automated release workflow publishes a Windows x64 installer. Other operating-system targets are present in parts of the build configuration, but are not currently published by that release workflow.

## Development

### Requirements

- [Bun](https://bun.sh/) 1.4.4 (the version pinned by `package.json`)
- Node.js 20.9 or newer
- [Rust](https://www.rust-lang.org/tools/install) 1.82 or newer, with the stable toolchain
- The platform build tools required by Tauri v2

On Linux, install the Tauri system dependencies for your distribution. The CI workflow currently installs WebKitGTK 4.1, GTK/build tools, OpenSSL, and the other Tauri packaging dependencies on Ubuntu.

### Install dependencies

```bash
git clone https://github.com/thirdbase1/entry-agents-d.git
cd entry-agents-d
bun install --frozen-lockfile
```

### Run the web application

```bash
bun run dev
```

This starts the Next.js development server at `http://localhost:3000`.

### Run the desktop application

```bash
bun run desktop:dev
```

The desktop development command prepares the Node sidecar required by the Tauri build and starts the Tauri shell against the Next.js development server.

### Build the desktop application

```bash
bun run desktop:build
```

The desktop preparation script builds the Next.js standalone application, stages the server and static assets into the Tauri resources directory, and downloads the pinned Node.js runtime for the selected target. Tauri then packages the application.

To stage only the Node runtime and the placeholder resource directory:

```bash
node scripts/prepare-desktop.mjs --skip-next
```

The preparation script also accepts an explicit Rust target triple, for example:

```bash
node scripts/prepare-desktop.mjs --target x86_64-pc-windows-msvc
```

## Configuration and local data

The default application data directory is:

- macOS and Linux: `~/.entry-agents`
- Windows: the equivalent `.entry-agents` directory under the user's home directory

Set `ENTRY_AGENTS_DIR` to use a different location. The legacy `AGENT_UI_DIR` variable is also accepted.

The directory contains local application data, including:

- `settings.json` — application settings and configured credentials
- `sessions/` — chat metadata, transcripts, and event journals
- `memory/` — agent memory files
- `notes/` — notes, revisions, threads, and note assets
- `worktrees/` — worktrees created and managed by the application
- `bridge.json` — the local MCP bridge address and access token

The settings writer uses owner-only file permissions on systems that support POSIX permissions. Treat the data directory as sensitive: it can contain API credentials, conversation history, project context, and a token for the local MCP bridge.

### Entry Gateway settings

The default Gateway URL is `https://entry-agents.dev`. The provider can also read configuration from these environment variables:

| Variable | Purpose |
| --- | --- |
| `GATEWAY_BASE_URL` | Override the Entry Gateway base URL |
| `GATEWAY_API_KEY` | Gateway API credential |
| `ENTRY_API_KEY` | Fallback API credential |

The API key can also be configured in the application's Entry provider settings. Do not commit credentials or place real API keys in source files.

## CLI and MCP bridge

The repository includes a dependency-free Node.js CLI at `bin/entry-agents.mjs`. It communicates with the running desktop app through the local MCP bridge.

Examples:

```bash
# List detected agent harnesses
node bin/entry-agents.mjs harnesses

# List models for a harness
node bin/entry-agents.mjs models <harness>

# Start a subagent run
node bin/entry-agents.mjs run <harness> "Inspect this project and report the main issues"

# List recent runs
node bin/entry-agents.mjs list

# Run the MCP stdio proxy
node bin/entry-agents.mjs mcp
```

Run `node bin/entry-agents.mjs` without a command to see the available command usage. The desktop app must be running before the CLI can connect.

## Tests and checks

The project provides unit tests, end-to-end browser tests, linting, type checking, and production builds.

```bash
bun run lint
bun run typecheck
bun run test
bun run test:e2e
bun run build
```

The GitHub Actions CI workflow runs lint, type checking, unit tests, and a Next.js production build. A separate desktop workflow checks the Tauri Rust project on Linux. Release packaging is handled by the release workflow.

## Repository layout

```text
app/                  Next.js routes, API handlers, hooks, and settings
components/           Workspace UI and reusable interface components
lib/                  Agent providers, execution, persistence, Git, MCP, and utilities
bin/                  Node.js CLI and MCP stdio proxy
scripts/              Desktop staging, benchmarks, and maintenance scripts
src-tauri/             Rust/Tauri shell, capabilities, icons, and packaging configuration
tests/                 Unit and end-to-end tests
docs/                  Engineering reviews and implementation notes
website/               Static project website and screenshots
```

## Project status and licensing

The repository has a published `v1.0.0` Windows x64 release. The source is public, but this repository currently has no root `LICENSE` file and GitHub does not identify a repository-wide license. `THIRD_PARTY_NOTICES.md` records the MIT-licensed T3 Code portions adapted in this project; that notice does not grant an overall license to the rest of this repository. Do not assume the complete project is MIT-licensed.

---

**Entry Agents Desktop** is the local development client for [Entry Agents](https://entry-agents.dev).
