---
title: Three Classes of Tunnel Bugs
subtitle: A field guide from one debugging week — hydration, reload loops, observer timing.
date: 2026-07-26
description: The debugging playbook we wish we had on day one: Network → JS, Network → WS, overlay injection, CSP, and measure before streaming.
series: ShipLocal build series
series_order: 30
---

_This article is coming soon._

**Coming soon.**

---

## What this article will cover

- **Class 1:** HTML fast, JS/hydration slow — buffering, base64, chunk count
- **Class 2:** Continuous reload — overlay + Fast Refresh, failed HMR WebSocket
- **Class 3:** Partial UI — IntersectionObserver / layout side effects
- Suspicion ranking (injection ★★★★★, reinjection ★★★★★, HMR ★★★★☆, compression ★★★★☆)
- DevTools filters: JS, WS, `webpack-hmr`
- When to run `shiplocal doctor` and what to paste in a GitHub issue
