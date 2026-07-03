---
title: Reserved Subdomains and Host Routing Bugs
subtitle: When `app.shiplocal.cloud` is parsed as tunnel subdomain `app`.
date: 2026-07-12
description: Dashboard API traffic almost got proxied through the tunnel layer. Reserved names (`app`, `www`, `api`, `admin`) belong in routing rules, not the tunnel namespace.
series: ShipLocal build series
series_order: 16
---

_This article is coming soon._

**Coming soon.**

---

## What this article will cover

- How `parseTunnelHost()` maps `*.shiplocal.cloud` to tunnel sessions
- The production footgun: `app.shiplocal.cloud` → subdomain `"app"`
- Reserved subdomain list and why product hostnames must never collide with user tunnels
- Exempting `/api/*` from tunnel proxy and rate-limit buckets
- Lessons for multi-tenant URL design on a single wildcard domain
