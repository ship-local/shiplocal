---
title: Only HTML Should Be Intercepted
subtitle: Pipe JS, CSS, fonts, and images — do not buffer and rewrite everything.
date: 2026-07-24
description: A tunnel performance rule we re-learned: modify HTML for product features; stream everything else untouched.
series: ShipLocal build series
series_order: 28
---

_This article is coming soon._

**Coming soon.**

---

## What this article will cover

- Anti-pattern: `await response.text()` on every asset to “maybe rewrite”
- What ShipLocal still buffers today (honest architecture note)
- Why HTML needs interception (overlay injection, cookie/CORS rewrite on HTML responses)
- Long-term direction: streaming pass-through for non-HTML
- Checklist for tunnel builders reviewing their proxy pipeline
