import { Context, DateTime, Effect, Layer, Config } from "effect"
import { FileSystem, Path, HttpClient, HttpClientRequest } from "@effect/platform"
import type { PlatformError } from "@effect/platform/Error"
import { ContentNotFoundError, FetchError, ManifestError } from "../lib/errors.js"
import { ManifestService } from "./ManifestService.js"
import { readMeta, writeMeta } from "../lib/meta.js"
import type { Meta } from "../lib/meta.js"

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

    const fetchFile = (filePath: string) =>
      Effect.gen(function* () {
        const url = `${RAW_BASE}/primers/${filePath}`
        const response = yield* http.execute(HttpClientRequest.get(url)).pipe(
          Effect.mapError((e) => new FetchError({ url, cause: e })),
          Effect.scoped,
        )

        if (response.status !== 200) {
          return yield* new FetchError({ url })
        }

        return yield* response.text.pipe(Effect.mapError((e) => new FetchError({ url, cause: e })))
      }).pipe(Effect.withSpan("fetchFile", { attributes: { filePath } }))

    const ensure = (primerName: string) =>
      Effect.gen(function* () {
        const primerDir = path.join(basePath, primerName)
        const primerExists = yield* fs.exists(primerDir)

        if (primerExists) return

        const manifestData = yield* manifest.get
        const primerConfig = manifestData.primers[primerName]

        if (!primerConfig) {
          return yield* new FetchError({
            url: `primers/${primerName}`,
          })
        }

        yield* fs.makeDirectory(primerDir, { recursive: true })

        for (const file of primerConfig.files) {
          const content = yield* fetchFile(`${primerName}/${file}`)
          const filePath = path.join(primerDir, file)
          yield* fs.writeFileString(filePath, content)
        }

        const meta = yield* readMeta(metaPath).pipe(
          Effect.provideService(FileSystem.FileSystem, fs),
        )
        const timestamp = DateTime.formatIso(yield* DateTime.now)
        const updatedMeta: Meta = {
          ...meta,
          primers: { ...meta.primers, [primerName]: { fetchedAt: timestamp } },
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

    const refreshInBackground = (primerName: string) =>
      Effect.gen(function* () {
        const manifestData = yield* manifest.get
        const primerConfig = manifestData.primers[primerName]

        if (!primerConfig) return

        const primerDir = path.join(basePath, primerName)
        yield* fs.makeDirectory(primerDir, { recursive: true })

        for (const file of primerConfig.files) {
          const content = yield* fetchFile(`${primerName}/${file}`).pipe(
            Effect.catchAll(() => Effect.succeed(null)),
          )
          if (content) {
            const filePath = path.join(primerDir, file)
            yield* fs.writeFileString(filePath, content)
          }
        }

        const meta = yield* readMeta(metaPath).pipe(
          Effect.provideService(FileSystem.FileSystem, fs),
        )
        const timestamp = DateTime.formatIso(yield* DateTime.now)
        const updatedMeta: Meta = {
          ...meta,
          primers: { ...meta.primers, [primerName]: { fetchedAt: timestamp } },
        }
        yield* writeMeta(metaPath, updatedMeta).pipe(
          Effect.provideService(FileSystem.FileSystem, fs),
        )
      }).pipe(
        Effect.catchAll(() => Effect.void),
        Effect.asVoid,
        Effect.withSpan("refreshInBackground", { attributes: { primerName } }),
      )

    return { resolve, ensure, refreshInBackground } as const
  }),
)

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
  })
