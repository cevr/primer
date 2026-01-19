# Testing

`@effect/vitest` provides testing support for Effect: execution, scoped resources, layers, detailed failure reporting.

## Install

```bash
bun add -D vitest @effect/vitest
```

## Setup

```json
// package.json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
  },
})
```

## Basic Testing

```typescript
import { Effect } from "effect"
import { describe, expect, it } from "@effect/vitest"

describe("Calculator", () => {
  // Sync test
  it("creates instances", () => {
    expect(1 + 1).toBe(2)
  })

  // Effect test
  it.effect("adds numbers", () =>
    Effect.gen(function* () {
      const result = yield* Effect.succeed(1 + 1)
      expect(result).toBe(2)
    }),
  )
})
```

## Test Function Variants

### it.effect()

Most common - for Effect-returning tests:

```typescript
it.effect("processes data", () =>
  Effect.gen(function* () {
    const result = yield* processData("input")
    expect(result).toBe("expected")
  }),
)
```

### it.scoped()

For scoped resources. Scope closes automatically:

```typescript
import { FileSystem } from "@effect/platform"
import { NodeFileSystem } from "@effect/platform-node"

it.scoped("temp directory cleaned up", () =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const tempDir = yield* fs.makeTempDirectoryScoped()

    yield* fs.writeFileString(`${tempDir}/test.txt`, "hello")
    const exists = yield* fs.exists(`${tempDir}/test.txt`)
    expect(exists).toBe(true)
    // tempDir deleted when test ends
  }).pipe(Effect.provide(NodeFileSystem.layer)),
)
```

### it.live()

Uses real time (no TestClock):

```typescript
import { Clock, Effect } from "effect"

// it.effect provides TestContext - clock starts at 0
it.effect("test clock starts at zero", () =>
  Effect.gen(function* () {
    const now = yield* Clock.currentTimeMillis
    expect(now).toBe(0)
  }),
)

// it.live uses real system clock
it.live("real clock", () =>
  Effect.gen(function* () {
    const now = yield* Clock.currentTimeMillis
    expect(now).toBeGreaterThan(0)
  }),
)
```

### TestClock

`it.effect` provides TestContext with TestClock:

```typescript
import { Effect, Fiber, TestClock } from "effect"

it.effect("time-based test", () =>
  Effect.gen(function* () {
    const fiber = yield* Effect.delay(Effect.succeed("done"), "10 seconds").pipe(Effect.fork)
    yield* TestClock.adjust("10 seconds")
    const result = yield* Fiber.join(fiber)
    expect(result).toBe("done")
  }),
)
```

## Providing Layers

```typescript
import { Context, Effect, Layer } from "effect"

class Database extends Context.Tag("Database")<
  Database,
  { query: (sql: string) => Effect.Effect<string[]> }
>() {}

const testDatabase = Layer.succeed(Database, {
  query: (_sql) => Effect.succeed(["mock", "data"]),
})

it.effect("queries database", () =>
  Effect.gen(function* () {
    const db = yield* Database
    const results = yield* db.query("SELECT * FROM users")
    expect(results.length).toBe(2)
  }).pipe(Effect.provide(testDatabase)),
)
```

## Test Modifiers

```typescript
it.effect.skip("temporarily disabled", () => ...)  // Skip test
it.effect.only("focus on this", () => ...)         // Run only this
it.effect.fails("known bug", () => ...)            // Expected to fail
```

## Logging

By default, `it.effect` suppresses logs. To enable:

```typescript
// Option 1: Provide logger
it.effect("with logging", () =>
  Effect.gen(function* () {
    yield* Effect.log("This will be shown")
  }).pipe(Effect.provide(Logger.pretty)),
)

// Option 2: Use it.live
it.live("live with logging", () =>
  Effect.gen(function* () {
    yield* Effect.log("This will be shown")
  }),
)
```

## Service Test Pattern

Build test layers into services:

```typescript
class Users extends Context.Tag("@app/Users")<
  Users,
  {
    readonly create: (user: User) => Effect.Effect<void>
    readonly findById: (id: UserId) => Effect.Effect<User, UserNotFound>
  }
>() {
  static readonly testLayer = Layer.sync(Users, () => {
    const store = new Map<UserId, User>()

    return Users.of({
      create: (user) => Effect.sync(() => void store.set(user.id, user)),
      findById: (id) =>
        Effect.fromNullable(store.get(id)).pipe(
          Effect.orElseFail(() => UserNotFound.make({ id }))
        ),
    })
  })
}

// Compose test layers
const testLayer = Events.layer.pipe(
  Layer.provideMerge(Users.testLayer),
  Layer.provideMerge(Tickets.testLayer),
  Layer.provideMerge(Emails.testLayer)
)

describe("Events.register", () => {
  it.effect("creates registration", () =>
    Effect.gen(function* () {
      const users = yield* Users
      const events = yield* Events

      // Arrange
      yield* users.create(User.make({ id: UserId.make("user-123"), ... }))

      // Act
      const registration = yield* events.register(eventId, userId)

      // Assert
      expect(registration.eventId).toBe(eventId)
    }).pipe(Effect.provide(testLayer))
  )
})
```

## Running Tests

```bash
bun run test              # Run all tests
bun run test:watch        # Watch mode
bunx vitest run tests/user.test.ts  # Specific file
bunx vitest run -t "UserService"    # Pattern match
```
