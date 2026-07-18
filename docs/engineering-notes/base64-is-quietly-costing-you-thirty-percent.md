---
title: Base64 Is Quietly Costing You Thirty Percent
subtitle: Payload math every tunnel builder should know.
date: 2026-07-19
description: 400 KB of JS becomes ~530 KB on the wire before JSON overhead. It adds up across dozens of chunks per page load.
series: ShipLocal build series
series_order: 23
---

Base64 is the encoding you reach for when you need binary in a text channel.

It’s also a quiet tax.

If your tunnel sends HTTP bodies as base64 inside JSON WebSocket messages, every large asset pays roughly:

```text
+33% size
+ encode CPU
+ decode CPU
+ giant intermediate strings
```

This post is the payload math behind [Part 10](/blog/when-html-is-fast-but-javascript-is-slow) and the reason v0.3 is binary frames ([Part 21](/blog/binary-websocket-frames-vs-base64-in-json)).

---

## The napkin math

Take a JS chunk:

```text
400 KB raw
↓
~533 KB base64
↓
plus JSON quotes/escaping/structure
↓
across the control WebSocket
```

Now multiply by the number of chunks Next serves on one page.

You didn’t get “a little overhead.” You got a systematic amplifier on the exact traffic pattern modern frameworks love: **many medium files**.

---

## Where time goes (profile before redesign)

When something feels slow, split:

| Phase       | Question                                   |
| ----------- | ------------------------------------------ |
| Network RTT | Is the control socket just far away?       |
| Buffering   | Waiting for localhost to finish the body?  |
| Encode      | base64 / JSON serialize cost?              |
| Decode      | server/CLI parse cost?                     |
| Compression | Are we winning bytes back after inflation? |

Compression can shrink the base64 payload’s underlying bytes — but you still encode/decode, and you still may buffer fully.

That’s why “we enabled brotli” can help and still leave hydration feeling late.

---

## When compression masks the tax

If doctor shows:

```text
Local JS: 412 KB
Tunnel JS: 148 KB (br)
```

great — wire savings are real.

If it also shows:

```text
JS slowdown vs local: 100x+
```

you still have per-request overhead and/or RTT amplification. Size is not the only bill.

---

## Why this article exists

Because “base64 is fine” is true for small control messages.

It becomes false for:

- JS bundles
- source maps
- images
- wasm
- repeated chunk graphs

Tunnel builders often discover this only after the first real Next.js app.

---

## What to do about it

Short term:

- compress non-HTML carefully ([Part 13](/blog/brotli-gzip-and-the-content-encoding-trap))
- don’t rewrite non-HTML ([Part 28](/blog/only-html-should-be-intercepted))
- measure with `shiplocal doctor` ([Part 14](/blog/building-shiplocal-doctor))

Next:

- binary frames (v0.3)
- caching (v0.4)
- streaming only if still needed (v0.5)

---

## Related posts

- [Part 10 — HTML fast, JS slow](/blog/when-html-is-fast-but-javascript-is-slow)
- [Part 21 — Binary frames](/blog/binary-websocket-frames-vs-base64-in-json)
- [Part 20 — Adoption before optimization](/blog/adoption-before-optimization-tunnel-roadmap)
