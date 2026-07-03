---
title: Dashboard Loading States and Request Pile-Ups
subtitle: When `loading || fetching` never clears and `/api/tunnels` stacks up in Network.
date: 2026-07-13
description: A 5s poll without in-flight guards can leave the dashboard stuck on “Loading dashboard…” while hung fetches never resolve.
series: ShipLocal build series
series_order: 17
---

_This article is coming soon._

**Coming soon.**

---

## What this article will cover

- Symptom: dashboard stuck loading; API requests pending/repeating in DevTools
- `fetching` stuck on redirect paths and missing `?? []` on array data
- `loadInFlight` ref to prevent overlapping polls
- 15s fetch timeout in the dashboard API client
- Board layout crash: `Cannot read properties of undefined (reading 'length')`
- Distinguishing “API down” vs “client state bug” with `/health` vs dashboard UI
