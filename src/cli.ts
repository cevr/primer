import { Args, Command, HelpDoc, Options, Span } from "@effect/cli"
import { Console, Effect, Fiber, Stream, Ref, Config } from "effect"
import { Terminal, FileSystem, Path } from "@effect/platform"
import type { PlatformError } from "@effect/platform/Error"
import type { ContentNotFoundError } from "./lib/errors.js"
import { PrimerCache } from "./services/PrimerCache.js"
import { ManifestService } from "./services/ManifestService.js"

const SKILL_CONTENT = `---
name: primer
description: Curated markdown primers for AI agents. Use proactively when working on relevant topics.
---

# Primer

Curated markdown primers for AI agents. Use proactively when working on relevant topics.

## When to Use

- **Before implementing**: Check if a primer exists for the technology/pattern
- **Stuck on patterns**: Primers contain battle-tested approaches
- **Need context**: Primers explain the "why" not just the "how"

## Commands

\`\`\`bash
primer                    # List all available primers
primer <name>             # Render primer (e.g., primer effect)
primer <name> <sub>       # Render sub-primer (e.g., primer effect services)
primer update             # Refresh all cached primers
primer help               # Show help with examples
\`\`\`

Run \`primer\` for current list with descriptions.

## Usage Pattern

1. Check for relevant primer before starting work
2. Read the main primer for overview
3. Dive into sub-primers for specific topics
4. Apply patterns to your implementation
`

const pathArgs = Args.text({ name: "path" }).pipe(Args.repeated)

const fetchFlag = Options.boolean("fetch").pipe(
  Options.withAlias("f"),
  Options.withDescription("Force fetch latest content (default in non-TTY)"),
  Options.withDefault(false),
)

const isTTY = (): boolean => process.stdout.isTTY === true

const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]

const shouldShowSpinner = (): boolean =>
  process.stdout.isTTY === true && !process.env.NO_COLOR && process.env.TERM !== "dumb"

const withSpinner = <A, E, R>(
  message: string,
  effect: Effect.Effect<A, E, R>,
): Effect.Effect<A, E | PlatformError, R | Terminal.Terminal> =>
  Effect.gen(function* () {
    // Skip spinner for non-TTY or NO_COLOR
    if (!shouldShowSpinner()) {
      return yield* effect
    }

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

const helpDescription = HelpDoc.blocks([
  HelpDoc.p("Render curated markdown primers for AI agents."),
  HelpDoc.empty,
  HelpDoc.p(Span.strong("EXAMPLES")),
  HelpDoc.empty,
  HelpDoc.p(Span.code("primer")),
  HelpDoc.p("  List available primers"),
  HelpDoc.empty,
  HelpDoc.p(Span.code("primer effect")),
  HelpDoc.p("  Show Effect primer"),
  HelpDoc.empty,
  HelpDoc.p(Span.code("primer effect services")),
  HelpDoc.p("  Show sub-primer"),
  HelpDoc.empty,
  HelpDoc.p(Span.code("primer init")),
  HelpDoc.p("  Install primer skill to AI tool directories"),
  HelpDoc.empty,
  HelpDoc.p(Span.code("primer update")),
  HelpDoc.p("  Refresh all cached primers"),
])

export const primerCommand = Command.make(
  "primer",
  { path: pathArgs, fetch: fetchFlag },
  ({ path, fetch }) =>
    Effect.gen(function* () {
      const cache = yield* PrimerCache
      const manifestService = yield* ManifestService
      const tty = isTTY()

      if (path.length === 0) {
        const manifest = yield* withSpinner("Loading primers...", manifestService.get).pipe(
          Effect.catchTag("ManifestError", (e) =>
            Console.error("Failed to load primer manifest.").pipe(
              Effect.andThen(Console.error("Check your network connection and try again.")),
              Effect.andThen(Effect.fail(e)),
            ),
          ),
        )

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

      // Handle "help" as a special case
      if (path[0] === "help") {
        yield* Console.log(HelpDoc.toAnsiText(helpDescription))
        return
      }

      const primer = path[0]
      if (!primer) return

      const withResolveErrors = <A>(
        resolveEffect: Effect.Effect<A, ContentNotFoundError | PlatformError>,
      ) =>
        resolveEffect.pipe(
          Effect.catchTag("ContentNotFoundError", () =>
            withSpinner(`Fetching ${primer}...`, cache.ensure(primer)).pipe(
              Effect.andThen(resolveEffect),
            ),
          ),
          Effect.catchTag("ContentNotFoundError", (e) =>
            Effect.gen(function* () {
              yield* Console.error(e.message)
              yield* Console.error("")

              const suggestions = yield* cache
                .suggestSimilar(path)
                .pipe(Effect.catchAll(() => Effect.succeed([])))

              if (suggestions.length > 0) {
                yield* Console.error("Did you mean:")
                for (const suggestion of suggestions) {
                  yield* Console.error(`  primer ${suggestion}`)
                }
                yield* Console.error("")
              }

              yield* Console.error("Run `primer` to see available primers.")
            }).pipe(Effect.andThen(Effect.fail(e))),
          ),
          Effect.catchTag("ManifestError", (e) =>
            Console.error(`Failed to fetch primer: ${primer}`).pipe(
              Effect.andThen(Console.error("")),
              Effect.andThen(Console.error("Check your network connection and try again.")),
              Effect.andThen(Effect.fail(e)),
            ),
          ),
          Effect.catchTag("FetchError", (e) =>
            Effect.gen(function* () {
              yield* Console.error(`Primer not found: ${primer}`)
              yield* Console.error("")

              const suggestions = yield* cache
                .suggestSimilar(path)
                .pipe(Effect.catchAll(() => Effect.succeed([])))

              if (suggestions.length > 0) {
                yield* Console.error("Did you mean:")
                for (const suggestion of suggestions) {
                  yield* Console.error(`  primer ${suggestion}`)
                }
                yield* Console.error("")
              }

              yield* Console.error("Run `primer` to see available primers.")
            }).pipe(Effect.andThen(Effect.fail(e))),
          ),
          Effect.catchAll(() => Effect.succeed(null)),
        )

      if (tty) {
        // TTY: full content + background refresh
        const content = yield* withResolveErrors(cache.resolve(path))
        if (content === null) return

        yield* cache.refreshInBackground(primer).pipe(Effect.forkDaemon)
        yield* Console.log(content)
      } else {
        // non-TTY (agent): compact index for top-level, file path for subtopics
        if (path.length === 1) {
          // Top-level: output compact index, fall back to regular index
          const content = yield* withResolveErrors(
            cache
              .resolve([primer, "_compact"])
              .pipe(Effect.catchTag("ContentNotFoundError", () => cache.resolve(path))),
          )
          if (content === null) return

          yield* Console.log(content)
        } else {
          // Subtopic: output file path only
          const filePath = yield* withResolveErrors(cache.resolvePath(path))
          if (filePath === null) return

          yield* Console.log(filePath)
        }

        if (fetch) {
          yield* withSpinner(`Refreshing ${primer}...`, cache.refreshInBackground(primer))
        }
      }
    }).pipe(Effect.withSpan("primerCommand")),
).pipe(Command.withDescription(helpDescription))

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

    // All potential skill locations (skills/<name>/SKILL.md format)
    const projectDirs = [
      { path: pathService.join(cwd, ".claude", "skills", "primer"), file: "SKILL.md" },
      { path: pathService.join(cwd, ".cursor", "skills", "primer"), file: "SKILL.md" },
    ]
    const userDirs = [
      { path: pathService.join(home, ".claude", "skills", "primer"), file: "SKILL.md" },
      { path: pathService.join(home, ".cursor", "skills", "primer"), file: "SKILL.md" },
      { path: pathService.join(home, ".config", "opencode", "skills", "primer"), file: "SKILL.md" },
    ]

    const candidates = local ? projectDirs : userDirs

    // Find parent skills dirs that exist
    const existingDirs: Array<{ path: string; file: string }> = []
    for (const candidate of candidates) {
      const parentDir = pathService.dirname(candidate.path)
      if (yield* fs.exists(parentDir)) {
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
  }).pipe(Effect.withSpan("initCommand")),
)

const updateCommand = Command.make("update", {}, () =>
  Effect.gen(function* () {
    const cache = yield* PrimerCache
    const manifestService = yield* ManifestService

    yield* withSpinner("Refreshing manifest...", manifestService.refresh)

    const refreshed = yield* withSpinner("Updating primers...", cache.refreshAll())

    if (refreshed.length === 0) {
      yield* Console.log("No primers to update.")
    } else {
      yield* Console.log(`Updated ${refreshed.length} primer(s):`)
      for (const name of refreshed.toSorted()) {
        yield* Console.log(`  ${name}`)
      }
    }
  }).pipe(Effect.withSpan("updateCommand")),
)

const primerWithSubcommands = primerCommand.pipe(
  Command.withSubcommands([initCommand, updateCommand]),
)

export const runCli = Command.run(primerWithSubcommands, {
  name: "primer",
  version: "0.1.0",
})
