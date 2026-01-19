# Command-Line Interfaces

`@effect/cli` provides typed argument parsing, automatic help generation, Effect service integration.

## Installation

```bash
bun add @effect/cli @effect/platform @effect/platform-bun
# Or for Node.js: @effect/platform-node
```

## Minimal Example

```typescript
import { Args, Command, Options } from "@effect/cli"
import { BunContext, BunRuntime } from "@effect/platform-bun"
import { Console, Effect } from "effect"

const name = Args.text({ name: "name" }).pipe(Args.withDefault("World"))
const shout = Options.boolean("shout").pipe(Options.withAlias("s"))

const greet = Command.make("greet", { name, shout }, ({ name, shout }) => {
  const message = `Hello, ${name}!`
  return Console.log(shout ? message.toUpperCase() : message)
})

const cli = Command.run(greet, {
  name: "greet",
  version: "1.0.0",
})

cli(process.argv).pipe(Effect.provide(BunContext.layer), BunRuntime.runMain)
```

```bash
bun run greet.ts              # Hello, World!
bun run greet.ts Alice        # Hello, Alice!
bun run greet.ts --shout Bob  # HELLO, BOB!
bun run greet.ts --help       # Shows usage
```

## Arguments and Options

**Arguments** are positional. **Options** are named flags.
Options must come before arguments: `cmd --flag arg` works, `cmd arg --flag` doesn't.

### Argument Patterns

```typescript
import { Args } from "@effect/cli"

Args.text({ name: "file" }) // Required
Args.text({ name: "output" }).pipe(Args.optional) // Optional
Args.text({ name: "format" }).pipe(Args.withDefault("json")) // Default
Args.text({ name: "files" }).pipe(Args.repeated) // Zero or more
Args.text({ name: "files" }).pipe(Args.atLeast(1)) // At least one
```

### Option Patterns

```typescript
import { Options } from "@effect/cli"

Options.boolean("verbose").pipe(Options.withAlias("v")) // Boolean flag
Options.text("output").pipe(Options.withAlias("o")) // Text option
Options.text("config").pipe(Options.optional) // Optional text
Options.choice("format", ["json", "yaml", "toml"]) // Fixed choices
Options.integer("count").pipe(Options.withDefault(10)) // Integer with default
```

## Subcommands

```typescript
import { Args, Command } from "@effect/cli"
import { Console } from "effect"

const task = Args.text({ name: "task" })

const add = Command.make("add", { task }, ({ task }) => Console.log(`Adding: ${task}`))

const list = Command.make("list", {}, () => Console.log("Listing tasks..."))

const app = Command.make("tasks").pipe(Command.withSubcommands([add, list]))
```

```bash
tasks add "Buy milk"   # Adding: Buy milk
tasks list             # Listing tasks...
tasks --help           # Shows available subcommands
```

## Service Integration

Commands can use Effect services:

```typescript
const addCommand = Command.make("add", { text }, ({ text }) =>
  Effect.gen(function* () {
    const repo = yield* TaskRepo
    const task = yield* repo.add(text)
    yield* Console.log(`Added task #${task.id}: ${task.text}`)
  }),
).pipe(Command.withDescription("Add a new task"))
```

Wire services at entry point:

```typescript
const cli = Command.run(app, { name: "tasks", version: "1.0.0" })

const mainLayer = Layer.provideMerge(TaskRepo.layer, BunContext.layer)

cli(process.argv).pipe(Effect.provide(mainLayer), BunRuntime.runMain)
```

## Summary

| Concept         | API                                                                          |
| --------------- | ---------------------------------------------------------------------------- |
| Define command  | `Command.make(name, config, handler)`                                        |
| Positional args | `Args.text`, `Args.integer`, `Args.optional`, `Args.repeated`                |
| Named options   | `Options.boolean`, `Options.text`, `Options.choice`                          |
| Option alias    | `Options.withAlias("v")`                                                     |
| Descriptions    | `Args.withDescription`, `Options.withDescription`, `Command.withDescription` |
| Subcommands     | `Command.withSubcommands([...])`                                             |
| Run CLI         | `Command.run(cmd, { name, version })`                                        |
| Platform layer  | `BunContext.layer` or `NodeContext.layer`                                    |

## Version from package.json

```typescript
import { Command } from "@effect/cli"
import pkg from "./package.json" with { type: "json" }

const cli = Command.run(app, {
  name: "tasks",
  version: pkg.version,
})
```

Requires `"resolveJsonModule": true` in tsconfig.
