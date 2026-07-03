---
title: Framer Motion, IntersectionObserver, and Tunnel Side Effects
subtitle: Section headers lagging behind body text is often hydration — not a broken observer.
date: 2026-07-11
description: `useInView` with negative margin never fires if layout shifts or JS arrives late. Overlay injection and slow chunks make it worse.
series: ShipLocal build series
series_order: 15
---

_This article is coming soon._

**Coming soon.**

---

## What this article will cover

- The portfolio symptom: `motion.header` invisible while children render
- `const isInView = useInView(ref, { once: true, margin: "-80px" })` and timing sensitivity
- The `isInView = true` debugging trick and what a positive result means
- How fixed overlay UI and deferred `requestIdleCallback` init reduce competition with hydration
- Why this is a side effect of slow JS through the tunnel, not ShipLocal “breaking Framer Motion”
- When to fix the app vs when to fix the tunnel protocol
