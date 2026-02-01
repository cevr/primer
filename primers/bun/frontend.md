# Frontend

HTML imports, zero-config bundling, React, CSS, and HMR. Replaces Vite/Webpack for frontend dev.

## When to Use

- Building a React (or any JSX) frontend served by Bun
- Full-stack apps where server and client live together
- Need a dev server with HMR — no Vite/Webpack config

## HTML Imports

Import an HTML file from server code. Bun scans it for `<script>` and `<link>` tags, bundles everything (TS, TSX, CSS), and serves it.

```typescript
import homepage from "./index.html"

Bun.serve({
  port: 3000,
  routes: {
    "/": homepage,
  },
  development: true,
})
```

The HTML file is a normal HTML file — Bun handles the rest:

```html
<!-- index.html -->
<!DOCTYPE html>
<html>
  <head>
    <link rel="stylesheet" href="./styles.css" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./App.tsx"></script>
  </body>
</html>
```

What Bun does automatically:

- Transpiles TS/TSX/JSX
- Bundles JS imports
- Bundles CSS (including `@import`)
- Tree shakes dead code
- In dev: HMR, source maps, no minification
- In prod: minification, code splitting, content hashing

## React Setup

### New Project

```bash
bun init     # select "React" template
```

### Existing Project

```bash
bun add react react-dom
bun add -D @types/react @types/react-dom
```

### Entry Point

```tsx
// App.tsx
import { createRoot } from "react-dom/client"

function App() {
  return <h1>Hello from Bun</h1>
}

createRoot(document.getElementById("root")!).render(<App />)
```

### Server

```typescript
// server.ts
import homepage from "./index.html"

Bun.serve({
  port: 3000,
  routes: {
    "/": homepage,
    "/api/data": () => Response.json({ message: "hello" }),
  },
  development: true,
})
```

```bash
bun server.ts    # that's it — dev server with HMR running
```

## Full-Stack Pattern

Frontend routes via HTML imports, backend routes via handlers, all in one server:

```typescript
import app from "./client/index.html"

Bun.serve({
  port: 3000,
  routes: {
    // Frontend
    "/": app,

    // API
    "/api/users": {
      GET: async () => Response.json(await getUsers()),
      POST: async (req) => {
        const body = await req.json()
        return Response.json(await createUser(body), { status: 201 })
      },
    },

    // Static assets
    "/favicon.ico": new Response(Bun.file("./public/favicon.ico")),
  },
  development: {
    hmr: true,
    console: true, // echo browser console.log to terminal
  },
})
```

## CSS

CSS is bundled automatically when referenced via `<link>` in HTML:

```html
<link rel="stylesheet" href="./styles.css" />
```

CSS `@import` works:

```css
/* styles.css */
@import "./reset.css";
@import "./components.css";

body {
  font-family: system-ui;
}
```

Tailwind CSS is auto-detected and configured.

## Dev Mode Options

```typescript
Bun.serve({
  development: true, // enable all dev features

  // Or granular control:
  development: {
    hmr: true, // hot module reloading (preserves state)
    console: true, // forward browser console.log to terminal
  },
})
```

HMR preserves React component state — no full page reload on changes.

`console: true` is useful for AI agents and headless debugging — browser logs stream to the terminal over the HMR WebSocket.

## Production Builds

```bash
bun build ./index.html --outdir ./dist
```

Or programmatically:

```typescript
await Bun.build({
  entrypoints: ["./index.html"],
  outdir: "./dist",
  minify: true,
  splitting: true,
  sourcemap: "external",
})
```

Production optimizations:

- Minified JS and CSS
- Code splitting with shared chunks
- Content-hashed filenames for caching
- Tree shaking
- React production mode (no dev warnings)

## Gotchas

- **No `vite.config.ts`** — Bun's bundler is built-in. Don't add Vite alongside it.
- **HTML is the entrypoint** — not a JS/TS file. The HTML file drives discovery of scripts and styles.
- **`development: true` is for dev only** — omit or set `false` in production for minification and optimization.
- **HMR requires `type="module"`** — use `<script type="module" src="./App.tsx">` in HTML.

## See Also

- [serve.md](serve.md) — Bun.serve() API details
- [runtime.md](runtime.md) — bun build CLI
- [gotchas.md](gotchas.md) — general compatibility notes
