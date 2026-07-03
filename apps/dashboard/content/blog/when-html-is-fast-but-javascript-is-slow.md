---
title: When HTML Is Fast but JavaScript Is Slow
subtitle: The tunnel buffers every asset through WebSocket JSON + base64 — hydration waits.
date: 2026-07-06
description: Navbar and text appear immediately; Framer Motion heroes lag. That is not slow SSR — it is delayed JS bundles over a fully buffered tunnel path.
series: ShipLocal build series
series_order: 10
---

_This article is coming soon._

**Coming soon.**

---

## What this article will cover

- The request path: Browser → Server → WebSocket JSON+base64 → CLI → localhost → buffer entire body → return
- Why dozens of `_next/static/chunks/*` requests each pay encode/decode tax
- Base64 inflation (~33%) on top of JSON stringify/parse
- Why compression helps bandwidth but not per-chunk latency
- Framer Motion's `opacity: 0` until hydrate — tunnel slowness makes it visible
- `useInView` / IntersectionObserver as a side effect, not the primary bug
- What we measured with `shiplocal doctor` (local vs tunnel HTML/JS timings)
