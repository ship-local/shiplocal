---
title: Brotli, Gzip, and the content-encoding Trap
subtitle: Compress on the CLI leg — but only if the server preserves the header end-to-end.
date: 2026-07-09
description: Stripping `content-encoding` on the server while the CLI sets `gzip` or `br` breaks JS delivery. Server and CLI must ship together.
series: ShipLocal build series
series_order: 13
---

_This article is coming soon._

**Coming soon.**

---

## What this article will cover

- Why we compress compressible assets on the CLI→server leg (not HTML — injection needs plain text)
- Excluding `text/html` from `maybeCompressResponse`
- The bug when an old server stripped `content-encoding` and browsers got garbage JS
- `Accept-Encoding`, `Vary`, and stripping `ETag` on recompression
- Benchmarking `compress → base64` vs `base64 → compress` on the WebSocket leg
- Deploy discipline: CLI 0.1.6+ and server must roll out as a pair
