# Architecture Patterns

Effect-first patterns for TypeScript application architecture.

## Core Principles

1. **Schema is source of truth** - types, validation, serialization from Effect Schema
2. **Services are interfaces, layers are implementations** - Context.Tag + Layer
3. **Errors are types** - TaggedError with typed error channel
4. **Config fails fast** - invalid config = startup failure
5. **Branded strings everywhere** - monotonic IDs (ULID/KSUID), no integer IDs

## Navigation

```
Building something?
├─ Organizing a monorepo        → structure.md
├─ Defining module boundaries   → boundaries.md
├─ Wiring up services/DI        → services.md
├─ Handling errors              → errors.md
├─ Managing configuration       → config.md
├─ Modeling domain types        → domain.md
├─ Designing APIs               → api.md
└─ Avoiding pitfalls            → gotchas.md
```

## Topic Index

| Topic             | File            | When to Read                        |
| ----------------- | --------------- | ----------------------------------- |
| Project structure | `structure.md`  | Setting up monorepo, package layout |
| Module boundaries | `boundaries.md` | Deciding import rules, isolation    |
| Services & DI     | `services.md`   | Context.Tag, Layer composition      |
| Error handling    | `errors.md`     | TaggedError, catchTag, recovery     |
| Configuration     | `config.md`     | Config.\*, redacted secrets         |
| Domain modeling   | `domain.md`     | Schema.Class, branded types         |
| API design        | `api.md`        | HttpApi, endpoints, middleware      |
| Common mistakes   | `gotchas.md`    | Effect-specific pitfalls            |

## Quick Decision Trees

```
Defining a service?
├─ Simple value/config          → Layer.succeed
├─ Lazy initialization          → Layer.sync
├─ Async initialization         → Layer.effect
├─ Resource with cleanup        → Layer.scoped
└─ From existing service        → Layer.effect + yield* dep

Error handling strategy?
├─ Domain/business error        → Schema.TaggedError
├─ Handle specific error        → Effect.catchTag
├─ Handle multiple errors       → Effect.catchTags
├─ Retry on failure             → Effect.retry + Schedule
└─ Let defects crash            → don't catch them

Modeling a type?
├─ ID (any kind)                → branded string
├─ Constrained value            → Schema with refinements
├─ Serializable data            → Schema.Class
├─ Union of states              → Schema.Union (tagged)
└─ Error type                   → Schema.TaggedError

API endpoint?
├─ Single endpoint              → HttpApiEndpoint.*
├─ Group of endpoints           → HttpApiGroup.make
├─ Full API                     → HttpApi.make
└─ Add authentication           → HttpApiMiddleware.Tag
```

## Key Imports

```typescript
// Core Effect
import { Effect, Layer, Context, Config, Schema as S } from "effect"

// HTTP API
import {
  HttpApi,
  HttpApiBuilder,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiMiddleware,
  HttpApiSchema,
  HttpApiSecurity,
} from "@effect/platform"

// Node runtime
import { NodeRuntime, NodeHttpServer } from "@effect/platform-node"

// Testing
import { it, expect } from "@effect/vitest"
```

## See Also

- `structure.md` - start here for project organization
- `services.md` - Layer patterns and DI
- `gotchas.md` - common mistakes to avoid
