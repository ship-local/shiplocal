---
title: ETag, 304, and Session Caching for Tunnels
subtitle: Repeat page loads should not re-walk the entire tunnel for `main.js`.
date: 2026-07-18
description: Next dev serves dozens of chunks that barely change. CLI-side ETag/Last-Modified memory per tunnel session is the v0.4 bet.
series: ShipLocal build series
series_order: 22
---

Open a Next app through a tunnel. Refresh.

Then refresh again.

Today, many of those JS/CSS/font requests still walk the full path:

```text
browser → server → CLI → localhost → buffer → encode → return
```

Even when the bytes did not change.

That’s why v0.4 is caching — not because caching is fashionable, but because repeat loads are where tunnels feel needlessly expensive.

---

## The bet

Per tunnel session, remember validators from localhost responses:

- `ETag`
- `Last-Modified`
- useful `Cache-Control` signals

On repeat requests, prefer:

```text
304 Not Modified
```

over re-sending a 400 KB chunk through base64/JSON.

Also cache truly static session assets when safe:

- favicons
- fonts
- images that don’t change during a review session

---

## Why this pairs with v0.3

Binary frames ([Part 21](/blog/binary-websocket-frames-vs-base64-in-json)) make each transfer cheaper.

Caching makes many transfers **unnecessary**.

If doctor still shows painful first-load JS after binary frames, caching won’t fix first paint — but it will fix the “every refresh feels like the first refresh” problem reviewers hit constantly.

---

## Hard parts (so we don’t ship a footgun)

### HTML

HTML is often modified (overlay injection). Don’t casually cache injected HTML as if it were origin-pure.

### Compressed bodies

Validators must match the body variant you store. Recompression without stripping/updating `ETag` lies ([Part 13](/blog/brotli-gzip-and-the-content-encoding-trap)).

### Auth / personalized responses

Cache only what is safe for that tunnel session. Preview URLs can still be sensitive.

### Dev vs production builds

Dev chunks change often; production builds change less. Session TTL and invalidation matter.

---

## Measure again after shipping

```bash
shiplocal doctor
```

Compare:

1. cold load through tunnel
2. warm reload through tunnel

If warm reload still re-downloads every chunk at full cost, caching isn’t working.

Only if warm **and** cold loads still fail real users should we prioritize streaming (v0.5).

---

## What we learned

Tunnel performance is not only “first byte of the first visit.”

Client review workflows are full of reloads.

Making the second load cheap is often the difference between “usable” and “I’ll just deploy staging.”

---

## Related posts

- [Part 11 — Don't stream yet](/blog/dont-stream-your-tunnel-yet-measure-first)
- [Part 20 — Roadmap](/blog/adoption-before-optimization-tunnel-roadmap)
- [Part 21 — Binary frames](/blog/binary-websocket-frames-vs-base64-in-json)
