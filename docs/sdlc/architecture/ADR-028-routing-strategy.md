# ADR-028: URL Routing and API Proxy Strategy

**Date**: 2026-02-10
**Status**: PROPOSED
**Deciders**: Jets (Architect Agent)
**Context**: ARCH-20260210-DASHBOARD-INTEGRATION

---

## Context

The dashboard integration architecture (ADR-027) requires the main dashboard server at port 3030 to serve as the single entry point for all user interactions. This creates a routing challenge: three separate servers (dashboard at 3030, platform webapp at 3001, platform API at 3000) must be accessible through one URL.

Additionally, when the platform webapp is loaded inside an iframe whose `src` points to `/platform/scheduling`, the iframe's origin becomes `localhost:3030`. Any `fetch('/api/v1/...')` calls made by components inside the iframe will route to `localhost:3030/api/v1/...`, which the dashboard server does not currently handle.

We need a routing strategy that:
1. Keeps all existing dashboard routes working
2. Proxies platform webapp assets and pages
3. Proxies platform API calls from embedded components
4. Avoids route conflicts between the two API surfaces
5. Supports Vite HMR for development

---

## Decision

**Adopt path-prefix-based routing with two proxy targets in the dashboard server.**

### Route Table

```
Priority  Pattern            Handler           Target
--------  -----------------  ----------------  ------------------
1         /api/events        SSE handler       Direct (dashboard)
2         /api/refresh       Broadcast         Direct (dashboard)
3         /api/registry      File read         Direct (dashboard)
4         /api/projects/*    File read         Direct (dashboard)
5         /api/costs/*       File read         Direct (dashboard)
6         /api/activity*     File read         Direct (dashboard)
7         /api/autofix       Exec command      Direct (dashboard)
8         /api/run-sdlc      POST handler      Direct (dashboard)
9         /api/v1/*          HTTP proxy        localhost:3000
10        /platform/*        HTTP proxy        localhost:3001
11        /assets/*          Static files      dashboard/assets/
12        /                  Serve HTML        dashboard/index.html
13        *                  404               Not found
```

### Key Design Decisions

**9. `/api/v1/*` routes proxy to platform API (port 3000)**

This works because the existing dashboard API uses flat routes (`/api/projects`, `/api/costs`, etc.) without a version prefix, while the platform API uses versioned routes (`/api/v1/scheduling/*`). There is zero overlap.

The proxy preserves the full path:
```
GET /api/v1/scheduling/projects/dashboard
  -> GET http://localhost:3000/api/v1/scheduling/projects/dashboard
```

**10. `/platform/*` routes proxy to platform webapp (port 3001)**

The `/platform` prefix is stripped before forwarding:
```
GET /platform/scheduling?embed=true
  -> GET http://localhost:3001/scheduling?embed=true

GET /platform/@vite/client
  -> GET http://localhost:3001/@vite/client

GET /platform/src/pages/Scheduling.tsx
  -> GET http://localhost:3001/src/pages/Scheduling.tsx
```

This stripping is necessary because the Vite dev server does not know about the `/platform` prefix. Its routes are `/scheduling`, `/src/...`, `/@vite/client`, etc.

---

## Alternatives Considered

### Alternative A: Subdomain-Based Routing

```
app.localhost:3030      -> Main dashboard
platform.localhost:3030 -> Platform webapp
api.localhost:3030      -> Platform API
```

**Pros**: Clean separation, no path prefix needed.

**Cons**: Requires DNS configuration (hosts file or local DNS), cookies are not shared across subdomains by default, more complex local setup, does not map well to single-port development.

**Rejected because**: Adds unnecessary setup complexity for local development.

### Alternative B: Port-Based Routing (No Proxy)

Keep each service on its own port and use the browser to navigate directly:
```
http://localhost:3030          -> Dashboard
http://localhost:3001/scheduling -> Platform webapp
```

**Pros**: No proxy code needed.

**Cons**: Cross-origin iframes, no unified navigation, multiple URLs for users to remember.

**Rejected because**: This is the current state, which we are trying to improve.

### Alternative C: Single Prefix for Everything

Route all non-dashboard traffic through `/ext/*`:
```
/ext/webapp/*   -> Platform webapp
/ext/api/*      -> Platform API
```

**Pros**: Clean single prefix.

**Cons**: Requires the platform webapp to be aware of the `/ext/webapp` prefix (base URL configuration), requires the platform API to be aware of `/ext/api` prefix or the proxy must rewrite paths. Vite requires `base` configuration for non-root deployments.

**Rejected because**: Requires build-time configuration changes to the platform webapp (Vite `base` option), which couples the two applications.

---

## Consequences

### Positive

1. **Zero route conflicts** -- Dashboard APIs use `/api/{name}`, platform APIs use `/api/v1/{name}`, cleanly separated
2. **Transparent to iframe** -- Components inside the iframe make normal `fetch('/api/v1/...')` calls that just work
3. **No build configuration needed** -- Platform webapp does not need to know about the `/platform` prefix (it is stripped by the proxy)
4. **Easy to understand** -- Route priority table is straightforward
5. **Production-portable** -- Maps directly to ALB path-based routing rules or nginx location blocks

### Negative

1. **Proxy path stripping** -- The `/platform` prefix must be stripped before forwarding, which adds a line of logic
2. **Static asset routing** -- Vite serves assets from paths like `/node_modules/.vite/...` and `/src/...`; the proxy must handle these under `/platform/...`
3. **WebSocket proxy** -- Vite HMR uses WebSocket at `/__vite_hmr`; the proxy must handle WebSocket upgrade for `/platform/__vite_hmr`

---

## Technical Implementation Details

### Proxy Function

The dashboard server (`server.js`) uses Node.js built-in `http` module. No external proxy libraries are needed.

```javascript
const http = require('http');
const url = require('url');

function proxyRequest(clientReq, clientRes, target, targetPath) {
  const targetUrl = new URL(target);
  const options = {
    hostname: targetUrl.hostname,
    port: targetUrl.port,
    path: targetPath,
    method: clientReq.method,
    headers: {
      ...clientReq.headers,
      host: `${targetUrl.hostname}:${targetUrl.port}`,
    },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(clientRes, { end: true });
  });

  proxyReq.on('error', (err) => {
    console.error(`Proxy error: ${target}${targetPath} ->`, err.message);
    if (!clientRes.headersSent) {
      clientRes.writeHead(502, { 'Content-Type': 'application/json' });
      clientRes.end(JSON.stringify({
        error: 'Service unavailable',
        target: target,
        message: err.message,
      }));
    }
  });

  clientReq.pipe(proxyReq, { end: true });
}
```

### WebSocket Upgrade for Vite HMR

```javascript
server.on('upgrade', (req, socket, head) => {
  if (req.url.startsWith('/platform/')) {
    const targetPath = req.url.replace('/platform', '');
    const proxyReq = http.request({
      hostname: 'localhost',
      port: 3001,
      path: targetPath,
      method: 'GET',
      headers: {
        ...req.headers,
        host: 'localhost:3001',
      },
    });

    proxyReq.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
      socket.write(
        'HTTP/1.1 101 Switching Protocols\r\n' +
        Object.entries(proxyRes.headers)
          .map(([k, v]) => `${k}: ${v}`)
          .join('\r\n') +
        '\r\n\r\n'
      );
      proxySocket.pipe(socket);
      socket.pipe(proxySocket);
    });

    proxyReq.on('error', (err) => {
      console.error('WebSocket proxy error:', err.message);
      socket.destroy();
    });

    proxyReq.end();
  }
});
```

### Route Order in Server Request Handler

The route handlers in `server.js` must be ordered by specificity:

```javascript
const server = http.createServer((req, res) => {
  // CORS headers (existing)
  // ...

  // 1. SSE endpoint (existing)
  if (req.url === '/api/events') { ... }

  // 2-8. Existing dashboard API routes (existing)
  if (req.url === '/api/refresh') { ... }
  if (req.url === '/api/registry') { ... }
  // ... etc.

  // 9. NEW: Platform API proxy (/api/v1/*)
  if (req.url.startsWith('/api/v1/')) {
    proxyRequest(req, res, 'http://localhost:3000', req.url);
    return;
  }

  // 10. NEW: Platform webapp proxy (/platform/*)
  if (req.url.startsWith('/platform/')) {
    const targetPath = req.url.replace('/platform', '') || '/';
    proxyRequest(req, res, 'http://localhost:3001', targetPath);
    return;
  }

  // 11. Static assets (existing)
  if (req.url.startsWith('/assets/')) { ... }

  // 12. Main page (existing)
  if (req.url === '/' || req.url === '/index.html') { ... }

  // 13. 404 (existing)
  res.writeHead(404);
  res.end('Not found');
});
```

---

## References

- [ARCH-20260210-DASHBOARD-INTEGRATION](/docs/sdlc/architecture/ARCH-20260210-DASHBOARD-INTEGRATION.md) -- Main architecture document
- [ADR-027](/docs/sdlc/architecture/ADR-027-dashboard-integration-strategy.md) -- Integration approach
- [ADR-029](/docs/sdlc/architecture/ADR-029-style-consistency.md) -- Style consistency
