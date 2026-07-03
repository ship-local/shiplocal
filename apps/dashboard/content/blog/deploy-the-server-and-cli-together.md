---
title: Deploy the Server and CLI Together
subtitle: Split releases break tunnels in subtle ways.
date: 2026-07-15
description: npm `shiplocal@0.1.5` on a laptop, production server on an older build, unpublished 0.1.6 — each mismatch surfaced a different class of bug.
series: ShipLocal build series
series_order: 19
---

_This article is coming soon._

**Coming soon.**

---

## What this article will cover

- Global npm install vs monorepo `cloud/main` vs VPS deploy drift
- `content-encoding` header mismatch when only one side compresses
- WebSocket HMR relay requiring both protocol changes on server and CLI
- npm publish 401 and why users stayed on old CLI versions
- Checklist: migrate-prod, rebuild dashboard, `npm install -g shiplocal@x.y.z`
- Treating server + CLI as a coupled release unit
