import { Effect, Schema } from "effect"
import { FileSystem } from "@effect/platform"
import type { PlatformError } from "@effect/platform/Error"

/**
 * Schema for file ETag tracking.
 */
const FileEtagEntry = Schema.Struct({
  etag: Schema.String,
})

/**
 * Schema for primer fetch metadata.
 */
const PrimerMetaEntry = Schema.Struct({
  fetchedAt: Schema.String,
  etags: Schema.optional(Schema.Record({ key: Schema.String, value: FileEtagEntry })),
})

/**
 * Schema for _meta.json file.
 */
export const MetaSchema = Schema.Struct({
  manifestFetchedAt: Schema.optional(Schema.String),
  manifestEtag: Schema.optional(Schema.String),
  primers: Schema.optional(Schema.Record({ key: Schema.String, value: PrimerMetaEntry })),
})

export type Meta = typeof MetaSchema.Type

const MetaFromJson = Schema.parseJson(MetaSchema)

/**
 * Read JSON metadata file. Returns empty meta if file doesn't exist or is invalid.
 */
export const readMeta = (
  metaPath: string,
): Effect.Effect<Meta, PlatformError, FileSystem.FileSystem> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const exists = yield* fs.exists(metaPath)
    if (!exists) return {}

    const text = yield* fs.readFileString(metaPath)

    return yield* Schema.decode(MetaFromJson)(text).pipe(Effect.orElseSucceed(() => ({}) as Meta))
  }).pipe(Effect.withSpan("readMeta", { attributes: { metaPath } }))

/**
 * Write meta to JSON file.
 */
export const writeMeta = (
  metaPath: string,
  meta: Meta,
): Effect.Effect<void, PlatformError, FileSystem.FileSystem> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const metaJson = yield* Schema.encode(MetaFromJson)(meta).pipe(Effect.orDie)
    yield* fs.writeFileString(metaPath, metaJson)
  }).pipe(Effect.withSpan("writeMeta", { attributes: { metaPath } }))
