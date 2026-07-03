---
title: Binary WebSocket Frames vs Base64-in-JSON
subtitle: The likely biggest win in v0.3 without streaming the world.
date: 2026-07-17
description: Every JS chunk currently pays JSON stringify, base64 encode, decode, and parse. Binary frames on the control socket are the measured next step.
series: ShipLocal build series
series_order: 21
---

_This article is coming soon._

**Coming soon.**

---

## What this article will cover

- Current path: `Buffer` → base64 string → JSON → WebSocket → parse → decode
- ~33% base64 inflation on large payloads
- Why binary frames are simpler than full response streaming
- Backward compatibility and version negotiation ideas
- Before/after benchmarks we plan to capture with `shiplocal doctor`
- What stays buffered (for now) vs what gets cheaper to move
