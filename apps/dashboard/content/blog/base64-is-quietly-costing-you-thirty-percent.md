---
title: Base64 Is Quietly Costing You Thirty Percent
subtitle: Payload math every tunnel builder should know.
date: 2026-07-19
description: 400 KB of JS becomes ~530 KB on the wire before JSON overhead. It adds up across dozens of chunks per page load.
series: ShipLocal build series
series_order: 23
---

_This article is coming soon._

**Coming soon.**

---

## What this article will cover

- Base64 encoding overhead and why it matters at tunnel scale
- JSON wrapping of large bodies on WebSocket control channels
- Profiling: buffer time vs encode vs decode vs network RTT
- When compression compensates for inflation — and when it does not
- Why this article pairs with the binary-frames and doctor posts
