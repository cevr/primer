import { Args, Command, Options } from "@effect/cli"
import { Console, Effect, Fiber, Stream, Ref, Config } from "effect"
import { Terminal, FileSystem, Path } from "@effect/platform"
import type { PlatformError } from "@effect/platform/Error"
import { PrimerCache } from "./services/PrimerCache.js"
import { ManifestService } from "./services/ManifestService.js"

const SKILL_CONTENT = `# Primer CLI Skill

CLI that renders curated markdown instructions for AI agents.

## Quick Reference

\`\`\`bash
# List available primers (shows top-level only)
primer

# Render a primer (auto-fetches if not cached)
primer effect                  # Main Effect guide
primer effect services         # Sub-primer: Services & Layers
primer oxlint                  # Main oxlint guide
primer oxlint setup            # Sub-primer: setup instructions
\`\`\`

## Available Primers

Run \`primer\` to see current list. Sub-primers accessed via \`primer <name> <sub>\`.
`

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

const localFlag = Options.boolean("local").pipe(
  Options.withAlias("l"),
  Options.withDescription("Install to project-level (.claude/skills or .cursor/skills)"),
  Options.withDefault(false),
)

const initCommand = Command.make("init", { local: localFlag }, ({ local }) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const pathService = yield* Path.Path
    const home = yield* Config.string("HOME").pipe(Config.withDefault("~"))
    const cwd = yield* Effect.sync(() => process.cwd())

    // All potential skill locations
    const projectDirs = [
      { path: pathService.join(cwd, ".claude", "skills"), file: "primer.md" },
      { path: pathService.join(cwd, ".cursor", "skills"), file: "primer.md" },
    ]
    const userDirs = [
      { path: pathService.join(home, ".claude", "skills"), file: "primer.md" },
      { path: pathService.join(home, ".cursor", "skills"), file: "primer.md" },
      { path: pathService.join(home, ".config", "opencode", "skills", "primer"), file: "SKILL.md" },
    ]

    const candidates = local ? projectDirs : userDirs

    // Find all existing skills dirs
    const existingDirs: Array<{ path: string; file: string }> = []
    for (const candidate of candidates) {
      if (yield* fs.exists(candidate.path)) {
        existingDirs.push(candidate)
      }
    }

    // If none exist, use first candidate (claude)
    const targets = existingDirs.length > 0 ? existingDirs : [candidates[0]!]

    let created = 0
    let skipped = 0

    for (const target of targets) {
      const skillPath = pathService.join(target.path, target.file)

      if (yield* fs.exists(skillPath)) {
        yield* Console.log(`Already exists: ${skillPath}`)
        skipped++
        continue
      }

      yield* fs.makeDirectory(target.path, { recursive: true })
      yield* fs.writeFileString(skillPath, SKILL_CONTENT)
      yield* Console.log(`Created: ${skillPath}`)
      created++
    }

    if (created === 0 && skipped > 0) {
      yield* Console.log(`\nAll ${skipped} skill file(s) already exist.`)
    } else if (created > 0) {
      yield* Console.log(`\nCreated ${created} skill file(s).`)
    }
  }).pipe(
    Effect.catchAll((e) => Console.error(`Failed to init: ${e}`)),
    Effect.withSpan("initCommand"),
  ),
)

const primerWithSubcommands = primerCommand.pipe(Command.withSubcommands([initCommand]))

export const runCli = Command.run(primerWithSubcommands, {
  name: "primer",
  version: "0.1.0",
})
