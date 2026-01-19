import { describe, expect, it } from "@effect/vitest"
import { Array as Arr, Console, Context, Effect, Layer, Ref } from "effect"
import { Terminal } from "@effect/platform"
import { NodeContext } from "@effect/platform-node"
import { runCli } from "../../src/cli.js"
import { PrimerCacheTest } from "../../src/services/PrimerCache.js"
import { ManifestServiceTest, type Manifest } from "../../src/services/ManifestService.js"

// Test output recorder
class OutputRecorder extends Context.Tag("@test/OutputRecorder")<
  OutputRecorder,
  {
    readonly stdout: Ref.Ref<ReadonlyArray<string>>
    readonly stderr: Ref.Ref<ReadonlyArray<string>>
  }
>() {}

const OutputRecorderLayer = Layer.effect(
  OutputRecorder,
  Effect.gen(function* () {
    const stdout = yield* Ref.make<ReadonlyArray<string>>([])
    const stderr = yield* Ref.make<ReadonlyArray<string>>([])
    return { stdout, stderr }
  }),
)

const makeMockConsole = (recorder: OutputRecorder["Type"]): Console.Console => ({
  [Console.TypeId]: Console.TypeId,
  assert: () => Effect.void,
  clear: Effect.void,
  count: () => Effect.void,
  countReset: () => Effect.void,
  debug: (...args: ReadonlyArray<unknown>) =>
    Ref.update(recorder.stdout, (lines) => [...lines, args.map(String).join(" ") + "\n"]),
  dir: () => Effect.void,
  dirxml: () => Effect.void,
  error: (...args: ReadonlyArray<unknown>) =>
    Ref.update(recorder.stderr, (lines) => [...lines, args.map(String).join(" ") + "\n"]),
  group: () => Effect.void,
  groupEnd: Effect.void,
  info: (...args: ReadonlyArray<unknown>) =>
    Ref.update(recorder.stdout, (lines) => [...lines, args.map(String).join(" ") + "\n"]),
  log: (...args: ReadonlyArray<unknown>) =>
    Ref.update(recorder.stdout, (lines) => [...lines, args.map(String).join(" ") + "\n"]),
  table: () => Effect.void,
  time: () => Effect.void,
  timeEnd: () => Effect.void,
  timeLog: () => Effect.void,
  trace: () => Effect.void,
  warn: (...args: ReadonlyArray<unknown>) =>
    Ref.update(recorder.stderr, (lines) => [...lines, args.map(String).join(" ") + "\n"]),
  unsafe: console,
})

const MockConsoleLayer = Layer.unwrapEffect(
  Effect.gen(function* () {
    const recorder = yield* OutputRecorder
    return Console.setConsole(makeMockConsole(recorder))
  }),
)

const MockTerminalLayer = Layer.effect(
  Terminal.Terminal,
  Effect.gen(function* () {
    const recorder = yield* OutputRecorder
    return {
      columns: Effect.succeed(80),
      readInput: Effect.die("readInput not implemented in test"),
      readLine: Effect.succeed(""),
      display: (text: string) => Ref.update(recorder.stdout, (lines) => [...lines, text]),
    } satisfies Terminal.Terminal
  }),
)

const testManifest: Manifest = {
  version: 1,
  primers: {
    effect: {
      description: "Effect TypeScript patterns",
      files: ["index.md", "services.md"],
    },
    oxlint: {
      description: "High-performance linter",
      files: ["index.md", "setup.md"],
    },
  },
}

const createTestLayer = (content: Record<string, string>, manifest: Manifest = testManifest) => {
  const recorderLayer = OutputRecorderLayer

  const mocksLayer = Layer.mergeAll(MockConsoleLayer, MockTerminalLayer).pipe(
    Layer.provide(recorderLayer),
  )

  return Layer.mergeAll(
    recorderLayer,
    mocksLayer,
    PrimerCacheTest(content),
    ManifestServiceTest(manifest),
  ).pipe(Layer.provideMerge(NodeContext.layer))
}

const testCli = (
  args: ReadonlyArray<string>,
  content: Record<string, string>,
  manifest: Manifest = testManifest,
) =>
  Effect.gen(function* () {
    const recorder = yield* OutputRecorder

    yield* runCli(["node", "primer", ...args]).pipe(Effect.ignore)

    const stdout = yield* Ref.get(recorder.stdout)
    const stderr = yield* Ref.get(recorder.stderr)

    return {
      stdout: Arr.join(stdout, ""),
      stderr: Arr.join(stderr, ""),
    }
  }).pipe(Effect.provide(createTestLayer(content, manifest)))

describe("primer CLI workflow", () => {
  describe("primer (no args)", () => {
    it.live("shows available primers from manifest", () =>
      Effect.gen(function* () {
        const { stdout } = yield* testCli([], {
          effect: "# effect guide",
          "effect/services": "# services guide",
        })

        expect(stdout).toContain("Available primers:")
        expect(stdout).toContain("primer effect")
        expect(stdout).toContain("Effect TypeScript patterns")
        expect(stdout).toContain("primer oxlint")
      }),
    )
  })

  describe("primer <path>", () => {
    it.live("renders primer content for valid path", () =>
      Effect.gen(function* () {
        const { stdout } = yield* testCli(["effect"], {
          effect: "# Effect Guide\n\nLearn Effect patterns.",
        })

        expect(stdout).toContain("# Effect Guide")
        expect(stdout).toContain("Learn Effect patterns.")
      }),
    )

    it.live("renders nested primer content", () =>
      Effect.gen(function* () {
        const { stdout } = yield* testCli(["effect", "services"], {
          "effect/services": "# Services & Layers\n\nDependency injection.",
        })

        expect(stdout).toContain("# Services & Layers")
        expect(stdout).toContain("Dependency injection.")
      }),
    )

    it.live("shows error for non-existent primer", () =>
      Effect.gen(function* () {
        const { stderr } = yield* testCli(["nonexistent"], {
          effect: "# effect",
        })

        expect(stderr).toContain("Primer not found: nonexistent")
      }),
    )
  })

  describe("primer --help", () => {
    it.live("shows help text", () =>
      Effect.gen(function* () {
        const { stdout } = yield* testCli(["--help"], {})

        expect(stdout).toContain("primer")
      }),
    )
  })
})
