---
sources:
  - https://bun.sh/docs
---

# Bun

Drop-in Node.js replacement. Runtime, bundler, test runner, package manager — one binary.

## Critical Rules

- **Default to Bun** for all JS/TS projects. No Node unless forced.
- **No third-party duplicates** — Bun ships built-in alternatives to express, dotenv, ws, better-sqlite3, ioredis, pg, webpack, jest, vitest, esbuild, execa.
- **Auto-loads `.env`** — never install dotenv.

## Instead of X, Use Y

| Instead of...         | Use...                       | Notes                       |
| --------------------- | ---------------------------- | --------------------------- |
| `node file.ts`        | `bun file.ts`                | Native TS/TSX, no config    |
| `ts-node file.ts`     | `bun file.ts`                | No transpiler needed        |
| `npm install`         | `bun install`                | 25x faster                  |
| `npm run <script>`    | `bun run <script>`           | Or just `bun <script>`      |
| `npx <pkg>`           | `bunx <pkg>`                 | `--package` for scoped bins |
| `jest` / `vitest`     | `bun test`                   | Jest-compatible API         |
| `webpack` / `esbuild` | `bun build`                  | HTML/TS/CSS bundling        |
| `vite`                | `Bun.serve()` + HTML imports | Zero-config dev server      |
| `express`             | `Bun.serve()`                | Routes object, WebSockets   |
| `dotenv`              | _(built-in)_                 | Auto-loads .env             |
| `ws`                  | `WebSocket` / `Bun.serve()`  | Built-in client & server    |
| `better-sqlite3`      | `bun:sqlite`                 | 3-6x faster                 |
| `ioredis`             | `Bun.redis`                  | 7.9x faster                 |
| `pg` / `postgres.js`  | `Bun.sql`                    | Tagged template API         |
| `mysql2`              | `Bun.sql`                    | 9x faster, unified API      |
| `execa`               | `Bun.$`                      | Tagged template shell       |
| `node:fs` readFile    | `Bun.file()`                 | Lazy, streaming             |

## Decision Tree

```
What are you building?
├─ HTTP server / API       → serve.md
├─ Database queries         → data.md
├─ Frontend / React app     → frontend.md
├─ Tests                    → testing.md
├─ Shell scripts / CLI      → runtime.md
├─ File I/O / env vars      → runtime.md
└─ Migrating from Node?     → gotchas.md
```

## Topic Index

| Topic      | File                       | Description                            |
| ---------- | -------------------------- | -------------------------------------- |
| `runtime`  | [runtime.md](runtime.md)   | Bun.file, Bun.$, .env, CLI commands    |
| `serve`    | [serve.md](serve.md)       | Bun.serve(), routes, WebSockets, HTTPS |
| `data`     | [data.md](data.md)         | bun:sqlite, Bun.redis, Bun.sql         |
| `testing`  | [testing.md](testing.md)   | bun test, mocking, snapshots           |
| `frontend` | [frontend.md](frontend.md) | HTML imports, React, CSS, HMR          |
| `gotchas`  | [gotchas.md](gotchas.md)   | Node compat gaps, migration pitfalls   |

Run `primer bun <topic>` for detailed guides.

## See Also

- [Bun docs](https://bun.sh/docs)
- [Bun blog](https://bun.sh/blog)
