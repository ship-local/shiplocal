---
title: ETag, 304, and Session Caching for Tunnels
subtitle: Repeat page loads should not re-walk the entire tunnel for `main.js`.
date: 2026-07-18
description: Next dev serves dozens of chunks that barely change. CLI-side ETag/Last-Modified memory per tunnel session is the v0.4 bet.
series: ShipLocal build series
series_order: 22
---

_This article is coming soon._

**Coming soon.**

---

## What this article will cover

- Why every refresh currently re-fetches every chunk through the tunnel
- `304 Not Modified` traveling instead of another 500 KB bundle
- Session-scoped cache for fonts, images, favicons
- `Cache-Control` from localhost vs what the proxy should preserve
- Interaction with compression and HTML injection (HTML stays uncached/modified)
- Measuring again after shipping — when caching is not enough
