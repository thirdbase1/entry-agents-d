import { existsSync } from "node:fs"
import { readFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import ts from "typescript"

const root = new URL("../", import.meta.url)

/**
 * Vendored components are `.tsx`, and Node's strip-only loader cannot parse
 * JSX — so a lib module that imports a *function* out of one (only
 * `lib/turn-files.ts` does) is unimportable under the runner. These stand-ins
 * carry that handful of pure helpers, copied from the vendored source and kept
 * beside a note saying so. Nothing else may be stubbed: a test of app logic
 * must run the app's own code.
 */
const STUBS = {
  "@/components/ui/change-summary": "./stubs/change-summary.ts",
  "@/components/ui/message-parts": "./stubs/message-parts.ts",
}

/**
 * Resolves `@/lib/handoff/build` the way the bundler does: the alias points at
 * the repo root, and a specifier with no extension is tried as `.ts` and then
 * as `.ts` inside a directory.
 */
export function resolve(specifier, context, nextResolve) {
  // `server-only` exists to throw outside a server component; under the test
  // runner it would refuse every server module the suite wants to exercise.
  if (specifier === "server-only") {
    return nextResolve(new URL("./server-only-stub.mjs", import.meta.url).href, context)
  }
  if (specifier === "next/server") {
    return nextResolve("next/server.js", context)
  }
  if (STUBS[specifier]) {
    return nextResolve(new URL(STUBS[specifier], import.meta.url).href, context)
  }
  const target = specifier.startsWith("@/")
    ? new URL(specifier.slice(2), root)
    : specifier.startsWith(".") && context.parentURL
      ? new URL(specifier, context.parentURL)
      : null
  if (!target) return nextResolve(specifier, context)

  for (const candidate of [target.href, `${target.href}.ts`, `${target.href}/index.ts`]) {
    if (existsSync(fileURLToPath(candidate))) {
      return nextResolve(candidate, context)
    }
  }
  return nextResolve(specifier, context)
}

export async function load(url, context, nextLoad) {
  if (url.endsWith(".ts") || url.endsWith(".tsx")) {
    const raw = await readFile(fileURLToPath(url), "utf8")
    const transpiled = ts.transpileModule(raw, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ESNext,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
      fileName: fileURLToPath(url),
    }).outputText
    return {
      format: "module",
      shortCircuit: true,
      source: transpiled,
    }
  }
  return nextLoad(url, context)
}
