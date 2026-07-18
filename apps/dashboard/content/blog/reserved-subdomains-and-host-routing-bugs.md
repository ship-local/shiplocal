---
title: Reserved Subdomains and Host Routing Bugs
subtitle: When `app.shiplocal.cloud` is parsed as tunnel subdomain `app`.
date: 2026-07-12
description: Dashboard API traffic almost got proxied through the tunnel layer. Reserved names (`app`, `www`, `api`, `admin`) belong in routing rules, not the tunnel namespace.
series: ShipLocal build series
series_order: 16
---

ShipLocal serves many hosts on one domain family:

- `shiplocal.cloud` — marketing / API
- `app.shiplocal.cloud` — dashboard
- `*.shiplocal.cloud` — user tunnel previews

That wildcard is powerful.

It’s also a footgun.

This post is about the day we realized `app.shiplocal.cloud` could be parsed as tunnel subdomain `"app"` — and what we changed so product hosts never collide with preview routing.

---

## How tunnel host parsing works

Preview URLs look like:

```text
https://happy-lion.shiplocal.cloud
```

`parseTunnelHost()` extracts the left-most label:

```text
happy-lion
```

Then the server looks up a live tunnel session for that subdomain and proxies the request.

Simple. Until the hostname is also a product surface.

---

## The bug: product host becomes a tunnel name

Without a reserved list:

```text
app.shiplocal.cloud  →  subdomain "app"
www.shiplocal.cloud  →  subdomain "www"
api.shiplocal.cloud  →  subdomain "api"
```

Now imagine:

- a user (or leftover session) somehow owns/registers `app`
- or traffic meant for the dashboard hits the tunnel proxy path
- or rate-limit / routing logic treats dashboard requests like preview traffic

You get failures that look like “dashboard is down” while `/health` on the API is fine.

That’s how multi-tenant wildcards create **routing identity bugs**, not just DNS confusion.

---

## The fix: reserved tunnel subdomains

We reserve names that must never be treated as preview tunnels:

```ts
const RESERVED_TUNNEL_SUBDOMAINS = new Set(['app', 'www', 'api', 'admin']);
```

`parseTunnelHost('app.shiplocal.cloud', 'shiplocal.cloud')` now returns `null`.

Those hosts fall through to normal app/API routing instead of the tunnel proxy.

We also keep reserved project slugs / target names in the shared slug helpers so users can’t pick colliding identifiers in the product UI.

---

## Related hard boundaries

Reserved hosts are one layer. We also:

- Keep `/api/*` out of tunnel proxy behavior where it doesn’t belong
- Allow-list API/health/overlay paths in rate limiting so preview storms don’t starve the control plane ([Part 18](/blog/rate-limiting-vs-vite-module-storms))

Wildcards need **explicit denylists** for infrastructure names. Implicit “nobody would register `app`” is not a security or reliability strategy.

---

## Lessons for single-domain multi-tenant design

If you run:

```text
*.yourproduct.com
```

Ask early:

1. Which labels are product hosts forever? (`app`, `www`, `api`, `admin`, `docs`, `status`…)
2. Are those names blocked at registration **and** at request routing?
3. What happens if DNS points a reserved name at the tunnel edge by mistake?
4. Do rate limits and auth middleware key off host correctly?

The cheapest bug to prevent is the one where your own dashboard becomes a tunnel session.

---

## What we learned

Wildcard domains feel elegant until your control plane and data plane share a suffix.

Then every hostname is a routing decision.

Reserve the names you will regret losing — in code, with tests — before a user (or a misconfig) claims them.

---

## Related posts

- [Part 17 — Dashboard loading states](/blog/dashboard-loading-states-and-request-pile-ups)
- [Part 18 — Rate limiting vs Vite module storms](/blog/rate-limiting-vs-vite-module-storms)
- [How ShipLocal works under the hood](/blog/how-shiplocal-works-under-the-hood)
