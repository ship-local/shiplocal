---
title: Rate Limiting vs Vite Module Storms
subtitle: A Next.js page load can fire dozens of requests — tunnel preview must not share the API bucket.
date: 2026-07-14
description: Global rate limits that treat tunnel traffic like API traffic will 429 your own preview. Allow-list tunnel paths and static assets.
series: ShipLocal build series
series_order: 18
---

A global rate limit feels like responsible ops.

Until someone opens a Next.js or Vite app through your tunnel.

Then one page load fires **dozens** of module requests in a burst:

```text
/_next/static/chunks/...
/@fs/...
/@vite/client
...
```

If those share the same bucket as `/api/auth/login`, you 429 your own product.

This post is that footgun — and how ShipLocal separates control-plane API traffic from data-plane preview traffic.

---

## The symptom

Through a tunnel:

- Partial page loads
- Random `429 Too Many Requests`
- Flaky HMR / missing chunks
- “It works if I refresh slowly”

Locally, the same app is fine.

That pattern often isn’t the framework. It’s your edge rate limiter treating a preview like an API abuse spike.

---

## Why module storms happen

Dev servers are chatty by design:

- code-split chunks
- CSS modules
- source maps
- HMR clients
- on-demand compiles

A single refresh can exceed a naive `max: 200 / minute` global limit — especially with multiple tabs or clients.

Production builds are quieter. Dev previews through tunnels are not.

---

## The ShipLocal approach

We use `@fastify/rate-limit` globally, then **allow-list** traffic that must not share the API abuse bucket:

- `/api/*` (handled with its own route limits where needed)
- `/health`
- `/overlay.js` (and related static overlay assets)
- Requests whose `Host` parses as a tunnel preview subdomain
- Path-based tunnel previews (`/t/...`)

Preview traffic still needs safeguards (body size limits, timeouts, auth on the tunnel itself). It should not compete with dashboard login for the same counter.

---

## Control plane vs data plane

Think of two planes:

| Plane         | Examples                        | Rate-limit goal              |
| ------------- | ------------------------------- | ---------------------------- |
| Control plane | auth, projects, tunnel CRUD     | Stop abuse / credential spam |
| Data plane    | preview HTML/JS/CSS/WS upgrades | Stay out of the way          |

Mixing them is how you invent “random 429s on happy-lion.shiplocal.cloud.”

---

## Operational checklist

If previews look flaky in production:

1. Check response status for `429`
2. Confirm rate-limit keys (IP? host? route?)
3. Verify tunnel hosts are allow-listed
4. Separately protect expensive API routes
5. Don’t “fix” flaky HMR by raising the global max forever — fix the classification

Related: reserved hosts must not be treated as tunnels either ([Part 16](/blog/reserved-subdomains-and-host-routing-bugs)).

---

## What we learned

Rate limits are a product surface.

If your tunnel’s job is to front chatty apps, a single global bucket will eventually punish legitimate preview traffic.

Allow-list the data plane. Rate-limit the control plane with intent.

---

## Related posts

- [Part 9 — HMR WebSockets](/blog/proxying-webpack-hmr-over-a-tunnel)
- [Part 16 — Reserved subdomains](/blog/reserved-subdomains-and-host-routing-bugs)
- [Part 10 — HTML fast, JS slow](/blog/when-html-is-fast-but-javascript-is-slow)
