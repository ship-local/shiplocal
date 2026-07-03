---
title: Don't Stream Your Tunnel Yet — Measure First
subtitle: Streaming is protocol v2. Adoption is the bigger unknown.
date: 2026-07-07
description: response-start/chunk/response-end sounds attractive, but binary frames, caching, and benchmarks deliver ROI without redesigning backpressure and cancellation.
series: ShipLocal build series
series_order: 11
---

_This article is coming soon._

**Coming soon.**

---

## What this article will cover

- Why “make the protocol faster” is the wrong first question for an early tunnel product
- The real unknown: do developers adopt the client-feedback workflow?
- Our version roadmap: v0.2 correctness → v0.3 binary frames → v0.4 ETag/304 → v0.5 streaming only if needed
- What streaming actually costs: backpressure, partial failures, binary framing, cancellation
- Phase 2 benchmark checklist (HTML, JS, WS, base64 overhead, buffer vs encode vs decode)
- Why ngrok and Cloudflare Tunnel matured through edge cases, not premature streaming
