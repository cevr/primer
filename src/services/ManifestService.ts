import { Context, DateTime, Effect, Layer, Schema, Config, Option } from "effect"
import { FileSystem, Path, HttpClient, HttpClientRequest, Headers } from "@effect/platform"
import type { PlatformError } from "@effect/platform/Error"
import { FetchError, ManifestError } from "../lib/errors.js"
import { readMeta, writeMeta } from "../lib/meta.js"
import type { Meta } from "../lib/meta.js"

const REPO = "cevr/primer"
const BRANCH = "main"
const RAW_BASE = `https://raw.githubusercontent.com/${REPO}/${BRANCH}`

const PrimerConfigSchema = Schema.Struct({
  description: Schema.String,
  files: Schema.Array(Schema.String),
})

const ManifestSchema = Schema.Struct({
  version: Schema.Number,
  primers: Schema.Record({ key: Schema.String, value: PrimerConfigSchema }),
})

const ManifestFromJson = Schema.parseJson(ManifestSchema)

export type Manifest = typeof ManifestSchema.Type
export type PrimerConfig = typeof PrimerConfigSchema.Type

const HomeConfig = Config.string("HOME").pipe(Config.withDefault("~"))
const PrimerDirConfig = Config.all([
  Config.string("PRIMER_DIR").pipe(Config.option),
  HomeConfig,
]).pipe(
  Config.map(([primerDir, home]) =>
    primerDir._tag === "Some" ? primerDir.value : `${home}/.primer`,
  ),
)

export class ManifestService extends Context.Tag("@primer/ManifestService")<
  ManifestService,
  {
    readonly get: Effect.Effect<Manifest, ManifestError | FetchError | PlatformError>
    readonly refresh: Effect.Effect<void, ManifestError | FetchError | PlatformError>
  }
>() {}

export const ManifestServiceLive = Layer.effect(
  ManifestService,
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const http = yield* HttpClient.HttpClient
    const basePath = yield* PrimerDirConfig

    const manifestPath = path.join(basePath, "_manifest.json")
    const metaPath = path.join(basePath, "_meta.json")

    const fetchManifest = Effect.gen(function* () {
      const url = `${RAW_BASE}/primers/_manifest.json`

      // Check for cached ETag
      const meta = yield* readMeta(metaPath).pipe(Effect.provideService(FileSystem.FileSystem, fs))
      const cachedEtag = meta.manifestEtag

      const request = cachedEtag
        ? HttpClientRequest.get(url).pipe(HttpClientRequest.setHeader("If-None-Match", cachedEtag))
        : HttpClientRequest.get(url)

      const response = yield* http.execute(request).pipe(
        Effect.mapError((e) => new FetchError({ url, cause: e })),
        Effect.scoped,
      )

      // Not modified - return cached
      if (response.status === 304) {
        const cached = yield* readCached
        if (cached) return cached
        // Fallback to fetch without etag if cache is missing
        return yield* fetchManifestWithoutEtag
      }

      if (response.status !== 200) {
        return yield* new FetchError({ url })
      }

      const text = yield* response.text.pipe(
        Effect.mapError((e) => new FetchError({ url, cause: e })),
      )

      const parsed = yield* Schema.decode(ManifestFromJson)(text).pipe(
        Effect.mapError((e) => new ManifestError({ cause: e })),
      )

      yield* fs.makeDirectory(basePath, { recursive: true })
      yield* fs.writeFileString(manifestPath, text)

      const etag = Option.getOrUndefined(Headers.get(response.headers, "etag"))
      const timestamp = DateTime.formatIso(yield* DateTime.now)
      const updatedMeta: Meta = { ...meta, manifestFetchedAt: timestamp, manifestEtag: etag }
      yield* writeMeta(metaPath, updatedMeta).pipe(Effect.provideService(FileSystem.FileSystem, fs))

      return parsed
    })

    const fetchManifestWithoutEtag = Effect.gen(function* () {
      const url = `${RAW_BASE}/primers/_manifest.json`
      const response = yield* http.execute(HttpClientRequest.get(url)).pipe(
        Effect.mapError((e) => new FetchError({ url, cause: e })),
        Effect.scoped,
      )

      if (response.status !== 200) {
        return yield* new FetchError({ url })
      }

      const text = yield* response.text.pipe(
        Effect.mapError((e) => new FetchError({ url, cause: e })),
      )

      const parsed = yield* Schema.decode(ManifestFromJson)(text).pipe(
        Effect.mapError((e) => new ManifestError({ cause: e })),
      )

      yield* fs.makeDirectory(basePath, { recursive: true })
      yield* fs.writeFileString(manifestPath, text)

      const etag = Option.getOrUndefined(Headers.get(response.headers, "etag"))
      const meta = yield* readMeta(metaPath).pipe(Effect.provideService(FileSystem.FileSystem, fs))
      const timestamp = DateTime.formatIso(yield* DateTime.now)
      const updatedMeta: Meta = { ...meta, manifestFetchedAt: timestamp, manifestEtag: etag }
      yield* writeMeta(metaPath, updatedMeta).pipe(Effect.provideService(FileSystem.FileSystem, fs))

      return parsed
    })

    const readCached = Effect.gen(function* () {
      const exists = yield* fs.exists(manifestPath)
      if (!exists) return null

      const text = yield* fs.readFileString(manifestPath)

      return yield* Schema.decode(ManifestFromJson)(text).pipe(
        Effect.mapError((e) => new ManifestError({ cause: e })),
      )
    })

    const get = Effect.gen(function* () {
      const cached = yield* readCached
      if (cached) return cached
      return yield* fetchManifest
    })

    const refresh = fetchManifest.pipe(Effect.asVoid)

    return { get, refresh } as const
  }),
)

// Test layer
export const ManifestServiceTest = (manifest: Manifest) =>
  Layer.succeed(ManifestService, {
    get: Effect.succeed(manifest),
    refresh: Effect.void,
  })
