#!/usr/bin/env bun
/**
 * Generates _manifest.json from the primers directory structure.
 * Run: bun scripts/generate-manifest.ts
 */

import { Effect, Array as Arr } from "effect"
import { FileSystem, Path } from "@effect/platform"
import { BunContext, BunRuntime } from "@effect/platform-bun"

interface PrimerConfig {
  description: string
  files: string[]
}

interface Manifest {
  version: number
  primers: Record<string, PrimerConfig>
}

const getFiles = (
  fs: FileSystem.FileSystem,
  dir: string,
  base: string = "",
): Effect.Effect<string[]> =>
  Effect.gen(function* () {
    const entries = yield* fs.readDirectory(dir)
    const files: string[] = []

    for (const entry of entries) {
      const fullPath = `${dir}/${entry}`
      const relPath = base ? `${base}/${entry}` : entry
      const stat = yield* fs.stat(fullPath)

      if (stat.type === "Directory") {
        const nested = yield* getFiles(fs, fullPath, relPath)
        files.push(...nested)
      } else if (entry.endsWith(".md")) {
        files.push(relPath)
      }
    }

    return files
  })

const extractDescription = (content: string): string => {
  const lines = content.split("\n")
  let foundTitle = false

  for (const line of lines) {
    if (line.startsWith("# ")) {
      foundTitle = true
      continue
    }
    if (foundTitle && line.trim() && !line.startsWith("#")) {
      return line.trim().replace(/\.$/, "").slice(0, 80)
    }
  }

  return ""
}

const program = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path

  const primersDir = path.join(import.meta.dir, "../primers")
  const manifestPath = path.join(primersDir, "_manifest.json")

  const entries = yield* fs.readDirectory(primersDir)
  const primers: Record<string, PrimerConfig> = {}

  const sortedEntries = Arr.sort(entries, (a, b) => a.localeCompare(b))

  for (const entry of sortedEntries) {
    if (entry.startsWith("_")) continue

    const primerDir = path.join(primersDir, entry)
    const stat = yield* fs.stat(primerDir)
    if (stat.type !== "Directory") continue

    const files = yield* getFiles(fs, primerDir)

    // Sort: index.md first, then alphabetically
    const sortedFiles = Arr.sort(files, (a, b) => {
      if (a === "index.md") return -1
      if (b === "index.md") return 1
      return a.localeCompare(b)
    })

    // Extract description from index.md
    const indexPath = path.join(primerDir, "index.md")
    const description = yield* fs.readFileString(indexPath).pipe(
      Effect.map(extractDescription),
      Effect.catchAll(() => Effect.succeed(entry)),
    )

    primers[entry] = { description, files: sortedFiles }
  }

  const manifest: Manifest = { version: 1, primers }
  yield* fs.writeFileString(manifestPath, JSON.stringify(manifest, null, 2) + "\n")

  yield* Effect.log(`Generated manifest with ${Object.keys(primers).length} primers:`)
  for (const [name, config] of Object.entries(primers)) {
    yield* Effect.log(`  ${name}: ${config.files.length} files`)
  }
})

BunRuntime.runMain(program.pipe(Effect.provide(BunContext.layer)))
