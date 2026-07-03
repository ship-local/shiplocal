---
title: Building `shiplocal doctor` for Tunnel Diagnostics
subtitle: Pasteable output beats guessing when someone says “the tunnel is slow.”
date: 2026-07-10
description: A CLI command that checks API health, auth, WebSocket handshake, local vs tunnel transfer times, compression, and HMR connectivity.
series: ShipLocal build series
series_order: 14
---

_This article is coming soon._

**Coming soon.**

---

## What this article will cover

- Why tunnel products need a first-class diagnostic command (`doctor` / `benchmark` alias)
- Checks: `/health`, `/api/tunnels` auth, WebSocket handshake to `/tunnel`
- Temporary tunnel registration for end-to-end benchmarks
- Comparing local HTML/JS vs public URL transfer (slowdown multipliers)
- Probing `/_next/webpack-hmr` through the preview domain
- `--json` for CI and support tickets
- Example pasteable output and how we use it before v0.3 protocol work
