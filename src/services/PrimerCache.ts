import { Context, DateTime, Effect, Layer, Config, Option } from "effect"
import { FileSystem, Path, HttpClient, HttpClientRequest, Headers } from "@effect/platform"
import type { PlatformError } from "@effect/platform/Error"
import { ContentNotFoundError, FetchError, ManifestError } from "../lib/errors.js"
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

        // Get existing etags to skip unchanged files
        const meta = yield* readMeta(metaPath).pipe(
          Effect.provideService(FileSystem.FileSystem, fs),
        )
        const existingEtags = meta.primers?.[primerName]?.etags ?? {}
        const newEtags: Record<string, { etag: string }> = { ...existingEtags }

        // Fetch any missing files
        for (const file of primerConfig.files) {
          const filePath = path.join(primerDir, file)

          // Check if file exists locally
          const fileExists = yield* fs.exists(filePath)
          if (fileExists) continue

          // Ensure parent directories exist for nested files
          const fileDir = path.dirname(filePath)
          yield* fs.makeDirectory(fileDir, { recursive: true })

          // Fetch the file
          const result = yield* fetchFile(`${primerName}/${file}`)
          if ("notModified" in result) continue

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

    type EtagMap = Record<string, { etag: string }>

    const refreshPrimer = (
      primerName: string,
      files: ReadonlyArray<string>,
      existingEtags: EtagMap,
    ) =>
      Effect.gen(function* () {
        const primerDir = path.join(basePath, primerName)
        yield* fs.makeDirectory(primerDir, { recursive: true })

        const newEtags: EtagMap = { ...existingEtags }
        let anyUpdated = false

        for (const file of files) {
          const cachedEtag = existingEtags[file]?.etag
          const result = yield* fetchFile(`${primerName}/${file}`, cachedEtag).pipe(
            Effect.catchAll(() => Effect.succeed(null)),
          )
          if (!result || "notModified" in result) continue

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

    return { resolve, ensure, refreshInBackground, refreshAll, suggestSimilar } as const
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
    ensure: () => Effect.void,
    refreshInBackground: () => Effect.void,
    refreshAll: () => Effect.succeed([]),
    suggestSimilar: () => Effect.succeed([]),
  })
