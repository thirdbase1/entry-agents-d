/**
 * The OpenAI-compatible model providers the app ships knowing about.
 *
 * Client-safe on purpose: the settings schema, the settings UI and the server
 * catalog all need the same slugs, and a slug is the prefix of every composite
 * model id (`<slug>/<model>`) as well as a key in `settings.json` — so the list
 * has to be importable from both sides of the boundary.
 *
 * Every `baseUrl` ends at the version segment with no trailing slash: the
 * catalog appends `/models` and the chat path appends `/chat/completions`.
 */

export type ModelProviderPreset = {
  slug: string
  name: string
  baseUrl: string
}

export const MODEL_PROVIDER_PRESETS: ModelProviderPreset[] = [
  { slug: "entry", name: "Entry Agents", baseUrl: "https://entry-agents.dev" },
]

/**
 * Slugs are separator-free and file-safe rather than escaped — they become
 * composite-model-id prefixes and object keys in `settings.json`, so a slug
 * carrying a `/` would silently redirect a model id.
 */
export const MODEL_PROVIDER_SLUG_RE = /^[a-z0-9-]{1,32}$/

/**
 * `ollama` names the local source, which is configured under
 * `settings.providers.ollama` — a second entry under the same name would make
 * `ollama/<model>` ambiguous, so normalization drops it.
 */
export const RESERVED_MODEL_PROVIDER_SLUGS = ["ollama"]
