---
title: The Feedback Overlay Reload Loop We Didn't See Coming
subtitle: Injecting a `<script>` into every HTML response can fight Next.js Fast Refresh.
date: 2026-07-04
description: ShipLocal injects a client feedback overlay into proxied HTML. On Next.js dev pages, that innocent DOM change can trigger reload → reinject → reload forever.
series: ShipLocal build series
series_order: 8
---

_This article is coming soon._

**Coming soon.**

---

## What this article will cover

- How Cloud edition injects `overlay.js` before `</body>` on every uncompressed HTML 2xx response
- Why Next dev interprets injected markup as a page change (Fast Refresh / full reload)
- The reinjection loop: inject → reload → inject again
- Why `defer` and `requestIdleCallback` help but don't fix dev HTML
- The fix: detect dev bundler markers (`webpack-hmr`, `@vite/client`, `__turbopack`) and skip injection
- Deduping with `data-shiplocal-overlay` so production previews still get feedback
