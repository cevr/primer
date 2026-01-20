import { Args, Command } from "@effect/cli"
import { Console, Effect, Fiber, Stream, Ref } from "effect"
import { Terminal } from "@effect/platform"
import type { PlatformError } from "@effect/platform/Error"
import { PrimerCache } from "./services/PrimerCache.js"
import { ManifestService } from "./services/ManifestService.js"

const pathArgs = Args.text({ name: "path" }).pipe(Args.repeated)

const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]

const withSpinner = <A, E, R>(
  message: string,
  effect: Effect.Effect<A, E, R>,
): Effect.Effect<A, E | PlatformError, R | Terminal.Terminal> =>
  Effect.gen(function* () {
    const terminal = yield* Terminal.Terminal
    const idx = yield* Ref.make(0)

    const spinnerStream = Stream.tick("80 millis").pipe(
      Stream.runForEach(
        Effect.fn("spinnerTick")(function* () {
          const i = yield* Ref.getAndUpdate(idx, (n) => (n + 1) % frames.length)
          yield* terminal.display(`\r${frames[i]} ${message}`)
        }),
      ),
    )

    const spinnerFiber = yield* Effect.fork(spinnerStream)
    const result = yield* Effect.ensuring(effect, Fiber.interrupt(spinnerFiber))
    yield* terminal.display(`\r\x1b[K`)

    return result
  }).pipe(Effect.withSpan("withSpinner", { attributes: { message } }))

export const primerCommand = Command.make("primer", { path: pathArgs }, ({ path }) =>
  Effect.gen(function* () {
    const cache = yield* PrimerCache
    const manifestService = yield* ManifestService

    if (path.length === 0) {
      const manifest = yield* withSpinner("Loading primers...", manifestService.get).pipe(
        Effect.catchAll(
          Effect.fn("handleManifestError")(function* () {
            yield* Console.error("Failed to load primer manifest.")
            yield* Console.error("Check your network connection and try again.")
            return null
          }),
        ),
      )

      if (!manifest) return

      yield* manifestService.refresh.pipe(
        Effect.catchAll(() => Effect.void),
        Effect.forkDaemon,
      )

      const primerNames = Object.keys(manifest.primers).toSorted()

      if (primerNames.length === 0) {
        yield* Console.log("No primers available.")
        return
      }

      yield* Console.log("Available primers:\n")
      for (const name of primerNames) {
        const config = manifest.primers[name]
        if (!config) continue
        const desc = config.description ? ` - ${config.description}` : ""
        yield* Console.log(`  ${name}${desc}`)
      }
      return
    }

    const primer = path[0]
    if (!primer) return

    const content = yield* cache.resolve(path).pipe(
      Effect.catchTag(
        "ContentNotFoundError",
        Effect.fn("handleNotFound")(function* () {
          yield* withSpinner(`Fetching ${primer}...`, cache.ensure(primer)).pipe(
            Effect.catchAll(
              Effect.fn("handleFetchError")(function* () {
                yield* Console.error(`Failed to fetch primer: ${primer}`)
                yield* Console.error("")
                yield* Console.error("Run `primer` to see available primers.")
                return null
              }),
            ),
          )

          return yield* cache.resolve(path).pipe(
            Effect.catchTag(
              "ContentNotFoundError",
              Effect.fn("handleResolveError")(function* (e) {
                yield* Console.error(e.message)
                yield* Console.error("")
                yield* Console.error("Run `primer` to see available primers.")
                return null
              }),
            ),
          )
        }),
      ),
    )

    if (typeof content !== "string") return

    yield* cache.refreshInBackground(primer).pipe(Effect.forkDaemon)

    yield* Console.log(content)
  }).pipe(
    Effect.catchAll(() => Effect.void),
    Effect.withSpan("primerCommand"),
  ),
)

export const runCli = Command.run(primerCommand, {
  name: "primer",
  version: "0.1.0",
})
