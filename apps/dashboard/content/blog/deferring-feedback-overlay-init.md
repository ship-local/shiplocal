---
title: Deferring Feedback Overlay Init with requestIdleCallback
subtitle: Don't compete with hydration for the main thread.
date: 2026-07-21
description: Appending overlay UI on `DOMContentLoaded` can delay framework hydration. Scheduling init on idle time reduces visible jank on tunneled previews.
series: ShipLocal build series
series_order: 25
---

_This article is coming soon._

**Coming soon.**

---

## What this article will cover

- What `overlay.js` does on init: styles, button, shadow DOM / fixed positioning
- Why tunnel latency already stresses hydration timelines
- Moving from immediate `init()` to `requestIdleCallback` with timeout fallback
- Tradeoffs: feedback button appears slightly later vs smoother app render
- When deferral is not enough (dev HTML — skip injection entirely)
