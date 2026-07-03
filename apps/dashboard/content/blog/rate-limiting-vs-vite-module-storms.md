---
title: Rate Limiting vs Vite Module Storms
subtitle: A Next.js page load can fire dozens of requests — tunnel preview must not share the API bucket.
date: 2026-07-14
description: Global rate limits that treat tunnel traffic like API traffic will 429 your own preview. Allow-list tunnel paths and static assets.
series: ShipLocal build series
series_order: 18
---

_This article is coming soon._

**Coming soon.**

---

## What this article will cover

- Why Vite/webpack dev servers issue 50+ module requests per page load
- Fastify `rateLimit` global max and the tunnel preview footgun
- `allowList` for `/api/*`, `/health`, `/overlay.js`, and tunnel host patterns
- Separating control-plane API traffic from data-plane preview traffic
- Operational symptoms: random 429s, partial page loads, flaky HMR
