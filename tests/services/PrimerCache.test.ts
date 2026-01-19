import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import { PrimerCache, PrimerCacheTest } from "../../src/services/PrimerCache.js"

describe("PrimerCache", () => {
  it.effect("resolves index.md for directory path", () =>
    Effect.gen(function* () {
      const cache = yield* PrimerCache
      const content = yield* cache.resolve(["oxlint"])
      expect(content).toBe("# oxlint\n\nLinter instructions.")
    }).pipe(
      Effect.provide(
        PrimerCacheTest({
          "oxlint/index": "# oxlint\n\nLinter instructions.",
        }),
      ),
    ),
  )

  it.effect("resolves direct .md file", () =>
    Effect.gen(function* () {
      const cache = yield* PrimerCache
      const content = yield* cache.resolve(["oxlint", "setup"])
      expect(content).toBe("# Setup\n\nSetup instructions.")
    }).pipe(
      Effect.provide(
        PrimerCacheTest({
          "oxlint/setup": "# Setup\n\nSetup instructions.",
        }),
      ),
    ),
  )

  it.effect("returns ContentNotFoundError for missing path", () =>
    Effect.gen(function* () {
      const cache = yield* PrimerCache
      const result = yield* cache.resolve(["nonexistent"]).pipe(Effect.either)
      expect(result._tag).toBe("Left")
      if (result._tag === "Left") {
        expect(result.left._tag).toBe("ContentNotFoundError")
      }
    }).pipe(Effect.provide(PrimerCacheTest({}))),
  )
})
