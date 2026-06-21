---
title: The Hard Part of Building a Developer Tunnel Isn't the Tunnel
subtitle: The hard part of building a developer tunnel isn't forwarding HTTP over WebSocket. It's everything that assumes the world is localhost."
date: 2026-06-21
description: The hard part of building a developer tunnel isn't forwarding HTTP over WebSocket. It's everything that assumes the world is localhost — headers, addresses, URLs, cookies, CORS, compression, bundle sizes, reconnect loops, and the gap between "works in my terminal" and "works for a client on their phone."
---

# The Hard Part of Building a Developer Tunnel Isn't the Tunnel

_Article 2 in the ShipLocal build series — architecture depth from production._

---

When we started building [ShipLocal](https://github.com/ship-local/shiplocal), the pitch was simple: run `shiplocal 3000`, get a public URL, share it with a client, collect visual feedback on the live preview.

The tunnel itself — WebSocket registration, subdomain routing, HTTP forwarding to localhost — took days. Getting that loop to work **reliably for real apps, real clients, and a real production deploy** took weeks.

This article is about everything that happens _after_ you write the tunnel. If you've ever shipped something in the ngrok category, you'll recognize the pattern: the demo works on your machine; production breaks in ways nobody warned you about.

---

## What "the tunnel" actually is (and why it's the easy part)

At its core, a developer tunnel is a remote-controlled HTTP client running on the developer's laptop:

```
Client browser
    → HTTPS (happy-lion.shiplocal.cloud)
    → Edge proxy (Caddy)
    → API server (Fastify)
    → WebSocket to CLI
    → http.request to 127.0.0.1:3000
    → Response travels back the same chain
```

That's it. Register a session, map a subdomain to a socket, serialize requests over WebSocket, deserialize on the CLI, proxy to localhost, return the response.

We built this in a monorepo with three moving parts:

| Piece                 | Role                                                               |
| --------------------- | ------------------------------------------------------------------ |
| **CLI** (`shiplocal`) | Opens WebSocket, forwards inbound requests to local port           |
| **Server**            | Auth, tunnel registry, HTTP proxy, feedback API, overlay injection |
| **Dashboard**         | Auth, tunnel management, feedback inbox                            |

The tunnel protocol is deliberately boring: JSON messages with `register`, `request`, `response`, `ping`/`pong`. Boring is good. The complexity lives at the boundaries.

---

## Mistake #1: Treating the tunnel like a dumb pipe (it's not)

Our first mental model: "Forward every byte unchanged. Done."

Reality disagreed immediately.

### Compression headers and blank pages

Node's `http` client **automatically decompresses** gzip and Brotli responses from the local dev server — but leaves `Content-Encoding` and `Content-Length` headers intact. When those headers reach the browser, it tries to decompress already-decompressed bytes.

Result: `ERR_CONTENT_DECODING_FAILED` and a blank white page.

**Fix:** Strip `content-encoding`, `content-length`, and hop-by-hop headers in the proxy chain before sending the response to the client.

This is not exotic. It's the kind of bug you only hit when you proxy through _two_ HTTP stacks (browser → server → CLI → localhost → CLI → server → browser). Local testing with curl doesn't always catch it.

### Accidentally blocking `/api/*` on preview URLs

We reserved `/api/*` for ShipLocal's own API on the apex domain. The check ran **before** we determined whether the request was on a tunnel subdomain.

So a Next.js app with `/api/auth/session` or a Rails app with `/api/v1/users` would get 404 on the preview URL — even though those routes belong to the developer's app, not ShipLocal.

**Fix:** Resolve the subdomain first. Only reserve `/api/*`, `/health`, and `/overlay.js` on the **apex** host (`shiplocal.cloud`), not on `*.shiplocal.cloud`.

**Lesson:** Your platform routes and your users' app routes share a URL space on tunnel subdomains. Namespace collisions are your problem, not theirs.

---

## Mistake #2: `localhost` is not one address

This one cost us hours of confused debugging.

A developer's app worked in the browser at `http://localhost:3000`. The tunnel showed:

> Nothing is running on http://127.0.0.1:3000.

Same port. Same machine. Different outcome.

On modern macOS, `localhost` often resolves to **IPv6** (`::1`). Many dev servers bind only to IPv6. Our CLI hardcoded **`127.0.0.1`** (IPv4). Connection refused.

The browser and the tunnel were talking to different loopback interfaces.

**Fix:** Try both `127.0.0.1` and `::1` when connecting to the local port. Also set the proxied `Host` header to `localhost:{port}` so frameworks that care about host matching behave consistently.

**Lesson:** "Localhost" is a UX term. Your tunnel code needs to understand loopback semantics across IPv4, IPv6, and `0.0.0.0` binding.

---

## Mistake #3: Public URLs are a product surface, not a string concat

Early public URLs looked like:

```
http://swift-badger.shiplocal.cloud:4000
```

Port 4000 is where the **server listens inside Docker**. Clients reach the app through **Caddy on 443**. Browsers tried to load assets from `:4000` directly — bypassing TLS, bypassing the edge proxy — and failed.

**Fix:** Build public URLs from `API_PUBLIC_URL` (e.g. `https://shiplocal.cloud`), not from the internal listen port:

```
https://swift-badger.shiplocal.cloud
```

**Lesson:** Every URL you print in the CLI is a contract. If it's wrong once, every relative asset path, OAuth redirect, and CORS check downstream will be wrong too.

---

## Mistake #4: Real apps are bigger than your demo

Our first successful tunnel was a static HTML page. Then someone tried Create React App.

```
GET /static/js/bundle.js → 502 Bad Gateway
```

Three separate limits stacked on top of each other:

1. **Response body cap** — 10 MB max over the tunnel; CRA dev bundles exceed that
2. **Request timeout** — 30 seconds; slow first compile on a cold start
3. **WebSocket payload size** — default `ws` limits; large base64-encoded bodies fail silently

**Fix:** Raise limits (50 MB body, 120 s timeout, 64 MB WebSocket payload). These numbers are still arbitrary — webpack chunks for large apps can exceed them again. The real long-term fix is streaming or bypassing the WebSocket for static assets (CDN, direct file tunnel, or HTTP/2 multiplexing).

**Lesson:** Your tunnel's throughput model must match how modern bundlers work. A 200 KB HTML page is not a realistic test.

---

## Mistake #5: Full-stack apps expose the "localhost trap"

ShipLocal forwards **one port**. The browser loads the preview from `https://happy-lion.shiplocal.cloud`. If the frontend calls:

```javascript
fetch('https://api-dev.example.com/api/v1/users');
```

That request goes to **Example's servers**, not through your tunnel. It may work — if their CORS policy allows `*.shiplocal.cloud`. Often it doesn't.

If the frontend calls:

```javascript
fetch('http://localhost:4000/api/v1/users');
```

That request goes to **the client's laptop**, not the developer's. It always fails.

If the frontend uses relative paths (`/api/v1/users`) and the dev server proxies them to a backend — **that works**, because the browser only talks to the tunnel origin.

| Setup                                        | Works through tunnel?   |
| -------------------------------------------- | ----------------------- |
| Static site / SSR pages                      | ✅                      |
| Relative API paths via dev-server proxy      | ✅                      |
| Absolute `localhost` URLs in env vars        | ❌                      |
| External API without CORS for preview origin | ❌                      |
| Separate backend on another port (no proxy)  | ❌ unless second tunnel |
| Browser WebSockets (HMR, Socket.io)          | ⚠️ unreliable today     |

We documented this in our architecture notes as **Phase 6 work**: path-based routing (`/api/*` → `:4000`, everything else → `:3000`), cookie domain rewriting, CORS helpers, env var rewriting in the CLI.

The tunnel is a bridge into one process (or one reverse proxy on the dev machine). Full-stack local development is a **graph** of processes. Bridging one edge of the graph is not enough for every app.

---

## Mistake #6: The product is three deployables, not one

ShipLocal Cloud is not "a tunnel server in Docker." It's:

```
                    ┌─────────────┐
   Client browser ──│   Caddy     │── TLS (wildcard *.shiplocal.cloud)
                    └──────┬──────┘
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    Dashboard :3001   API/Tunnel :4000   Postgres
    (PM2 + next start) (Docker)          (Docker)
```

Each layer has its own failure mode:

| Symptom                           | Actual cause                                                                    |
| --------------------------------- | ------------------------------------------------------------------------------- |
| Apex domain empty                 | No `/` handler; API server isn't a marketing site                               |
| Dashboard has no CSS              | `next dev` behind Caddy; static assets return 400                               |
| Dashboard 502                     | Nothing listening on 3001; PM2 not running                                      |
| `/_next/static/*` 400             | Next.js 15 `allowedDevOrigins` blocking cross-host asset requests in dev mode   |
| Tunnel stop button "doesn't work" | CORS missing `DELETE`; CLI auto-reconnects after server closes socket           |
| `pnpm build` fails on VPS         | Host build tries to compile CLI without full deps; Docker build is what matters |

We learned to deploy them independently:

- **Server:** `docker compose up --build`
- **Dashboard:** `pnpm --filter @shiplocal/dashboard build && pm2 restart shiplocal-dashboard`
- **CLI:** `pnpm publish:cli` to npm

Running `pnpm build` on the VPS root and expecting everything to work was a trap. The monorepo has packages with different deploy targets.

---

## Mistake #7: Control plane vs data plane

Stopping a tunnel from the dashboard sounds trivial: close the WebSocket, mark the row offline.

It didn't work — because the CLI **auto-reconnected** and registered a **new** tunnel seconds later. The dashboard showed stop as broken; the user saw a zombie tunnel respawn.

The fix required coordination across layers:

1. **Server** sends `{ type: 'terminated', message: '...' }` before closing the socket
2. **CLI** treats `terminated` as intentional — no reconnect
3. **CORS** must allow `DELETE` for the delete button (browser preflight was silently failing)

This is a classic **control plane / data plane** split. The data plane (HTTP over WebSocket) was solid. The control plane (user clicks "stop" in a web UI that mutates server state that must propagate to a long-lived CLI process) needed explicit protocol design.

If we had only built the CLI's Ctrl+C path, we would never have found this.

---

## Mistake #8: Shipping the CLI is its own product

Publishing `shiplocal` to npm surfaced a parallel set of problems:

- Scoped packages (`@shiplocal/*`) require npm org ownership we didn't have
- **Bundling** shared + tunnel-client into one CLI with esbuild (only `commander` and `ws` as runtime deps)
- `commander` moved from devDependencies to dependencies — CI `pnpm install --frozen-lockfile` failed until the lockfile synced
- `resolveApiUrl()` defaulted to `http://localhost:4000` even after cloud login; users needed `export SHIPLOCAL_API_URL` for production until we fixed the default chain
- npm publish 404 when logged in as the wrong account or from the wrong directory (`publish:cli` is a root script, not `packages/cli`)

The CLI is the primary UX. A tunnel that works in development but ships a broken `npm install -g shiplocal` experience isn't a product.

---

## What we would design differently from day one

If we started again with everything we know now:

### 1. Separate route namespaces explicitly

```
shiplocal.cloud          → marketing / redirect to app
app.shiplocal.cloud      → dashboard (never proxied through tunnel logic)
*.shiplocal.cloud        → tunnel previews (proxy everything except overlay unlock paths)
api internal routes      → /api/* only on apex, never on subdomains
```

Write this table down before writing the first `if (url.startsWith('/api/'))`.

### 2. Define the local connection contract

Document and test against:

- IPv4 and IPv6 loopback
- `Host` header rewriting
- Maximum body size and timeout budgets
- Which hop strips compression headers

### 3. Treat public URL generation as config, not derivation

Single source of truth: `API_PUBLIC_URL`. Never derive customer-facing URLs from `PORT`.

### 4. Plan the three deployables on day one

Server (Docker), dashboard (Node process behind reverse proxy), CLI (npm). Different build commands, different restart commands, different env files.

### 5. Design control messages in the tunnel protocol upfront

`register`, `request`, `response`, `ping`, `pong`, **`terminated`**, **`error`**. Reconnection policy belongs in the spec, not as an afterthought when the dashboard gets a stop button.

### 6. Test with a real app matrix

Not just `python -m http.server`. Test:

- Create React App or Vite (large bundles)
- Next.js with `/api` routes
- An app that calls an external API (CORS)
- An app bound to IPv6-only localhost

---

## The actual architecture (where the complexity lives)

Here's the system we ended up with — the tunnel is the thin middle layer:

```
┌─────────────────────────────────────────────────────────────────┐
│                        Developer laptop                          │
│  localhost:3000  ←── CLI (WebSocket client + local HTTP proxy)  │
└───────────────────────────────┬─────────────────────────────────┘
                                │ WSS /tunnel
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         VPS (Hetzner)                            │
│  ┌──────────┐    ┌──────────────────────────────────────────┐   │
│  │  Caddy   │───▶│ Fastify server (:4000)                    │   │
│  │  :443    │    │  • Auth + JWT + API tokens                │   │
│  └────┬─────┘    │  • TunnelManager (sessions, heartbeats)   │   │
│       │          │  • HTTP proxy → WebSocket forward         │   │
│       │          │  • HTML overlay injection                 │   │
│       │          │  • Comments API                           │   │
│       │          └───────────────┬──────────────────────────┘   │
│       │                          │                               │
│       │          ┌───────────────▼──────────────────────────┐   │
│       └─────────▶│ Next.js dashboard (:3001, PM2)         │   │
│                  │  • Login, projects, tunnels, feedback    │   │
│                  └──────────────────────────────────────────┘   │
│                          │                                       │
│                  ┌───────▼───────┐                               │
│                  │  PostgreSQL   │                               │
│                  └───────────────┘                               │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Client browser                              │
│  https://happy-lion.shiplocal.cloud  +  💬 feedback overlay     │
└─────────────────────────────────────────────────────────────────┘
```

The tunnel is ~200 lines of forwarding logic. The surrounding system — auth, overlay injection, dashboard, CORS, TLS wildcard certs, CLI bundling, reconnect semantics — is the product.

---

## What the tunnel was never meant to solve alone

We built ShipLocal because sharing localhost with clients is a **collaboration** problem, not a networking problem. The tunnel is the wedge. The product is feedback with context: screenshots, selectors, a dashboard inbox, layout options for how you review comments.

Every hour we spent on IPv6 loopback or CORS DELETE headers was an hour we didn't spend on feedback UX — but we couldn't skip it. Without a reliable preview URL, the feedback overlay is useless.

That's the thesis of this article:

> **Building a developer tunnel is a weekend project. Operating one as part of a product — where real apps, real browsers, real TLS, and real control flows hit your system — is an architecture project.**

ngrok solved this over years. We're solving a narrower slice: agencies sharing WIP with clients and collecting structured feedback. But the boundary layers are the same.

---

## A checklist for your own tunnel product

If you're building in this space, test these before you call it done:

- [ ] gzip/brotli response from local dev server loads correctly in Chrome
- [ ] App with `/api/*` routes works on tunnel subdomain
- [ ] App bound to IPv6-only localhost works
- [ ] Public URL has no internal port number
- [ ] Bundle &gt; 10 MB loads (or you document the limit)
- [ ] Stop/disconnect from a remote control UI doesn't auto-reconnect
- [ ] Dashboard DELETE/POST actions pass CORS preflight from your app origin
- [ ] `next dev` is not your production dashboard deploy behind a reverse proxy
- [ ] CLI defaults point to production without manual `export`
- [ ] External API apps: document CORS or dev-proxy requirement clearly

---

## Closing thought

The hard part of building a developer tunnel isn't forwarding HTTP over WebSocket. It's everything that assumes the world is localhost — headers, addresses, URLs, cookies, CORS, compression, bundle sizes, reconnect loops, and the gap between "works in my terminal" and "works for a client on their phone."

ShipLocal is open source. The tunnel code is the easy part to read. The scars are in the proxy sanitizers, the CORS config, the `terminated` message type, and the PM2 ecosystem file.

If you're building something similar, save yourself a week: draw the route namespace table first, test with Create React App on day three, and never print a public URL with `:4000` in it.

---

_ShipLocal is open source. Go from localhost to client-ready in seconds. Collect visual client feedback on the live page. [GitHub](https://github.com/ship-local/shiplocal) · [Dashboard](https://app.shiplocal.cloud)_
