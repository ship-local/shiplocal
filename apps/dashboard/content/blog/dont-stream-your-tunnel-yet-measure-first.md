---
title: Don't Stream Your Tunnel Yet — Measure First
subtitle: Streaming is protocol v2. Adoption is the bigger unknown.
date: 2026-07-07
description: response-start/chunk/response-end sounds attractive, but binary frames, caching, and benchmarks deliver ROI without redesigning backpressure and cancellation.
series: ShipLocal build series
series_order: 11
---

After [Part 10](/blog/when-html-is-fast-but-javascript-is-slow), the temptation is obvious:

> “Just stream the responses. That’ll fix slow JS.”

Maybe. Eventually.

But if ShipLocal were my startup tomorrow morning, I would **not** jump to streaming yet.

This post is why — and what we would do instead.

---

## The wrong first question

When a tunnel feels slow, engineers ask:

> Can the protocol be faster?

The more important early question is:

> Do developers actually want this workflow enough to adopt it?

ShipLocal’s wedge is not “faster than ngrok.” It’s:

- share localhost with a client,
- collect visual feedback,
- skip the staging deploy dance.

If that loop doesn’t get used, a streaming protocol won’t save the product.

Correctness and adoption come before protocol v2.

---

## What streaming actually means

Today ShipLocal’s HTTP path is roughly:

```text
one complete response
(buffer → encode → send → decode)
```

Streaming redesigns it into:

```text
response-start
chunk
chunk
chunk
response-end
```

That sounds simple. It isn’t.

You now own:

- backpressure
- partial failures mid-response
- cancellation when the browser aborts
- timeout semantics for incomplete streams
- binary framing (or worse, chunked base64)
- disconnect recovery

It’s a forever change to the tunnel protocol — not a weekend optimization.

Treat it as **protocol v2**, not the next sprint.

---

## What we ship instead (measured roadmap)

### v0.2 — Correctness + adoption _(where we are)_

- Overlay skip on next/vite dev HTML
- Reload-loop fixes
- HMR WebSocket relay
- CSP-aware injection skip
- `shiplocal doctor`
- Beta users

### v0.3 — Binary WebSocket frames

Replace base64-in-JSON for large payloads.

Measure before/after with `shiplocal doctor`:

- JS transfer time
- compression ratio
- encode/decode overhead

### v0.4 — Caching

- ETag / `Last-Modified` / `304`
- Session cache for stable assets (fonts, images, rarely changing chunks)

Measure again.

### v0.5 — Streaming (conditional)

Only if real users still hit unacceptable latency after v0.3–v0.4.

---

## Measure before you redesign

Before changing architecture, record:

| Metric                     | Why it matters                      |
| -------------------------- | ----------------------------------- |
| HTML latency               | SSR shell feel                      |
| JS chunk latency           | Hydration delay                     |
| Image/font latency         | “Is everything slow?” vs “just JS?” |
| WebSocket RTT              | Control plane health                |
| HMR stability              | Dev workflow correctness            |
| Base64 overhead            | How much encode tax you’re paying   |
| Buffer vs encode vs decode | Where time actually goes            |

If you can’t answer those questions, you don’t know whether streaming is the bottleneck — or whether ETag/`304` would remove most of the pain on repeat loads.

---

## Why this discipline matters for tunnel products

ngrok and Cloudflare Tunnel didn’t mature by inventing the perfect protocol on day one. They matured by surviving real apps: Next.js, Vite, HMR, CSP, weird cookies, weird WebSockets.

ShipLocal is in that phase.

The portfolio that “looked broken” taught us more than a synthetic benchmark suite would have. That’s the work. Streaming is optional until the measurements say otherwise.

---

## Practical takeaway

If you’re building a tunnel (or debugging ShipLocal):

1. Fix correctness first (reload loops, HMR, injection)
2. Add diagnostics (`shiplocal doctor`)
3. Optimize the current protocol with high-ROI changes (binary frames, caching)
4. Stream only when data from real users demands it

Speed is a feature. Premature protocol rewrites are a product risk.

---

## Related posts

- [Part 10 — When HTML Is Fast but JavaScript Is Slow](/blog/when-html-is-fast-but-javascript-is-slow)
- [Part 14 — Building `shiplocal doctor`](/blog/building-shiplocal-doctor)
- [Part 30 — Three Classes of Tunnel Bugs](/blog/three-classes-of-tunnel-bugs)
- [Part 14 — `shiplocal doctor`](/blog/building-shiplocal-doctor)
- [Part 24 — Test real apps, not todo-list demos](/blog/test-real-apps-not-todo-list-demos)
