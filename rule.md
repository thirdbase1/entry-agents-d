# Entry Agents Desktop — Core Architectural Rules & Directives

> **CRITICAL DIRECTIVE**: Always consult and strictly adhere to these rules for every task in this repository.

---

### 1. Zero Host Execution Boundary
- **NEVER** run unmanaged dev servers, background processes, or `.exe`/`.msi` installers locally on the user's host machine.
- All testing and validation must be lightweight, sandboxed, or executed via designated CI/CD and build systems.

---

### 2. Single Repository Scope (Desktop Only)
- Work is strictly confined to the desktop repository: **`thirdbase1/entry-agents-d`**.
- **DO NOT** edit, modify, or commit to the web repository (`entryagents/entry-agents`).
- The Entry Web platform and backend are already live at **`https://entry-agents.dev`**.

---

### 3. Production Backend: Main Domain Only (`entry-agents.dev`)
- **NEVER use non-canonical domains.**
- All desktop integration endpoints reside exclusively under the main domain:
  - Device Auth Start: `POST https://entry-agents.dev/api/desktop/device/start`
  - Device Auth Poll: `POST https://entry-agents.dev/api/desktop/device/poll`
  - Browser Approval: `GET https://entry-agents.dev/desktop/approve?code=XXXXXX`
  - Gateway Models: `GET https://entry-agents.dev/api/desktop/models`
  - Usage & Credits: `GET https://entry-agents.dev/api/desktop/usage`
  - Per-turn Usage: `POST https://entry-agents.dev/api/desktop/usage`
- Centralize all backend URLs through `lib/auth/device-auth.ts`. Never hardcode scattered URLs.

---

### 4. 100% Native Identity
- The application is built from scratch as **Entry Agents Desktop**.
- Product identity is strictly:
  - Application Name: **Entry Agents Desktop**
  - Bundle Identifier: **`com.entry.agents`**
  - Binary Name: **`Entry Agents`**
  - Repository: **`thirdbase1/entry-agents-d`**

---

### 5. Unified 3D Metallic Shield "E" Branding
- All app icons, taskbar icons, window decorations, favicons, installer artwork, and web asset icons must use the user-uploaded 3D metallic shield "E" logo.
- Multi-resolution ICOs (`icon.ico`, `favicon.ico`) and PNGs across all Tauri bundle sizes (16x16 to 512x512) are permanently generated from this master asset.

---

### 6. Automated Browser Launching
- In desktop environments (WebView2 / Tauri), `window.open()` is restricted or suppressed.
- The desktop app must automatically launch the user's default system browser (Chrome/Edge/Brave) immediately when sign-in starts via native OS process execution (`cmd.exe /c start "" "<url>"`, `open`, `xdg-open`).
- The user must never be stranded on an approval screen without their browser opening.

---

### 7. User Authentication & Model Endpoint Calling
- **NEVER require Gateway API keys or Gateway URLs from the desktop user.**
- The desktop user authenticates exclusively through the Entry device authorization flow.
- The resulting user session token (stored securely in OS Credential Store) is passed as:
  `Authorization: Bearer <session_token>`
  to `https://entry-agents.dev/api/desktop/models` and `https://entry-agents.dev/api/desktop/usage`.
- The Entry Web backend resolves the user and queries its internal model gateway on the server.

---

### 8. Gateway Model Representation & Accurate Provider Icons
- **Entry is the Platform Gateway Provider, NOT a single model.**
- Entry Gateway delivers models from world-class AI providers:
  - **Anthropic**: Claude 3.7 Sonnet, Claude 3.5 Sonnet, Claude 3.5 Haiku, Claude Opus
  - **OpenAI**: GPT-4o, GPT-4o mini, o1, o3, o3-mini
  - **Google**: Gemini 2.0 Flash, Gemini 1.5 Pro, Gemini 1.5 Flash
  - **DeepSeek**: DeepSeek V3, DeepSeek R1
  - **Meta**: Llama 3.3 70B, Llama 3.1 405B
  - **xAI**: Grok 2, Grok 3
  - **Mistral**: Mistral Large, Codestral
  - **Qwen**: Qwen 2.5 Coder
  - **Moonshot / Kimi**, **Cohere / Command**, **ZAI / GLM**, **MiniMax**
- Each model and group in the desktop UI must display its **actual accurate provider logo** (Anthropic mark for Claude, OpenAI mark for GPT, Google mark for Gemini, DeepSeek mark for DeepSeek, Meta mark for Llama, etc.), exactly matching the Entry Web implementation.

---

### 9. OpenCode Architectural Principles
Study and apply OpenCode's proven autonomous desktop patterns:
- **Permission Modes**:
  - `read-only`: Inspect files and analyze code without disk modifications.
  - `plan`: Formulate comprehensive implementation roadmaps and steps before execution.
  - `edits`: File creation and modifications require approval or auto-commit tracking.
  - `full`: Autonomous execution with tool execution, file edits, and commands.
- **Deep-linking & Token Delivery**: Secure one-time session delivery directly to OS credential storage (Windows DPAPI, macOS Keychain, Linux secret-tool).
- **Turn Inspection & Reversibility**: Visual diff review and snapshot restoration for every agent turn.
