# Serve

`Bun.serve()` — high-performance HTTP server with built-in routing, WebSockets, and dev mode. Replaces Express, Fastify, etc.

## When to Use

- Any HTTP server or API
- WebSocket server
- Full-stack app with frontend serving
- Dev server with HMR

## Basic Server

```typescript
Bun.serve({
  port: 3000,
  fetch(req) {
    return new Response("Hello")
  },
})
```

## Routes Object

The preferred pattern. `fetch` becomes the fallback for unmatched routes.

```typescript
Bun.serve({
  port: 3000,
  routes: {
    "/": () => new Response("Home"),
    "/api/health": () => Response.json({ status: "ok" }),
    "/api/users": async () => {
      const users = await getUsers()
      return Response.json(users)
    },
  },
  fetch(req) {
    return new Response("Not Found", { status: 404 })
  },
})
```

`fetch` is optional when `routes` is provided.

## Static Routes (Zero-Allocation)

Pre-built `Response` objects — no handler function, no allocation per request. ~15% faster.

```typescript
Bun.serve({
  routes: {
    "/health": new Response("OK"),
    "/redirect": Response.redirect("https://example.com"),
    "/config": Response.json({ version: "1.0.0" }),
  },
})
```

Static responses are cached for the server lifetime. Reload with `server.reload(options)`.

## Dynamic Route Parameters

Route params via `:param` syntax. Available on `BunRequest.params`.

```typescript
Bun.serve({
  routes: {
    "/users/:id": (req) => {
      const { id } = req.params
      return Response.json({ userId: id })
    },
    "/posts/:slug/comments/:commentId": (req) => {
      const { slug, commentId } = req.params
      return Response.json({ slug, commentId })
    },
  },
})
```

`BunRequest` extends `Request` with:

- `params` — route parameters
- `cookies` — `CookieMap` for reading cookies

## Method-Specific Routes

```typescript
Bun.serve({
  routes: {
    "/api/users": {
      GET: async () => Response.json(await getUsers()),
      POST: async (req) => {
        const body = await req.json()
        const user = await createUser(body)
        return Response.json(user, { status: 201 })
      },
    },
  },
})
```

## WebSockets

Built-in WebSocket server — no `ws` package needed.

```typescript
const server = Bun.serve({
  port: 3000,
  routes: {
    "/": () => new Response("Home"),
  },
  fetch(req, server) {
    // Upgrade HTTP → WebSocket
    if (req.url.endsWith("/ws")) {
      const upgraded = server.upgrade(req, {
        data: { userId: "123" }, // attached to ws.data
      })
      if (upgraded) return // don't return Response
    }
    return new Response("Not a WebSocket request", { status: 400 })
  },
  websocket: {
    open(ws) {
      console.log("connected:", ws.data.userId)
      ws.subscribe("chat") // pub/sub topic
    },
    message(ws, message) {
      // Broadcast to all subscribers
      ws.publish("chat", `${ws.data.userId}: ${message}`)
    },
    close(ws) {
      console.log("disconnected:", ws.data.userId)
    },
    // Optional config
    maxPayloadLength: 16 * 1024 * 1024, // 16 MB
    idleTimeout: 120, // seconds
    backpressureLimit: 1024 * 1024, // 1 MB
  },
})

// Server-side publish
server.publish("chat", "Server announcement")
```

## File Serving

```typescript
Bun.serve({
  routes: {
    // Buffered — good for small/static assets
    "/favicon.ico": new Response(Bun.file("./public/favicon.ico")),

    // Streaming — good for large files, supports range requests
    "/download/:file": (req) => {
      const file = Bun.file(`./files/${req.params.file}`)
      return new Response(file)
      // Automatic: 404 if missing, Last-Modified, Range support
    },
  },
})
```

## HTTPS / TLS

```typescript
Bun.serve({
  port: 443,
  tls: {
    cert: Bun.file("./cert.pem"),
    key: Bun.file("./key.pem"),
  },
  fetch(req) {
    return new Response("Secure")
  },
})
```

## Dev Mode

Enables HMR, source maps, disables minification, and echoes browser console to terminal.

```typescript
Bun.serve({
  port: 3000,
  development: true, // shorthand

  // Or granular:
  development: {
    hmr: true, // hot module reloading
    console: true, // echo browser console.log to terminal
  },
})
```

## Server Control

```typescript
const server = Bun.serve({
  /* ... */
})

console.log(`Listening on ${server.url}`)

// Reload config without restart
server.reload({
  routes: {
    /* updated */
  },
})

// Graceful shutdown
server.stop()

// Pending request count
server.pendingRequests
```

## See Also

- [frontend.md](frontend.md) — HTML imports, React integration
- [data.md](data.md) — database queries in route handlers
- [runtime.md](runtime.md) — Bun.file for responses
