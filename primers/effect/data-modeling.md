# Data Modeling

Effect's `Schema` library provides runtime validation, serialization, and type safety.

## Why Schema?

- **Single source of truth**: TypeScript types + runtime validation + JSON serialization
- **Parse safely**: Validate HTTP/CLI/config data with detailed errors
- **Rich domain types**: Branded primitives, classes with methods
- **Ecosystem integration**: Same schema for RPC, HttpApi, CLI, frontend, backend

## Foundations

All data is composed of two primitives:

- **Records** (AND): a `User` has name AND email AND createdAt
- **Variants** (OR): a `Result` is Success OR Failure

## Records (AND Types)

Use `Schema.Class` for composite data:

```typescript
import { Schema } from "effect"

const UserId = Schema.String.pipe(Schema.brand("UserId"))
type UserId = typeof UserId.Type

export class User extends Schema.Class<User>("User")({
  id: UserId,
  name: Schema.String,
  email: Schema.String,
  createdAt: Schema.Date,
}) {
  get displayName() {
    return `${this.name} (${this.email})`
  }
}

const user = User.make({
  id: UserId.make("user-123"),
  name: "Alice",
  email: "alice@example.com",
  createdAt: new Date(),
})

console.log(user.displayName) // "Alice (alice@example.com)"
```

## Variants (OR Types)

Use `Schema.Literal` for simple alternatives:

```typescript
const Status = Schema.Literal("pending", "active", "completed")
type Status = typeof Status.Type // "pending" | "active" | "completed"
```

For structured variants, combine `Schema.TaggedClass` with `Schema.Union`:

```typescript
import { Match, Schema } from "effect"

export class Success extends Schema.TaggedClass<Success>()("Success", {
  value: Schema.Number,
}) {}

export class Failure extends Schema.TaggedClass<Failure>()("Failure", {
  error: Schema.String,
}) {}

export const Result = Schema.Union(Success, Failure)
export type Result = typeof Result.Type

// Pattern match
const renderResult = (result: Result) =>
  Match.valueTags(result, {
    Success: ({ value }) => `Got: ${value}`,
    Failure: ({ error }) => `Error: ${error}`,
  })
```

## Branded Types

Prevent mixing values with same underlying type. **Nearly all primitives should be branded** - IDs, emails, URLs, timestamps, etc.

```typescript
import { Schema } from "effect"

// IDs - prevent mixing different entity IDs
export const UserId = Schema.String.pipe(Schema.brand("UserId"))
export type UserId = typeof UserId.Type

export const PostId = Schema.String.pipe(Schema.brand("PostId"))
export type PostId = typeof PostId.Type

// Domain primitives
export const Email = Schema.String.pipe(Schema.brand("Email"))
export type Email = typeof Email.Type

export const Port = Schema.Int.pipe(Schema.between(1, 65535), Schema.brand("Port"))
export type Port = typeof Port.Type

// Usage - impossible to mix types
const userId = UserId.make("user-123")
const postId = PostId.make("post-456")

function getUser(id: UserId) {
  return id
}

getUser(userId) // OK
// getUser(postId) // Type error: Can't pass PostId where UserId expected
```

## JSON Encoding & Decoding

Use `Schema.parseJson` for combined JSON parsing and validation:

```typescript
import { Effect, Schema } from "effect"

class Move extends Schema.Class<Move>("Move")({
  from: Position,
  to: Position,
}) {}

// Combines JSON.parse + schema decoding
const MoveFromJson = Schema.parseJson(Move)

const program = Effect.gen(function* () {
  const jsonString = '{"from":{"row":"A","column":"1"},"to":{"row":"B","column":"2"}}'
  const move = yield* Schema.decodeUnknown(MoveFromJson)(jsonString)

  // Encode to JSON string
  const json = yield* Schema.encode(MoveFromJson)(move)
  return json
})
```
