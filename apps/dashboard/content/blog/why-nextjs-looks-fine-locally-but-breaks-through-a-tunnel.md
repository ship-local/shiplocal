---
title: Why Next.js Looks Fine Locally but Breaks Through a Tunnel
subtitle: Three problem classes we found testing a real Framer Motion portfolio — not a todo-list demo.
date: 2026-07-03
description: Navbar appears instantly, hero animations lag, section headers never fire — and another app reloads forever. Same tunnel, three different root causes.
series: ShipLocal build series
series_order: 7
---

_This article is coming soon._

**Coming soon** — we're writing up the full post-mortem from testing real Next.js apps through ShipLocal.

---

## What this article will cover

- The symptom split: static HTML fast, Framer Motion / `useInView` slow, full-page reload loops on a second app
- Why that pattern points away from “slow HTML delivery” and toward hydration, HMR, and injection side effects
- How we reproduced it with a production-grade portfolio (not a starter template)
- A decision tree for tunnel products debugging client-side frameworks
- Links to the deeper dives on overlay injection, WebSocket HMR, and protocol buffering
