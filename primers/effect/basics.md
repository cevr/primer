# Effect Basics

Guidelines for structuring Effect code. Sequencing with `Effect.gen`, naming functions with `Effect.fn`.

## Effect.gen

Like `async/await` for Effect. Provides sequential, readable code avoiding nested chains.

```typescript
import { Effect } from "effect"

const program = Effect.gen(function* () {
  const data = yield* fetchData
  yield* Effect.logInfo(`Processing data: ${data}`)
  return yield* processData(data)
})
```

## Effect.fn

Use `Effect.fn` for traced, named effects. Traces call-site, not just definition:

```typescript
import { Effect } from "effect"

const processUser = Effect.fn("processUser")(function* (userId: string) {
  yield* Effect.logInfo(`Processing user ${userId}`)
  const user = yield* getUser(userId)
  return yield* processData(user)
})
```

Second argument transforms the entire effect (timeouts, retries):

```typescript
import { Effect, flow, Schedule } from "effect"

const fetchWithTimeout = Effect.fn("fetchWithTimeout")(
  function* (url: string) {
    const data = yield* fetchData(url)
    return yield* processData(data)
  },
  flow(Effect.retry(Schedule.recurs(3)), Effect.timeout("5 seconds")),
)
```

Benefits:

- Call-site tracing for each invocation
- Stack traces with location details
- Clean signatures
- Auto-creates spans for telemetry

## Pipe for Instrumentation

Use `.pipe()` for cross-cutting concerns: timeouts, retries, logging, annotations.

```typescript
import { Effect, Schedule } from "effect"

const program = fetchData.pipe(
  Effect.timeout("5 seconds"),
  Effect.retry(Schedule.exponential("100 millis").pipe(Schedule.compose(Schedule.recurs(3)))),
  Effect.tap((data) => Effect.logInfo(`Fetched: ${data}`)),
  Effect.withSpan("fetchData"),
)
```

Common instrumentation:

- `Effect.timeout` - fail if effect takes too long
- `Effect.retry` - retry on failure with a schedule
- `Effect.tap` - run side effect without changing value
- `Effect.withSpan` - add tracing span

## Retry and Timeout

Combine for production resilience:

```typescript
import { Effect, Schedule } from "effect"

// Retry with exponential backoff, max 3 attempts
const retryPolicy = Schedule.exponential("100 millis").pipe(Schedule.compose(Schedule.recurs(3)))

const resilientCall = callExternalApi.pipe(
  // Timeout each individual attempt
  Effect.timeout("2 seconds"),
  // Retry failed attempts
  Effect.retry(retryPolicy),
  // Overall timeout for all attempts
  Effect.timeout("10 seconds"),
)
```

Schedule combinators:

- `Schedule.exponential` - exponential backoff
- `Schedule.recurs` - limit number of retries
- `Schedule.spaced` - fixed delay between retries
- `Schedule.compose` - combine schedules (both must continue)
