# Error Handling

Effect provides structured error handling with Schema integration.

## Schema.TaggedError

Define domain errors with `Schema.TaggedError`:

```typescript
import { Schema } from "effect"

class ValidationError extends Schema.TaggedError<ValidationError>()("ValidationError", {
  field: Schema.String,
  message: Schema.String,
}) {}

class NotFoundError extends Schema.TaggedError<NotFoundError>()("NotFoundError", {
  resource: Schema.String,
  id: Schema.String,
}) {}

const AppError = Schema.Union(ValidationError, NotFoundError)
type AppError = typeof AppError.Type
```

Benefits:

- Serializable (network/DB)
- Type-safe
- Built-in `_tag` for matching
- Custom methods via class
- Default `message` getter

TaggedErrors are **yieldable** - no `Effect.fail` needed:

```typescript
import { Effect, Random, Schema } from "effect"

class BadLuck extends Schema.TaggedError<BadLuck>()("BadLuck", { roll: Schema.Number }) {}

const rollDie = Effect.gen(function* () {
  const roll = yield* Random.nextIntBetween(1, 6)
  if (roll === 1) {
    yield* BadLuck.make({ roll }) // Yield directly
  }
  return { roll }
})
```

## Recovering from Errors

### catchAll

Handle all errors with fallback:

```typescript
const recovered: Effect.Effect<string, never> = program.pipe(
  Effect.catchAll((error) =>
    Effect.gen(function* () {
      yield* Effect.logError("Error occurred", error)
      return `Recovered from ${error.name}`
    }),
  ),
)
```

### catchTag

Handle specific errors by `_tag`:

```typescript
const recovered: Effect.Effect<string, ValidationError> = program.pipe(
  Effect.catchTag("HttpError", (error) =>
    Effect.gen(function* () {
      yield* Effect.logWarning(`HTTP ${error.statusCode}: ${error.message}`)
      return "Recovered from HttpError"
    }),
  ),
)
```

### catchTags

Handle multiple error types:

```typescript
const recovered: Effect.Effect<string, never> = program.pipe(
  Effect.catchTags({
    HttpError: () => Effect.succeed("Recovered from HttpError"),
    ValidationError: () => Effect.succeed("Recovered from ValidationError"),
  }),
)
```

## Expected Errors vs Defects

**Use typed errors** for domain failures the caller can handle: validation errors, "not found", permission denied.

**Use defects** for unrecoverable situations: bugs, invariant violations.

```typescript
// At app entry: if config fails, nothing can proceed
const main = Effect.gen(function* () {
  const config = yield* loadConfig.pipe(Effect.orDie)
  yield* Effect.log(`Starting on port ${config.port}`)
})
```

When to catch defects: Almost never. Only at system boundaries for logging. Use `Effect.exit` to inspect or `Effect.catchAllDefect` if you must recover.

## Schema.Defect - Wrapping Unknown Errors

Wrap errors from external libraries:

```typescript
import { Schema, Effect } from "effect"

class ApiError extends Schema.TaggedError<ApiError>()("ApiError", {
  endpoint: Schema.String,
  statusCode: Schema.Number,
  error: Schema.Defect, // Wraps unknown error
}) {}

const fetchUser = (id: string) =>
  Effect.tryPromise({
    try: () => fetch(`/api/users/${id}`).then((r) => r.json()),
    catch: (error) =>
      ApiError.make({
        endpoint: `/api/users/${id}`,
        statusCode: 500,
        error,
      }),
  })
```

Schema.Defect handles:

- JavaScript `Error` instances → `{ name, message }`
- Any unknown value → string representation
- Serializable for network/storage
