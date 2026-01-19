# Services & Layers

Effect's service pattern for dependency injection. Define services as `Context.Tag` classes, compose into Layers.

## What is a Service?

A service is defined using `Context.Tag` as a class declaring:

1. A unique identifier (e.g., `@app/Database`)
2. An interface describing methods

```typescript
import { Context, Effect } from "effect"

class Database extends Context.Tag("@app/Database")<
  Database,
  {
    readonly query: (sql: string) => Effect.Effect<unknown[]>
    readonly execute: (sql: string) => Effect.Effect<void>
  }
>() {}

class Logger extends Context.Tag("@app/Logger")<
  Logger,
  {
    readonly log: (message: string) => Effect.Effect<void>
  }
>() {}
```

Rules:

- Tag identifiers must be unique. Use `@path/ServiceName` prefix
- Service methods should have no dependencies (`R = never`)
- Use readonly properties

## What is a Layer?

A Layer implements a service. Handles setup, dependency resolution, resource lifecycle.

```typescript
import { HttpClient, HttpClientResponse } from "@effect/platform"
import { Context, Effect, Layer, Schema } from "effect"

const UserId = Schema.String.pipe(Schema.brand("UserId"))
type UserId = typeof UserId.Type

class User extends Schema.Class<User>("User")({
  id: UserId,
  name: Schema.String,
  email: Schema.String,
}) {}

class UserNotFoundError extends Schema.TaggedError<UserNotFoundError>()("UserNotFoundError", {
  id: UserId,
}) {}

class Users extends Context.Tag("@app/Users")<
  Users,
  {
    readonly findById: (id: UserId) => Effect.Effect<User, UserNotFoundError>
    readonly all: () => Effect.Effect<readonly User[]>
  }
>() {
  static readonly layer = Layer.effect(
    Users,
    Effect.gen(function* () {
      const http = yield* HttpClient.HttpClient

      const findById = Effect.fn("Users.findById")(function* (id: UserId) {
        const response = yield* http.get(`https://api.example.com/users/${id}`)
        return yield* HttpClientResponse.schemaBodyJson(User)(response)
      })

      const all = Effect.fn("Users.all")(function* () {
        const response = yield* http.get("https://api.example.com/users")
        return yield* HttpClientResponse.schemaBodyJson(Schema.Array(User))(response)
      })

      return Users.of({ findById, all })
    }),
  )
}
```

Layer naming: camelCase with `Layer` suffix: `layer`, `testLayer`, `postgresLayer`.

## Service-Driven Development

Start by sketching leaf service tags without implementations. Write orchestration that type-checks even though leaves aren't runnable.

```typescript
import { Clock, Context, Effect, Layer, Schema } from "effect"

// Leaf services: contracts only
class Users extends Context.Tag("@app/Users")<
  Users,
  { readonly findById: (id: UserId) => Effect.Effect<User> }
>() {}

class Tickets extends Context.Tag("@app/Tickets")<
  Tickets,
  { readonly issue: (eventId: EventId, userId: UserId) => Effect.Effect<Ticket> }
>() {}

class Emails extends Context.Tag("@app/Emails")<
  Emails,
  { readonly send: (to: string, subject: string, body: string) => Effect.Effect<void> }
>() {}

// Higher-level service: orchestrates leaf services
class Events extends Context.Tag("@app/Events")<
  Events,
  { readonly register: (eventId: EventId, userId: UserId) => Effect.Effect<Registration> }
>() {
  static readonly layer = Layer.effect(
    Events,
    Effect.gen(function* () {
      const users = yield* Users
      const tickets = yield* Tickets
      const emails = yield* Emails

      const register = Effect.fn("Events.register")(function* (eventId: EventId, userId: UserId) {
        const user = yield* users.findById(userId)
        const ticket = yield* tickets.issue(eventId, userId)
        const now = yield* Clock.currentTimeMillis

        const registration = Registration.make({
          id: RegistrationId.make(crypto.randomUUID()),
          eventId,
          userId,
          ticketId: ticket.id,
          registeredAt: new Date(now),
        })

        yield* emails.send(
          user.email,
          "Event Registration Confirmed",
          `Your ticket code: ${ticket.code}`,
        )

        return registration
      })

      return Events.of({ register })
    }),
  )
}
```

## Test Implementations

Create lightweight test implementations with `Layer.sync` or `Layer.succeed`:

```typescript
class Database extends Context.Tag("@app/Database")<
  Database,
  {
    readonly query: (sql: string) => Effect.Effect<unknown[]>
    readonly execute: (sql: string) => Effect.Effect<void>
  }
>() {
  static readonly testLayer = Layer.sync(Database, () => {
    let records: Record<string, unknown> = {
      "user-1": { id: "user-1", name: "Alice" },
    }

    return Database.of({
      query: (sql) => Effect.succeed(Object.values(records)),
      execute: (sql) => Console.log(`Test execute: ${sql}`),
    })
  })
}
```

## Providing Layers

Use `Effect.provide` once at the top of your application:

```typescript
// Compose all layers into a single app layer
const appLayer = userServiceLayer.pipe(
  Layer.provideMerge(databaseLayer),
  Layer.provideMerge(loggerLayer),
  Layer.provideMerge(configLayer),
)

const program = Effect.gen(function* () {
  const users = yield* UserService
  const logger = yield* Logger
  yield* logger.info("Starting...")
  yield* users.getUser()
})

// Provide once at entry point
const main = program.pipe(Effect.provide(appLayer))

Effect.runPromise(main)
```

Why provide once at top?

- Clear dependency graph: all wiring in one place
- Easier testing: swap `appLayer` for `testLayer`
- No hidden dependencies
- Simpler refactoring

## Layer Memoization

Effect memoizes layers by reference identity. Same layer instance = constructed once.

```typescript
// BAD: calling constructor twice creates two connection pools
const badAppLayer = Layer.merge(
  UserRepo.layer.pipe(Layer.provide(Postgres.layer({ url: "...", poolSize: 10 }))),
  OrderRepo.layer.pipe(
    Layer.provide(Postgres.layer({ url: "...", poolSize: 10 })), // Different reference!
  ),
)

// GOOD: store layer in constant first
const postgresLayer = Postgres.layer({ url: "...", poolSize: 10 })

const goodAppLayer = Layer.merge(
  UserRepo.layer.pipe(Layer.provide(postgresLayer)),
  OrderRepo.layer.pipe(Layer.provide(postgresLayer)), // Same reference!
)
```

Rule: When using parameterized layer constructors, always store result in module-level constant.
