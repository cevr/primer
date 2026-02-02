import { Context, DateTime, Effect, Layer, Config, Option } from "effect"
import { FileSystem, Path, HttpClient, HttpClientRequest, Headers } from "@effect/platform"
import type { PlatformError } from "@effect/platform/Error"
import { ContentNotFoundError, FetchError, ManifestError } from "../lib/errors.js"
import { generateCompact } from "../lib/compact.js"
import { ManifestService } from "./ManifestService.js"
import { readMeta, writeMeta, type Meta } from "../lib/meta.js"

type FetchResult = { content: string; etag: string | undefined } | { notModified: true }

const REPO = "cevr/primer"
const BRANCH = "main"
const RAW_BASE = `https://raw.githubusercontent.com/${REPO}/${BRANCH}`

const HomeConfig = Config.string("HOME").pipe(Config.withDefault("~"))
const PrimerDirConfig = Config.all([
  Config.string("PRIMER_DIR").pipe(Config.option),
  HomeConfig,
]).pipe(
  Config.map(([primerDir, home]) =>
    primerDir._tag === "Some" ? primerDir.value : `${home}/.primer`,
  ),
)

export class PrimerCache extends Context.Tag("@primer/PrimerCache")<
  PrimerCache,
  {
    readonly resolve: (
      path: ReadonlyArray<string>,
    ) => Effect.Effect<string, ContentNotFoundError | PlatformError>
    readonly resolvePath: (
      path: ReadonlyArray<string>,
    ) => Effect.Effect<string, ContentNotFoundError | PlatformError>
    readonly ensure: (
      primer: string,
    ) => Effect.Effect<void, FetchError | ManifestError | PlatformError>
    readonly refreshInBackground: (primer: string) => Effect.Effect<void>
    readonly refreshAll: () => Effect.Effect<
      ReadonlyArray<string>,
      FetchError | ManifestError | PlatformError
    >
    readonly suggestSimilar: (
      path: ReadonlyArray<string>,
    ) => Effect.Effect<ReadonlyArray<string>, ManifestError | FetchError | PlatformError>
  }
>() {}

export const PrimerCacheLive = Layer.effect(
  PrimerCache,
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const http = yield* HttpClient.HttpClient
    const manifest = yield* ManifestService
    const basePath = yield* PrimerDirConfig

    const metaPath = path.join(basePath, "_meta.json")

    const fetchFile = (
      filePath: string,
      cachedEtag?: string,
    ): Effect.Effect<FetchResult, FetchError> =>
      Effect.gen(function* () {
        const url = `${RAW_BASE}/primers/${filePath}`
        const request = cachedEtag
          ? HttpClientRequest.get(url).pipe(
              HttpClientRequest.setHeader("If-None-Match", cachedEtag),
            )
          : HttpClientRequest.get(url)

        const response = yield* http.execute(request).pipe(
          Effect.mapError((e) => new FetchError({ url, cause: e })),
          Effect.scoped,
        )

        if (response.status === 304) {
          return { notModified: true } as const
        }

        if (response.status !== 200) {
          return yield* new FetchError({ url })
        }

        const content = yield* response.text.pipe(
          Effect.mapError((e) => new FetchError({ url, cause: e })),
        )
        const etag = Option.getOrUndefined(Headers.get(response.headers, "etag"))

        return { content, etag }
      }).pipe(Effect.withSpan("fetchFile", { attributes: { filePath } }))

    const ensure = (primerName: string) =>
      Effect.gen(function* () {
        const manifestData = yield* manifest.get
        const primerConfig = manifestData.primers[primerName]

        if (!primerConfig) {
          return yield* new FetchError({
            url: `primers/${primerName}`,
          })
        }

        const primerDir = path.join(basePath, primerName)
        yield* fs.makeDirectory(primerDir, { recursive: true })

        const meta = yield* readMeta(metaPath).pipe(
          Effect.provideService(FileSystem.FileSystem, fs),
        )
        const existingEtags = meta.primers?.[primerName]?.etags ?? {}

        // Find missing files
        const missingFiles: string[] = []
        for (const file of primerConfig.files) {
          const filePath = path.join(primerDir, file)
          const fileExists = yield* fs.exists(filePath)
          if (!fileExists) missingFiles.push(file)
        }

        if (missingFiles.length === 0) return

        // Fetch all missing files in parallel
        const results = yield* Effect.all(
          missingFiles.map((file) =>
            fetchFile(`${primerName}/${file}`).pipe(Effect.map((result) => ({ file, result }))),
          ),
          { concurrency: 20 },
        )

        // Write files and collect etags
        const newEtags: Record<string, { etag: string }> = { ...existingEtags }
        for (const { file, result } of results) {
          if ("notModified" in result) continue
          const filePath = path.join(primerDir, file)
          const fileDir = path.dirname(filePath)
          yield* fs.makeDirectory(fileDir, { recursive: true })
          yield* fs.writeFileString(filePath, result.content)
          if (result.etag) {
            newEtags[file] = { etag: result.etag }
          }
        }

        const timestamp = DateTime.formatIso(yield* DateTime.now)
        const updatedMeta: Meta = {
          ...meta,
          primers: {
            ...meta.primers,
            [primerName]: { fetchedAt: timestamp, etags: newEtags },
          },
        }
        yield* writeMeta(metaPath, updatedMeta).pipe(
          Effect.provideService(FileSystem.FileSystem, fs),
        )

        // Generate compact index from freshly fetched files
        const compact = yield* generateCompact(primerName, primerDir).pipe(
          Effect.provideService(FileSystem.FileSystem, fs),
          Effect.provideService(Path.Path, path),
        )
        if (compact !== null) {
          yield* fs.writeFileString(path.join(primerDir, "_compact.md"), compact)
        }
      }).pipe(Effect.withSpan("ensure", { attributes: { primerName } }))

    const resolve = (segments: ReadonlyArray<string>) =>
      Effect.gen(function* () {
        const targetPath = path.join(basePath, ...segments)

        const indexPath = path.join(targetPath, "index.md")
        const indexExists = yield* fs.exists(indexPath)
        if (indexExists) {
          return yield* fs.readFileString(indexPath)
        }

        const mdPath = targetPath.endsWith(".md") ? targetPath : `${targetPath}.md`
        const mdExists = yield* fs.exists(mdPath)
        if (mdExists) {
          return yield* fs.readFileString(mdPath)
        }

        return yield* new ContentNotFoundError({
          path: segments.join("/"),
        })
      }).pipe(Effect.withSpan("resolve", { attributes: { path: segments.join("/") } }))

    const resolvePath = (segments: ReadonlyArray<string>) =>
      Effect.gen(function* () {
        const targetPath = path.join(basePath, ...segments)

        const indexPath = path.join(targetPath, "index.md")
        const indexExists = yield* fs.exists(indexPath)
        if (indexExists) return indexPath

        const mdPath = targetPath.endsWith(".md") ? targetPath : `${targetPath}.md`
        const mdExists = yield* fs.exists(mdPath)
        if (mdExists) return mdPath

        return yield* new ContentNotFoundError({
          path: segments.join("/"),
        })
      }).pipe(Effect.withSpan("resolvePath", { attributes: { path: segments.join("/") } }))

    type EtagMap = Record<string, { etag: string }>

    const refreshPrimer = (
      primerName: string,
      files: ReadonlyArray<string>,
      existingEtags: EtagMap,
    ) =>
      Effect.gen(function* () {
        const primerDir = path.join(basePath, primerName)
        yield* fs.makeDirectory(primerDir, { recursive: true })

        // Fetch all files in parallel
        const results = yield* Effect.all(
          files.map((file) => {
            const cachedEtag = existingEtags[file]?.etag
            return fetchFile(`${primerName}/${file}`, cachedEtag).pipe(
              Effect.map((result) => ({ file, result })),
              Effect.catchAll(() => Effect.succeed(null)),
            )
          }),
          { concurrency: 20 },
        )

        // Write updated files and collect etags
        const newEtags: EtagMap = { ...existingEtags }
        let anyUpdated = false

        for (const entry of results) {
          if (!entry || "notModified" in entry.result) continue
          const { file, result } = entry
          anyUpdated = true
          const filePath = path.join(primerDir, file)
          yield* fs.writeFileString(filePath, result.content)
          if (result.etag) {
            newEtags[file] = { etag: result.etag }
          }
        }

        if (anyUpdated) {
          const currentMeta = yield* readMeta(metaPath).pipe(
            Effect.provideService(FileSystem.FileSystem, fs),
          )
          const timestamp = DateTime.formatIso(yield* DateTime.now)
          const updatedMeta: Meta = {
            ...currentMeta,
            primers: {
              ...currentMeta.primers,
              [primerName]: { fetchedAt: timestamp, etags: newEtags },
            },
          }
          yield* writeMeta(metaPath, updatedMeta).pipe(
            Effect.provideService(FileSystem.FileSystem, fs),
          )

          // Regenerate compact index from updated files
          const compact = yield* generateCompact(primerName, primerDir).pipe(
            Effect.provideService(FileSystem.FileSystem, fs),
            Effect.provideService(Path.Path, path),
          )
          if (compact !== null) {
            yield* fs.writeFileString(path.join(primerDir, "_compact.md"), compact)
          }
        }

        return anyUpdated
      })

    const refreshInBackground = (primerName: string) =>
      Effect.gen(function* () {
        const manifestData = yield* manifest.get
        const primerConfig = manifestData.primers[primerName]
        if (!primerConfig) return

        const meta = yield* readMeta(metaPath).pipe(
          Effect.provideService(FileSystem.FileSystem, fs),
        )
        const existingEtags = meta.primers?.[primerName]?.etags ?? {}

        yield* refreshPrimer(primerName, primerConfig.files, existingEtags)
      }).pipe(
        Effect.catchAll(() => Effect.void),
        Effect.asVoid,
        Effect.withSpan("refreshInBackground", { attributes: { primerName } }),
      )

    const refreshAll = () =>
      Effect.gen(function* () {
        const manifestData = yield* manifest.get
        const meta = yield* readMeta(metaPath).pipe(
          Effect.provideService(FileSystem.FileSystem, fs),
        )
        const installedPrimers = Object.keys(meta.primers ?? {})

        if (installedPrimers.length === 0) return []

        const refreshed: Array<string> = []

        for (const primerName of installedPrimers) {
          const primerConfig = manifestData.primers[primerName]
          if (!primerConfig) continue

          const existingEtags = meta.primers?.[primerName]?.etags ?? {}
          const updated = yield* refreshPrimer(primerName, primerConfig.files, existingEtags)
          if (updated) refreshed.push(primerName)
        }

        return refreshed
      }).pipe(Effect.withSpan("refreshAll"))

    const suggestSimilar = (segments: ReadonlyArray<string>) =>
      Effect.gen(function* () {
        const manifestData = yield* manifest.get
        const query = segments.join("/").toLowerCase()
        const primerName = segments[0]
        const maxSuggestions = 3

        const suggestions: string[] = []

        // Check if primer exists - suggest sub-paths
        if (primerName && manifestData.primers[primerName]) {
          const primerConfig = manifestData.primers[primerName]
          for (const file of primerConfig.files) {
            if (suggestions.length >= maxSuggestions) break
            const filePath = file.replace(/\.md$/, "").replace(/\/index$/, "")
            if (filePath && filePath !== "index") {
              const fullPath = `${primerName} ${filePath.replace(/\//g, " ")}`
              if (
                fullPath.toLowerCase().includes(query) ||
                levenshtein(query, fullPath.toLowerCase()) < 4
              ) {
                suggestions.push(fullPath)
              }
            }
          }
        }

        // Suggest similar primer names
        for (const name of Object.keys(manifestData.primers)) {
          if (suggestions.length >= maxSuggestions) break
          if (levenshtein(query, name.toLowerCase()) < 3) {
            suggestions.push(name)
          }
        }

        return suggestions
      }).pipe(Effect.withSpan("suggestSimilar"))

    return {
      resolve,
      resolvePath,
      ensure,
      refreshInBackground,
      refreshAll,
      suggestSimilar,
    } as const
  }),
)

// Simple Levenshtein distance for fuzzy matching
const levenshtein = (a: string, b: string): number => {
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  const matrix: number[][] = []

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0]![j] = j
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i]![j] = matrix[i - 1]![j - 1]!
      } else {
        matrix[i]![j] = Math.min(
          matrix[i - 1]![j - 1]! + 1,
          matrix[i]![j - 1]! + 1,
          matrix[i - 1]![j]! + 1,
        )
      }
    }
  }

  return matrix[b.length]![a.length]!
}

// Test layer
export const PrimerCacheTest = (content: Record<string, string>) =>
  Layer.succeed(PrimerCache, {
    resolve: (segments: ReadonlyArray<string>) => {
      const key = segments.join("/")
      const indexKey = `${key}/index`
      const value = content[key] ?? content[indexKey]
      return value ? Effect.succeed(value) : Effect.fail(new ContentNotFoundError({ path: key }))
    },
    resolvePath: (segments: ReadonlyArray<string>) => {
      const key = segments.join("/")
      const indexKey = `${key}/index`
      const value = content[key] ?? content[indexKey]
      return value
        ? Effect.succeed(`/mock/.primer/${key}.md`)
        : Effect.fail(new ContentNotFoundError({ path: key }))
    },
    ensure: () => Effect.void,
    refreshInBackground: () => Effect.void,
    refreshAll: () => Effect.succeed([]),
    suggestSimilar: () => Effect.succeed([]),
  })
