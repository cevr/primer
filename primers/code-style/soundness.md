# Soundness

Type safety patterns that make illegal states unrepresentable.

## Core Principle

**If the compiler allows it, it should be valid.** Design types so invalid combinations cannot exist.

## Discriminated Unions Over Boolean Flags

### Problem

Boolean flags create impossible states:

```ts
// BAD: What does loaded=true, error=true mean?
type State = {
  data?: User
  loading: boolean
  error?: Error
}
```

### Solution

Discriminated unions encode valid states only:

```ts
// GOOD: Each state is explicit and complete
type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: User }
  | { status: "error"; error: Error }
```

### Benefits

- Exhaustive switch/match checking
- No impossible state combinations
- Clear what data is available in each state

## Tagged Errors for Typed Error Channels

### Problem

Thrown errors lose type information:

```ts
// BAD: Caller doesn't know what errors to expect
function parseConfig(path: string): Config {
  if (!exists(path)) throw new Error("File not found")
  if (!valid(content)) throw new Error("Invalid config")
  return parsed
}
```

### Solution

Return typed errors in a discriminated union:

```ts
// GOOD: Errors are part of the type signature
type ParseError = { _tag: "FileNotFound"; path: string } | { _tag: "InvalidConfig"; reason: string }

function parseConfig(path: string): Either<ParseError, Config>
```

Or with Effect:

```ts
class FileNotFound extends Schema.TaggedError<FileNotFound>()(
  'FileNotFound',
  { path: Schema.String }
) {}

class InvalidConfig extends Schema.TaggedError<InvalidConfig>()(
  'InvalidConfig',
  { reason: Schema.String }
) {}

const parseConfig = (path: string): Effect<Config, FileNotFound | InvalidConfig>
```

## No `any` Casts or Non-null Assertions

### Problem

These bypass the compiler:

```ts
// BAD: Compiler can't help you
const data = response as any
const user = users.find((u) => u.id === id)!
```

### Solution

Use proper type narrowing:

```ts
// GOOD: Type-safe narrowing
const data = Schema.decodeUnknownSync(ResponseSchema)(response)

const user = users.find((u) => u.id === id)
if (!user) throw new UserNotFoundError({ id })
```

Or use `Option`:

```ts
const user = Array.findFirst(users, (u) => u.id === id)
// user: Option<User>
```

## Optional vs Required Fields

### Problem

Optional fields create ambiguity:

```ts
// BAD: Is undefined intentional or missing?
type User = {
  name: string
  nickname?: string // User has no nickname, or we don't know?
}
```

### Solution

Make semantics explicit:

```ts
// GOOD: Clear intent
type User = {
  name: string
  nickname: string | null // null = explicitly no nickname
}

// Or with Option for "may not exist"
type User = {
  name: string
  nickname: Option<string>
}
```

## Exhaustive Pattern Matching

### Problem

Missing cases silently pass:

```ts
// BAD: What if new status added?
function handle(state: State) {
  if (state.status === 'loading') return <Spinner />
  if (state.status === 'success') return <Data data={state.data} />
  // error case silently returns undefined
}
```

### Solution

Use exhaustive checks:

```ts
// GOOD: Compiler errors on missing cases
function handle(state: State) {
  switch (state.status) {
    case 'idle': return null
    case 'loading': return <Spinner />
    case 'success': return <Data data={state.data} />
    case 'error': return <Error error={state.error} />
    default: absurd(state)  // Compile error if case missing
  }
}

// Helper for exhaustiveness
function absurd(_: never): never {
  throw new Error('Absurd: should be unreachable')
}
```

## Branded Types for Domain Concepts

### Problem

Primitive types allow mixing unrelated values:

```ts
// BAD: Easy to mix up
function transfer(from: string, to: string, amount: number) {}
transfer(toAccount, fromAccount, 100) // Oops, reversed!
```

### Solution

Brand types for distinct concepts:

```ts
// GOOD: Compiler catches mistakes
type UserId = string & { readonly _brand: unique symbol }
type AccountId = string & { readonly _brand: unique symbol }

function transfer(from: AccountId, to: AccountId, amount: Amount) {}
transfer(toAccount, fromAccount, 100) // Type error!
```

Or with Effect Schema:

```ts
const UserId = Schema.String.pipe(Schema.brand("UserId"))
type UserId = typeof UserId.Type

const AccountId = Schema.String.pipe(Schema.brand("AccountId"))
type AccountId = typeof AccountId.Type
```

## Quick Reference

| Pattern             | Use When                               |
| ------------------- | -------------------------------------- |
| Discriminated union | Multiple exclusive states              |
| Tagged errors       | Function can fail in typed ways        |
| `Option<T>`         | Value may not exist                    |
| `Either<E, A>`      | Operation may fail with error E        |
| Branded types       | Primitives represent distinct concepts |
| Exhaustive switch   | Handling all cases of a union          |

## See Also

- `index.md` - core principles
- `gotchas.md` - common soundness mistakes
