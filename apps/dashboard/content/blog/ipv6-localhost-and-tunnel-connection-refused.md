---
title: IPv6, localhost, and Tunnel Connection Refused
subtitle: Your browser works on localhost but the CLI cannot reach your dev server.
date: 2026-07-23
description: Trying `127.0.0.1` and `::1` — and why `next dev -H 0.0.0.0` shows up in tunnel error messages.
series: ShipLocal build series
series_order: 27
---

_This article is coming soon._

**Coming soon.**

---

## What this article will cover

- CLI loopback hosts: `127.0.0.1` and `::1`
- Dev servers that bind IPv6-only or unexpected interfaces
- The `ECONNREFUSED` 502 page users see through the tunnel
- Binding guidance for Next.js, Vite, and Docker-published ports
- `shiplocal doctor` local port check vs tunnel benchmark
