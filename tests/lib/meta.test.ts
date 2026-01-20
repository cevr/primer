import { describe, expect, it } from "@effect/vitest"
import { Effect, Schema } from "effect"
import { MetaSchema } from "../../src/lib/meta.js"

describe("MetaSchema", () => {
  it.effect("parses meta with etags", () =>
    Effect.gen(function* () {
      const input = {
        manifestFetchedAt: "2026-01-20T12:00:00.000Z",
        manifestEtag: 'W/"abc123"',
        primers: {
          cli: {
            fetchedAt: "2026-01-20T12:00:00.000Z",
            etags: {
              "index.md": { etag: 'W/"def456"' },
              "setup.md": { etag: 'W/"ghi789"' },
            },
          },
        },
      }

      const result = yield* Schema.decode(MetaSchema)(input)

      expect(result.manifestEtag).toBe('W/"abc123"')
      expect(result.primers?.cli?.etags?.["index.md"]?.etag).toBe('W/"def456"')
    }),
  )

  it.effect("parses meta without etags (backwards compatible)", () =>
    Effect.gen(function* () {
      const input = {
        manifestFetchedAt: "2026-01-20T12:00:00.000Z",
        primers: {
          cli: {
            fetchedAt: "2026-01-20T12:00:00.000Z",
          },
        },
      }

      const result = yield* Schema.decode(MetaSchema)(input)

      expect(result.manifestEtag).toBeUndefined()
      expect(result.primers?.cli?.etags).toBeUndefined()
    }),
  )

  it.effect("parses empty meta", () =>
    Effect.gen(function* () {
      const input = {}

      const result = yield* Schema.decode(MetaSchema)(input)

      expect(result.manifestFetchedAt).toBeUndefined()
      expect(result.primers).toBeUndefined()
    }),
  )
})
