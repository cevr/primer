# Runtime

Bun's core runtime APIs: file I/O, shell commands, environment variables, and CLI commands.

## When to Use

- Reading/writing files (prefer `Bun.file` over `node:fs`)
- Running shell commands from JS/TS (prefer `Bun.$` over `execa`)
- Any script or CLI tool that would normally use Node

## CLI Commands

| Command               | What it does                              |
| --------------------- | ----------------------------------------- |
| `bun file.ts`         | Run any TS/TSX/JS file directly           |
| `bun run <script>`    | Run package.json script                   |
| `bun install`         | Install dependencies (25x faster)         |
| `bun add <pkg>`       | Add dependency                            |
| `bun add -D <pkg>`    | Add dev dependency                        |
| `bun remove <pkg>`    | Remove dependency                         |
| `bun update`          | Update dependencies                       |
| `bunx <pkg>`          | Execute package binary (like npx)         |
| `bunx -p <pkg> <bin>` | Execute when binary name differs from pkg |
| `bun build <entry>`   | Bundle for production                     |
| `bun test`            | Run tests                                 |
| `bun --hot file.ts`   | Run with hot reloading                    |
| `bun --watch file.ts` | Run with file watching (restarts)         |

## Bun.file() — File I/O

Lazy reference to a file. Nothing is read until you ask for content.

```typescript
// Read
const file = Bun.file("./data.json")
const text = await file.text()
const json = await file.json()
const bytes = await file.arrayBuffer()
const stream = file.stream()

// Metadata (no read needed)
file.size // bytes
file.type // MIME type

// Write
await Bun.write("./output.txt", "hello")
await Bun.write("./copy.json", Bun.file("./source.json"))
await Bun.write("./data.bin", new Uint8Array([1, 2, 3]))

// Stdout
await Bun.write(Bun.stdout, "printed to stdout\n")
```

Gotcha: `Bun.file()` does not throw if the file doesn't exist — it's lazy. The error comes when you read.

```typescript
const file = Bun.file("./nope.txt")
const exists = await file.exists() // false — check first if needed
```

## Bun.$ — Shell Commands

Tagged template for shell commands. Inputs are auto-escaped — no injection.

```typescript
import { $ } from "bun"

// Basic command
await $`echo hello`

// Capture output
const result = await $`ls -la`.text()
const lines = await $`cat file.txt`.lines()
const json = await $`cat data.json`.json()

// Interpolation is escaped (safe)
const dir = "my folder"
await $`ls ${dir}` // properly quoted

// Piping
await $`cat file.txt | grep pattern | wc -l`

// Environment variables
await $`echo $HOME`

// Redirect
await $`echo hello > output.txt`

// Quiet mode (no stdout printing)
const output = await $`ls`.quiet()

// Check exit code without throwing
const { exitCode } = await $`grep pattern file.txt`.nothrow()
if (exitCode !== 0) {
  console.log("not found")
}
```

Gotcha: If interpolated value is an object with a `raw` key, it bypasses escaping. Never pass untrusted objects.

```typescript
// DANGEROUS — bypasses escaping
await $`ls ${{ raw: "; rm -rf /" }}`

// SAFE — string interpolation is always escaped
const userInput = "; rm -rf /"
await $`echo ${userInput}` // prints literal string
```

## Environment Variables

Bun auto-loads `.env`, `.env.local`, `.env.development`, `.env.production` based on `NODE_ENV`. No dotenv needed.

```typescript
// Just works
const apiKey = process.env.API_KEY
const port = process.env.PORT ?? "3000"

// Or use Bun.env (same thing, typed)
const key = Bun.env.API_KEY
```

Load order (later overrides earlier):

1. `.env`
2. `.env.local`
3. `.env.${NODE_ENV}` (e.g. `.env.production`)
4. `.env.${NODE_ENV}.local`
5. Actual environment variables (always win)

## Bun.spawn — Process Spawning

For when `Bun.$` isn't enough (streaming stdout, IPC, etc.):

```typescript
const proc = Bun.spawn(["ffmpeg", "-i", "input.mp4", "output.webm"], {
  cwd: "/tmp",
  env: { ...process.env, DEBUG: "1" },
  stdout: "pipe",
  stderr: "inherit",
  onExit(proc, exitCode, signal) {
    console.log(`exited: ${exitCode}`)
  },
})

// Stream stdout
const reader = proc.stdout.getReader()
while (true) {
  const { done, value } = await reader.read()
  if (done) break
  process.stdout.write(value)
}
```

## See Also

- [serve.md](serve.md) — HTTP server
- [data.md](data.md) — database clients
- [gotchas.md](gotchas.md) — Node.js differences
