# Data

Built-in database clients: SQLite, PostgreSQL, MySQL, Redis. No third-party drivers needed.

## When to Use

- Any database query — always reach for the built-in client first
- `bun:sqlite` for embedded/local databases
- `Bun.sql` for PostgreSQL or MySQL
- `Bun.redis` for Redis/Valkey

## Quick Reference

| Database   | Import                                  | Instead of...   |
| ---------- | --------------------------------------- | --------------- |
| SQLite     | `import { Database } from "bun:sqlite"` | better-sqlite3  |
| PostgreSQL | `import { sql, SQL } from "bun"`        | pg, postgres.js |
| MySQL      | `import { SQL } from "bun"`             | mysql2          |
| Redis      | `import { redis } from "bun"`           | ioredis         |

## bun:sqlite

Synchronous API. 3-6x faster than better-sqlite3.

```typescript
import { Database } from "bun:sqlite"

// Open (file-based or in-memory)
const db = new Database("mydb.sqlite")
const mem = new Database(":memory:")

// Enable WAL mode (recommended for most apps)
db.exec("PRAGMA journal_mode = WAL;")

// Create table
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL
  )
`)

// Insert — prepared statement with parameters
const insert = db.prepare("INSERT INTO users (name, email) VALUES (?, ?)")
insert.run("Alice", "alice@example.com")

// Named parameters
const insertNamed = db.prepare("INSERT INTO users (name, email) VALUES ($name, $email)")
insertNamed.run({ $name: "Bob", $email: "bob@example.com" })

// Query — all rows
const users = db.prepare("SELECT * FROM users").all()
// → [{ id: 1, name: "Alice", email: "alice@example.com" }, ...]

// Query — first row
const user = db.prepare("SELECT * FROM users WHERE id = ?").get(1)
// → { id: 1, name: "Alice", email: "alice@example.com" }

// Query — as arrays (faster, no object allocation)
const rows = db.prepare("SELECT name, email FROM users").values()
// → [["Alice", "alice@example.com"], ["Bob", "bob@example.com"]]

// Transactions
const insertMany = db.transaction((users: { name: string; email: string }[]) => {
  for (const u of users) {
    insert.run(u.name, u.email)
  }
  return users.length
})
const count = insertMany([
  { name: "Charlie", email: "charlie@example.com" },
  { name: "Diana", email: "diana@example.com" },
])
```

### bun:sqlite via Bun.sql (Tagged Template)

Same tagged template API as Postgres/MySQL:

```typescript
import { SQL } from "bun"

const db = new SQL("sqlite://data.db")
// or in-memory:
const mem = new SQL("sqlite://:memory:")

const users = await db`SELECT * FROM users WHERE name = ${"Alice"}`
```

## Bun.sql — PostgreSQL / MySQL

Tagged template literal API. Auto-parameterized — no SQL injection.

### PostgreSQL

```typescript
import { sql } from "bun"

// Connects to DATABASE_URL env var, or specify:
// import { SQL } from "bun";
// const sql = new SQL("postgres://user:pass@localhost/mydb");

// Query with auto-parameterization
const username = "alice"
const users = await sql`SELECT * FROM users WHERE username = ${username}`
// → [{ id: 1, username: "alice", ... }]

// Insert
await sql`INSERT INTO users (name, email) VALUES (${"Bob"}, ${"bob@example.com"})`

// Transaction
await sql.begin(async (tx) => {
  await tx`INSERT INTO orders (user_id, total) VALUES (${1}, ${99.99})`
  await tx`UPDATE users SET order_count = order_count + 1 WHERE id = ${1}`
})

// Close
await sql.close()
```

### MySQL

```typescript
import { SQL } from "bun"

const sql = new SQL("mysql://user:pass@localhost/mydb")

const rows = await sql`SELECT * FROM products WHERE price > ${10}`
```

Same API as PostgreSQL — unified tagged template interface.

## Bun.redis

Built-in Redis client. 7.9x faster than ioredis. Supports Valkey.

```typescript
import { redis, RedisClient } from "bun"

// Default: connects to REDIS_URL env var or localhost:6379
// Or explicit:
// const redis = new RedisClient("redis://user:pass@host:6379");

// Strings
await redis.set("key", "value")
const val = await redis.get("key") // "value"

// With expiry
await redis.set("session", "data", "EX", 3600) // 1 hour TTL

// Hashes
await redis.hset("user:1", "name", "Alice", "email", "alice@example.com")
const name = await redis.hget("user:1", "name")
const all = await redis.hgetall("user:1")

// Lists
await redis.lpush("queue", "task1", "task2")
const tasks = await redis.lrange("queue", 0, -1)

// Sets
await redis.sadd("tags", "typescript", "bun")
const tags = await redis.smembers("tags")

// Pub/Sub
await redis.subscribe("events", (message) => {
  console.log("received:", message)
})
await redis.publish("events", "hello")
```

## Gotchas

- **bun:sqlite is synchronous** — `db.prepare().all()` blocks. Fine for most use cases, but be aware in hot paths on a server.
- **Bun.sql auto-connects** — uses `DATABASE_URL` env var by default. If missing and no explicit URL, it will fail at query time, not at import.
- **Tagged template parameterization** — `sql\`SELECT \* FROM ${table}\`` does NOT work for table/column names. Only values are parameterized. Use raw SQL for dynamic identifiers.
- **WAL mode** — always enable for SQLite in server contexts. Without it, concurrent reads block on writes.

## See Also

- [serve.md](serve.md) — database queries in route handlers
- [runtime.md](runtime.md) — Bun.file for file-based storage
- [gotchas.md](gotchas.md) — Node.js compatibility notes
