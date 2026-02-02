import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import { FileSystem, Path } from "@effect/platform"
import type { PlatformError } from "@effect/platform/Error"
import { NodeContext } from "@effect/platform-node"
import { generateCompact, generateAllCompact } from "../../src/lib/compact.js"

const withTempDir = <A>(
  fn: (dir: string) => Effect.Effect<A, PlatformError, FileSystem.FileSystem | Path.Path>,
) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const dir = `/tmp/compact-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
    yield* fs.makeDirectory(dir, { recursive: true })
    try {
      return yield* fn(dir)
    } finally {
      yield* fs.remove(dir, { recursive: true })
    }
  }).pipe(Effect.provide(NodeContext.layer))

const writeFile = (fs: FileSystem.FileSystem, path: string, content: string) =>
  Effect.gen(function* () {
    const dir = path.slice(0, path.lastIndexOf("/"))
    yield* fs.makeDirectory(dir, { recursive: true })
    yield* fs.writeFileString(path, content)
  })

describe("generateCompact", () => {
  it.effect("generates compact index from primer directory", () =>
    withTempDir((dir) =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem

        yield* writeFile(fs, `${dir}/index.md`, "# My Primer\n\nA great primer about things.\n")
        yield* writeFile(
          fs,
          `${dir}/basics.md`,
          "# Basics\n\n## Getting Started\n\n## Core Concepts\n",
        )
        yield* writeFile(fs, `${dir}/advanced.md`, "# Advanced\n\n## Patterns\n\n## Gotchas\n")

        const result = yield* generateCompact("my-primer", dir)

        expect(result).not.toBeNull()
        const content = result as string

        // Title from index.md
        expect(content).toContain("# My Primer")
        // Description from first line after title
        expect(content).toContain("A great primer about things.")
        // Directive
        expect(content).toContain("Prefer retrieval-led reasoning over pre-training-led reasoning")
        // Subtopics table header
        expect(content).toContain("| Topic | Sections | File |")
        // Subtopic rows with headings and file paths
        expect(content).toContain(
          "| advanced | Patterns, Gotchas | ~/.primer/my-primer/advanced.md |",
        )
        expect(content).toContain(
          "| basics | Getting Started, Core Concepts | ~/.primer/my-primer/basics.md |",
        )
      }),
    ),
  )

  it.effect("returns null when index.md is missing", () =>
    withTempDir((dir) =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem

        yield* writeFile(fs, `${dir}/basics.md`, "# Basics\n\n## Intro\n")

        const result = yield* generateCompact("test", dir)

        expect(result).toBeNull()
      }),
    ),
  )

  it.effect("handles primer with no subtopics", () =>
    withTempDir((dir) =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem

        yield* writeFile(fs, `${dir}/index.md`, "# Solo Primer\n\nJust the index.\n")

        const result = yield* generateCompact("solo", dir)

        expect(result).not.toBeNull()
        const content = result as string

        expect(content).toContain("# Solo Primer")
        expect(content).toContain("Just the index.")
        // No subtopics table
        expect(content).not.toContain("## Subtopics")
      }),
    ),
  )

  it.effect("handles frontmatter before title", () =>
    withTempDir((dir) =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem

        yield* writeFile(
          fs,
          `${dir}/index.md`,
          "---\nsources:\n  - https://example.com\n---\n\n# Effect TypeScript\n\nField manual for Effect.\n",
        )
        yield* writeFile(fs, `${dir}/services.md`, "# Services\n\n## What is a Service?\n")

        const result = yield* generateCompact("effect", dir)

        expect(result).not.toBeNull()
        const content = result as string

        expect(content).toContain("# Effect TypeScript")
        expect(content).toContain("Field manual for Effect.")
        expect(content).toContain(
          "| services | What is a Service? | ~/.primer/effect/services.md |",
        )
      }),
    ),
  )

  it.effect("handles nested directories", () =>
    withTempDir((dir) =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem

        yield* writeFile(fs, `${dir}/index.md`, "# Framework\n\nUI framework.\n")
        yield* writeFile(fs, `${dir}/core/index.md`, "# Core\n\n## API\n\n## Patterns\n")
        yield* writeFile(fs, `${dir}/core/gotchas.md`, "# Gotchas\n\n## Runtime Issues\n")
        yield* writeFile(fs, `${dir}/react/index.md`, "# React\n\n## Hooks\n")

        const result = yield* generateCompact("framework", dir)

        expect(result).not.toBeNull()
        const content = result as string

        expect(content).toContain("| core | API, Patterns | ~/.primer/framework/core/index.md |")
        expect(content).toContain(
          "| core/gotchas | Runtime Issues | ~/.primer/framework/core/gotchas.md |",
        )
        expect(content).toContain("| react | Hooks | ~/.primer/framework/react/index.md |")
      }),
    ),
  )

  it.effect("uses em dash for subtopics with no headings", () =>
    withTempDir((dir) =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem

        yield* writeFile(fs, `${dir}/index.md`, "# Primer\n\nDescription.\n")
        yield* writeFile(fs, `${dir}/notes.md`, "Just some notes without any headings.\n")

        const result = yield* generateCompact("test", dir)

        expect(result).not.toBeNull()
        const content = result as string

        expect(content).toContain("| notes | — | ~/.primer/test/notes.md |")
      }),
    ),
  )

  it.effect("excludes _compact.md from subtopics", () =>
    withTempDir((dir) =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem

        yield* writeFile(fs, `${dir}/index.md`, "# Primer\n\nDescription.\n")
        yield* writeFile(fs, `${dir}/_compact.md`, "old compact content")
        yield* writeFile(fs, `${dir}/basics.md`, "# Basics\n\n## Intro\n")

        const result = yield* generateCompact("test", dir)

        expect(result).not.toBeNull()
        const content = result as string

        // Only basics, not _compact
        expect(content).toContain("| basics |")
        expect(content).not.toContain("| _compact |")
      }),
    ),
  )
})

describe("generateAllCompact", () => {
  it.effect("generates compact files for all primer directories", () =>
    withTempDir((dir) =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem

        // Primer A
        yield* writeFile(fs, `${dir}/alpha/index.md`, "# Alpha\n\nFirst primer.\n")
        yield* writeFile(fs, `${dir}/alpha/setup.md`, "# Setup\n\n## Install\n")

        // Primer B
        yield* writeFile(fs, `${dir}/beta/index.md`, "# Beta\n\nSecond primer.\n")

        // _manifest.json (should be skipped)
        yield* writeFile(fs, `${dir}/_manifest.json`, "{}")

        const generated = yield* generateAllCompact(dir)

        expect(generated).toEqual(["alpha", "beta"])

        // Verify files were written
        const alphaCompact = yield* fs.readFileString(`${dir}/alpha/_compact.md`)
        expect(alphaCompact).toContain("# Alpha")
        expect(alphaCompact).toContain("| setup | Install | ~/.primer/alpha/setup.md |")

        const betaCompact = yield* fs.readFileString(`${dir}/beta/_compact.md`)
        expect(betaCompact).toContain("# Beta")
        expect(betaCompact).not.toContain("## Subtopics")
      }),
    ),
  )

  it.effect("skips directories without index.md", () =>
    withTempDir((dir) =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem

        yield* writeFile(fs, `${dir}/good/index.md`, "# Good\n\nHas index.\n")
        yield* writeFile(fs, `${dir}/bad/notes.md`, "# Notes\n\nNo index.\n")

        const generated = yield* generateAllCompact(dir)

        expect(generated).toEqual(["good"])

        const badCompactExists = yield* fs.exists(`${dir}/bad/_compact.md`)
        expect(badCompactExists).toBe(false)
      }),
    ),
  )

  it.effect("skips underscore-prefixed entries", () =>
    withTempDir((dir) =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem

        yield* writeFile(fs, `${dir}/primer/index.md`, "# Primer\n\nReal primer.\n")
        yield* writeFile(fs, `${dir}/_internal/index.md`, "# Internal\n\nShould be skipped.\n")

        const generated = yield* generateAllCompact(dir)

        expect(generated).toEqual(["primer"])
      }),
    ),
  )
})
