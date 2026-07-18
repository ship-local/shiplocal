---
title: Binary WebSocket Frames vs Base64-in-JSON
subtitle: The likely biggest win in v0.3 without streaming the world.
date: 2026-07-17
description: Every JS chunk currently pays JSON stringify, base64 encode, decode, and parse. Binary frames on the control socket are the measured next step.
series: ShipLocal build series
series_order: 21
---

ShipLocal’s control socket currently moves many HTTP bodies like this:

```text
Buffer
↓
base64 string
↓
JSON message
↓
WebSocket text frame
↓
JSON parse
↓
base64 decode
↓
bytes for the browser
```

That path is simple and debuggable.

It is also expensive — especially when Next.js asks for dozens of JS chunks.

This post is why **binary WebSocket frames** are the v0.3 bet: a large win without redesigning streaming.

---

## What hurts today

On every large asset you roughly pay:

1. base64 inflation (~33% more bytes) — [Part 23](/blog/base64-is-quietly-costing-you-thirty-percent)
2. JSON stringify/parse CPU
3. extra memory churn for huge strings
4. still-full buffering (binary frames don’t magically stream)

Compression helps (1) but does not remove (2)–(4).

---

## Why binary frames are simpler than streaming

Streaming means a new response lifecycle:

```text
response-start → chunk × N → response-end
```

Plus backpressure, cancellation, and partial failure design ([Part 11](/blog/dont-stream-your-tunnel-yet-measure-first)).

Binary frames can keep **one complete response per message** (or a small framed envelope) while avoiding base64-in-JSON for the body.

You still buffer for now — but you stop paying the encode tax on every chunk.

That’s a better ROI for an early tunnel than protocol v2.

---

## Compatibility sketch

Any binary control-plane change needs:

- version negotiation (old CLI ↔ new server)
- a clear envelope (message type + request id + headers + body bytes)
- safe fallback to JSON for small control messages (`ping`, `registered`, errors)

Don’t break `shiplocal@old` overnight. Coupled releases still matter ([Part 13](/blog/brotli-gzip-and-the-content-encoding-trap)).

---

## How we’ll know it worked

Before/after with:

```bash
shiplocal doctor --port 3000
```

Watch:

- Tunnel JS sample time
- JS slowdown vs local
- whether WARN thresholds still trip

If binary frames don’t move those numbers, don’t congratulate the architecture — dig into buffering and request count next.

---

## What stays true after v0.3

- HTML interception rules stay ([Part 28](/blog/only-html-should-be-intercepted))
- Caching can still remove repeat transfers ([Part 22](/blog/etag-304-and-session-caching-for-tunnels))
- Streaming remains conditional (v0.5)

Binary frames are not the end of performance work. They’re the next measured step.

---

## Related posts

- [Part 10 — HTML fast, JS slow](/blog/when-html-is-fast-but-javascript-is-slow)
- [Part 20 — Adoption before optimization](/blog/adoption-before-optimization-tunnel-roadmap)
- [Part 23 — Base64’s 30% tax](/blog/base64-is-quietly-costing-you-thirty-percent)
