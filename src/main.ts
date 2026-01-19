import { BunContext, BunRuntime } from "@effect/platform-bun"
import { Effect, Layer } from "effect"
import { FetchHttpClient } from "@effect/platform"
import { runCli } from "./cli.js"
import { ManifestServiceLive } from "./services/ManifestService.js"
import { PrimerCacheLive } from "./services/PrimerCache.js"

// PrimerCache depends on ManifestService, so provide ManifestService first
const AppLayer = PrimerCacheLive.pipe(
  Layer.provideMerge(ManifestServiceLive),
  Layer.provideMerge(BunContext.layer),
  Layer.provide(FetchHttpClient.layer),
)

runCli(process.argv).pipe(Effect.provide(AppLayer), BunRuntime.runMain)
