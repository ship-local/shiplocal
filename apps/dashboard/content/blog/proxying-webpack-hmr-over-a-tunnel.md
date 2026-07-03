---
title: Proxying Webpack HMR Over a Tunnel
subtitle: HTTP-only tunnels break Next.js and Vite dev — until you relay browser WebSockets.
date: 2026-07-05
description: Dev servers depend on `/_next/webpack-hmr` and Vite's client socket. We added ws-open, ws-message, and ws-close to the tunnel protocol and wired browser ↔ server ↔ CLI ↔ localhost.
series: ShipLocal build series
series_order: 9
---

_This article is coming soon._

**Coming soon.**

---

## What this article will cover

- Why failed HMR connections cause polling, full reloads, and “page keeps refreshing”
- The gap between control-plane WebSocket (CLI ↔ server) and data-plane upgrades (browser ↔ your app)
- Protocol design: `ws-open`, `ws-message`, `ws-close` alongside existing HTTP `request`/`response`
- Server-side `registerTunnelUpgradeProxy` and subdomain routing for upgrades
- CLI relay to `ws://localhost:<port>` with pending message buffers on CONNECTING
- Normalizing WebSocket close codes browsers are not allowed to send
- Preserving binary frames (base64 over JSON on the control socket — for now)
