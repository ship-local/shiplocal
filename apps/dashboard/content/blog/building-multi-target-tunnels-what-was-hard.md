---
title: Building Multi-Target Tunnels — What Was Harder Than We Expected
subtitle: Flat subdomains, proxy-layer CORS, and the gap between one tunnel and a full-stack graph.
date: 2026-06-29
description: Coordinated frontend + API preview URLs sound simple. The scars are in TLS wildcard limits, CORS placement, reconnect semantics, legacy migration, and knowing when not to show every historical tunnel row.
series: ShipLocal build series
series_order: 6
---

_Article 6 in the ShipLocal build series — engineering lessons from v0.2._

The [product story](/blog/full-stack-previews-multiple-tunnel-targets) for multi-target tunnels is clean:

```bash
shiplocal 3000 --project myapp
shiplocal 4000 --project myapp --name api
```

Two terminals. Two URLs. Full-stack preview.

Building it was not clean. The tunnel forwarder was already done. Everything around **naming**, **browser security**, **state reuse**, and **backwards compatibility** was where the time went.

This article is those scars, in order.

---

## Decision #1: Nested subdomains vs flat ones

The obvious URL design looks like this:

```text
https://myapp.shiplocal.cloud          → frontend
https://api.myapp.shiplocal.cloud      → backend
```

Pretty. Familiar. Reads like a real deployment.

We did not ship it — because our TLS setup uses a **single-level wildcard**:

```text
*.shiplocal.cloud
```

That certificate covers `myapp.shiplocal.cloud`. It does **not** cover `api.myapp.shiplocal.cloud`. Nested subdomains need on-demand TLS or per-project wildcard certs — doable, but not free on day one of the feature.

We chose **flat subdomains**:

```text
https://myapp.shiplocal.cloud
https://myapp-api.shiplocal.cloud
```

Same information. One label. Works with the Caddy + Cloudflare wildcard we already run in production.

**Lesson:** Infrastructure constraints are product constraints. The CLI examples in the issue tracker said `api.myapp.*`; what shipped is `myapp-api.*`. Document the real URLs, not the ideal ones.

---

## Decision #2: CORS belongs in the tunnel proxy, not `@fastify/cors`

Our API server already registers `@fastify/cors` for dashboard routes like `/api/projects` and `/api/tunnels`.

User app traffic does not hit those routes. It hits the **catch-all tunnel proxy** — the handler that forwards `GET /users` from `myapp-api.shiplocal.cloud` to your local Fastify instance.

So when a browser on `myapp.shiplocal.cloud` fetches `myapp-api.shiplocal.cloud/session`, the preflight `OPTIONS` request goes through the tunnel proxy too. The Fastify CORS plugin never sees it.

Fix: inject CORS in the proxy layer when:

1. The request has an `Origin` header, and
2. That origin matches **another tunnel in the same project** (a sibling target)

We respond to `OPTIONS` at the proxy with `204` and the right `Access-Control-Allow-*` headers. For other methods, we append CORS headers to the proxied response.

We deliberately **do not** add CORS for arbitrary origins. Every tunnel is a potential open proxy if you get that wrong.

**Lesson:** In a platform with two HTTP surfaces (platform API vs user preview traffic), middleware placement is architecture. "We have CORS enabled" is not the same as "CORS works for split previews."

---

## Decision #3: Cookie domains die on preview hostnames

Split tunnels often break **after** CORS — at login.

Your API sets:

```http
Set-Cookie: session=abc; Domain=localhost; Path=/; HttpOnly
```

On `myapp-api.shiplocal.cloud`, the browser rejects or ignores that cookie because `localhost` is not the preview hostname.

Fix: rewrite `Set-Cookie` in the proxy response — replace `Domain=localhost` / `Domain=127.0.0.1` with the preview host, and add `Secure` on HTTPS previews.

This is not a substitute for configuring your auth library correctly in production. It is a **preview convenience** so demos do not fail for a reason the client will never understand.

---

## Bug we had to fix: reconnect created duplicate tunnels

The v0.1 CLI auto-reconnects when the WebSocket drops. Good for flaky Wi‑Fi. Bad for database hygiene.

On reconnect, the CLI sent a fresh `register` message. The server created a **new** tunnel row and a **new** random subdomain every time. The dashboard filled with zombies. "Stop tunnel" felt broken because reconnect respawned a different URL seconds later.

Multi-target made this worse — you might have two CLIs reconnecting independently.

Fix: persist `tunnelId` in `~/.shiplocal/config.json` and send it on reconnect. The server reuses the existing row, subdomain, and target name. Same public URL after a network blip.

This was the same **control plane vs data plane** lesson from [article 2](/blog/the-hard-part-isnt-the-tunnel): the data plane (HTTP over WebSocket) was solid; session lifecycle needed explicit protocol design.

---

## Schema: one row per target, not one row per socket

We added:

- `Project.slug` — globally unique URL identifier
- `Tunnel.name` — target label within a project (`web`, `api`, …)
- `@@unique([projectId, name])` — one target name per project

A **target** is a logical service (frontend, API). A **session** is a live WebSocket attached to that target. Separating them let us:

- Reconnect without new subdomains
- Reuse an offline target row when you run the CLI again
- Reject a second live session for the same target with a clear error

Migration backfill was its own exercise: existing projects got slugs from their names; existing tunnels got `web`, `target-2`, `target-3`, … while **keeping** their old random subdomains so nothing 404'd mid-demo.

---

## Legacy mode vs coordinated mode

Not every user wants project slugs. Single-port demos should stay one command:

```bash
shiplocal 3000
```

So we split behavior:

|              | Legacy (`shiplocal 3000`) | Coordinated (`--project myapp`) |
| ------------ | ------------------------- | ------------------------------- |
| Subdomain    | Random (`bright-panda`)   | `{slug}` or `{slug}-{name}`     |
| Target name  | Internal `legacy-{id}`    | `web`, `api`, …                 |
| Sibling list | Still shown (see below)   | Meaningful                      |

Legacy mode attaches to the user's default project (`my-demo-site`). Every old v0.1 tunnel also lives there. That caused real confusion in testing:

```text
Other targets in this project:
  web: https://bright-owl.shiplocal.cloud (port 3000)
  target-2: https://witty-tiger.shiplocal.cloud (port 3000)
  …
```

Only **one** tunnel was live. The list was **every historical row in the database** for that project — not "ports you opened right now."

We should tighten that UX (online-only siblings, hide legacy names, or skip the list in legacy mode). The feature shipped; the output still tells the truth too loudly.

**Lesson:** Backwards compatibility is a UX surface. Migration data shows up in CLI output whether you want it or not.

---

## Global slug uniqueness

Project slugs are **global**, not per-user. Two developers cannot both claim `myapp`.

For MVP that is acceptable — slugs are unguessable enough when you use real project names, and collisions are rare in practice. For teams it will eventually need namespaces or org prefixes.

We documented collision behavior rather than building custom-domain tier logic now.

---

## `--rewrite-env`: helpful, bounded

Developers forget to swap env vars. We added a helper that scans `.env`, `.env.local`, and `.env.development` for common keys (`NEXT_PUBLIC_*`, `VITE_*`, `API_URL`, …) pointing at `localhost:<port>`.

Default: **suggest** a diff. With `--rewrite-env`: write changes and backup to `.env.shiplocal.bak`.

We did not auto-rewrite without a flag. Silent file mutation from a tunnel CLI would erode trust fast.

Matching is port-based, not AST-based. Good enough for demos; not a full env management product.

---

## What we would do differently

1. **Ship flat URLs in the issue template from day one** — saves a design debate later.
2. **Filter sibling output to online coordinated targets only** — before users see migration noise.
3. **Add `--project` to the default quickstart earlier** — once two ports is a first-class story, hide it behind optional flags less.
4. **Integration test: browser fetch across sibling origins** — unit tests for CORS header parsing are not enough; one Playwright test would catch regressions.

---

## What is still hard (on purpose)

Multi-target fixes **sibling** CORS and cookies. It does not fix:

- External APIs that block `*.shiplocal.cloud`
- Apps that hardcode absolute localhost in source (not env)
- WebSocket-heavy realtime (upgrade path is separate roadmap work)
- Single-URL aesthetics (`myapp.shiplocal.cloud/api/*` → path routing)

We shipped the graph edge that unblocks the most agency demos. The rest stays on [ROADMAP.md](https://github.com/ship-local/shiplocal/blob/main/ROADMAP.md).

---

## Summary

| Area       | Hard part                                                             |
| ---------- | --------------------------------------------------------------------- |
| URLs       | Wildcard TLS → flat subdomains                                        |
| Browser    | CORS + cookies in proxy, not platform middleware                      |
| State      | Reconnect must reuse `tunnelId`, not create rows                      |
| Data model | Target ≠ session; migration must not break old URLs                   |
| UX         | Legacy project accumulates history; CLI must not imply it is all live |

The tunnel forwarder is still ~200 lines of boring JSON over WebSocket. v0.2 is the proof that **product features live at the boundaries** — naming, browser security, persistence, and the stories your CLI prints when someone runs `shiplocal 3002` without reading the docs.

Try the shipped feature:

```bash
shiplocal 3000 --project myapp
shiplocal 4000 --project myapp --name api
```

Read the announcement: [Full-Stack Previews Are Here](/blog/full-stack-previews-multiple-tunnel-targets).

Open source: [github.com/ship-local/shiplocal](https://github.com/ship-local/shiplocal).
