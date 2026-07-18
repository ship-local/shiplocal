---
title: Adoption Before Optimization — A Tunnel Product Roadmap
subtitle: The biggest unknown is not protocol speed. It is whether developers want this workflow.
date: 2026-07-16
description: v0.2 correctness and beta users, v0.3 binary frames, v0.4 caching, v0.5 streaming only if real users still hurt.
series: ShipLocal build series
series_order: 20
---

If ShipLocal were my startup, I would not ask first:

> How do we make the tunnel as fast as possible?

I would ask:

> Do developers adopt this workflow enough for speed to matter?

This post is the product roadmap behind the engineering work in Parts 7–18 — and why protocol v2 waits its turn.

---

## The real unknown

ShipLocal’s wedge is collaboration:

- share localhost with a client
- collect visual feedback
- skip staging-just-to-demo

A faster base64 encoder does not prove that loop.

Beta users do.

So early engineering priority is:

1. correctness on real apps (Next, Vite, HMR, CSP)
2. diagnostics (`shiplocal doctor`)
3. measured performance work
4. streaming only if needed

---

## Version strategy

### v0.2 — Correctness + adoption _(current focus)_

Ship the boring reliability work:

- overlay skip on dev HTML
- reload-loop fixes
- HMR WebSocket relay
- CSP-aware injection
- compression without breaking `content-encoding`
- reserved hosts / rate-limit allow-lists
- dashboard loading reliability
- `shiplocal doctor`
- gather 5–10 real users

### v0.3 — Binary WebSocket frames

Replace base64-in-JSON for large payloads.

Measure with doctor before/after ([Part 21](/blog/binary-websocket-frames-vs-base64-in-json)).

### v0.4 — Caching

ETag / `304` / session asset cache for repeat loads ([Part 22](/blog/etag-304-and-session-caching-for-tunnels)).

Measure again.

### v0.5 — Streaming (conditional)

`response-start` / `chunk` / `response-end` is protocol v2.

Ship only if real users still hurt after v0.3–v0.4 ([Part 11](/blog/dont-stream-your-tunnel-yet-measure-first)).

---

## Why this order mirrors mature tunnel products

ngrok and Cloudflare Tunnel didn’t win by inventing streaming on day one.

They survived edge cases:

- weird WebSockets
- cookies / CORS
- CSP
- framework dev servers
- operator mistakes

ShipLocal is in that phase. The portfolio that “looked broken” taught more than a synthetic RPS chart.

---

## How to use this roadmap as a filter

When a shiny idea appears (“let’s rewrite the transport”), ask:

1. Does it unblock a beta user’s broken workflow?
2. Can we measure the win with `shiplocal doctor`?
3. Does it increase protocol complexity forever?

If (1) is no and (3) is yes, it waits.

---

## Related posts

- [Part 11 — Don't stream yet](/blog/dont-stream-your-tunnel-yet-measure-first)
- [Part 14 — `shiplocal doctor`](/blog/building-shiplocal-doctor)
- [Part 24 — Test real apps](/blog/test-real-apps-not-todo-list-demos)
