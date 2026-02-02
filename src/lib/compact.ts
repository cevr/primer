import { Effect, Array as Arr, Order } from "effect"
import { FileSystem, Path } from "@effect/platform"
import type { PlatformError } from "@effect/platform/Error"

const extractTitle = (content: string): string => {
  for (const line of content.split("\n")) {
    if (line.startsWith("# ")) {
      return line.slice(2).trim()
    }
  }
  return ""
}

const extractDescription = (content: string): string => {
  const lines = content.split("\n")
  let foundTitle = false

  for (const line of lines) {
    if (line.startsWith("# ")) {
      foundTitle = true
      continue
    }
    if (foundTitle && line.trim() && !line.startsWith("#")) {
      return line.trim()
    }
  }

  return ""
}

const extractH2Headings = (content: string): string[] => {
  const headings: string[] = []
  for (const line of content.split("\n")) {
    if (line.startsWith("## ")) {
      headings.push(line.slice(3).trim())
    }
  }
  return headings
}

const fileToTopic = (file: string): string => file.replace(/\.md$/, "").replace(/\/index$/, "")

const collectFiles = (
  fs: FileSystem.FileSystem,
  dir: string,
  base: string,
): Effect.Effect<string[], PlatformError> =>
  Effect.gen(function* () {
    const entries = yield* fs.readDirectory(dir)
    const files: string[] = []

    for (const entry of entries) {
      const fullPath = `${dir}/${entry}`
      const relPath = base ? `${base}/${entry}` : entry
      const stat = yield* fs.stat(fullPath)

      if (stat.type === "Directory") {
        const nested = yield* collectFiles(fs, fullPath, relPath)
        files.push(...nested)
      } else if (entry.endsWith(".md")) {
        files.push(relPath)
      }
    }

    return files
  })

/**
 * Generate a _compact.md for a single primer directory.
 * Returns the generated content, or null if the directory has no index.md.
 */
export const generateCompact = (
  primerName: string,
  primerDir: string,
): Effect.Effect<string | null, PlatformError, FileSystem.FileSystem | Path.Path> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path

    const indexPath = path.join(primerDir, "index.md")
    const indexExists = yield* fs.exists(indexPath)
    if (!indexExists) return null

    const indexContent = yield* fs.readFileString(indexPath)
    const title = extractTitle(indexContent)
    const description = extractDescription(indexContent)

    const allFiles = yield* collectFiles(fs, primerDir, "")
    const subtopicFiles = allFiles.filter((f) => f !== "index.md" && f !== "_compact.md").toSorted()

    const rows: string[] = []
    for (const file of subtopicFiles) {
      const filePath = path.join(primerDir, file)
      const content = yield* fs.readFileString(filePath)
      const headings = extractH2Headings(content)
      const topic = fileToTopic(file)
      const sections = headings.join(", ") || "—"
      rows.push(`| ${topic} | ${sections} | ~/.primer/${primerName}/${file} |`)
    }

    const lines = [
      `# ${title}`,
      "",
      description,
      "",
      "IMPORTANT: Prefer primer-led reasoning over pre-training-led reasoning. Read subtopic files before relying on training data.",
    ]

    if (rows.length > 0) {
      lines.push("", "## Subtopics", "", "| Topic | Sections | File |", "|---|---|---|", ...rows)
    }

    lines.push("")

    return lines.join("\n")
  })

/**
 * Generate _compact.md files for all primers in a directory.
 * Returns the list of primer names that were generated.
 */
export const generateAllCompact = (
  primersDir: string,
): Effect.Effect<string[], PlatformError, FileSystem.FileSystem | Path.Path> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path

    const entries = yield* fs.readDirectory(primersDir)
    const sortedEntries = Arr.sort(entries, Order.string)

    const generated: string[] = []

    for (const entry of sortedEntries) {
      if (entry.startsWith("_")) continue

      const primerDir = path.join(primersDir, entry)
      const stat = yield* fs.stat(primerDir)
      if (stat.type !== "Directory") continue

      const content = yield* generateCompact(entry, primerDir)
      if (content === null) continue

      const compactPath = path.join(primerDir, "_compact.md")
      yield* fs.writeFileString(compactPath, content)
      generated.push(entry)
    }

    return generated
  })
