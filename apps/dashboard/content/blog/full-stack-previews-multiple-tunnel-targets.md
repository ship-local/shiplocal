---
title: Full-Stack Previews Are Here — Multiple Tunnel Targets per Project
subtitle: One project, two URLs, no staging deploy for the API.
date: 2026-06-28
description: ShipLocal v0.2 lets you expose frontend and API on coordinated preview URLs under one project — with CORS, cookie fixes, and a CLI env rewrite helper. Here is why that matters and how to use it.
series: ShipLocal build series
series_order: 5
---

_Article 5 in the ShipLocal build series — what we just shipped and why._

For most of ShipLocal's first release, the story was simple:

```bash
shiplocal 3000
```

You got one public URL. Your client opened it. You collected feedback on the live preview. That loop worked well for marketing sites, dashboards, and single-process apps.

Then real projects showed up — the ones with a **frontend on :3000** and an **API on :4000**. And the same broken workflow appeared again:

> "The page loads, but login doesn't work."

Because the browser on the preview URL cannot reach `localhost:4000` on **your** laptop. That address only exists on your machine.

We set out to fix that without asking every team to deploy staging just to demo full-stack work. **v0.2 is the first piece of that answer.**

---

## What we shipped

You can now group multiple tunnels under one **project** with predictable URLs:

```bash
# Terminal 1 — frontend
shiplocal 3000 --project myapp

# Terminal 2 — API
shiplocal 4000 --project myapp --name api
```

That gives you:

```text
https://myapp.shiplocal.cloud       → localhost:3000
https://myapp-api.shiplocal.cloud   → localhost:4000
```

Same project. Two processes. Two public URLs. No random animal names to juggle.

Along with coordinated URLs, v0.2 includes:

| Piece                            | What it does                                                                                |
| -------------------------------- | ------------------------------------------------------------------------------------------- |
| **Project slugs + target names** | Stable naming (`web`, `api`, …) instead of one tunnel = one random subdomain                |
| **Sibling CORS**                 | Browser requests from the frontend preview to the API preview get CORS headers at the proxy |
| **Cookie domain rewrite**        | `Set-Cookie: Domain=localhost` from your API is rewritten for the preview hostname          |
| **`--rewrite-env`**              | CLI helper that suggests or applies `.env` updates when tunnel URLs are created             |
| **Reconnect reuse**              | Restarting the CLI reuses the same tunnel row and public URL instead of spawning duplicates |

This is **Core** work — it helps self-hosters and Cloud users alike.

---

## Why this matters

### The localhost trap is really a graph problem

A full-stack app is not one port. It is a small graph:

```text
Browser → frontend (:3000) → API (:4000) → database
```

A single tunnel only bridges **one edge** of that graph. The browser still tries to call `http://localhost:4000` because that is what your `.env` says.

Traditional fixes:

1. **Deploy staging** — works, but slow and expensive for a design review
2. **Dev-server proxy** — works if everything is relative and your bundler proxies `/api`
3. **Second tunnel + manual env swap** — works, but easy to forget and painful for clients

Option 3 was always possible in ShipLocal (run two CLIs, get two random URLs). What was missing was **coordination**: names that make sense, CORS that works across sibling previews, and tooling that nudges your env vars in the right direction.

### Agencies live in the two-URL world

Freelancers and agencies demo **whole products**, not just landing pages. The client needs to click through auth, forms, and dashboards — flows that hit a real backend.

With multi-target tunnels:

- You share **one frontend URL** with the client (the one in the feedback overlay)
- You point `NEXT_PUBLIC_API_URL` (or equivalent) at the **API tunnel URL**
- The preview behaves much closer to production — without a deploy

That is the workflow we wanted from day one. v0.1 proved the tunnel loop. v0.2 makes it credible for Next.js + API, Vite + Fastify, and similar stacks.

---

## How to use it

### Basic two-process setup

```bash
shiplocal login

shiplocal 3000 --project portfolio
shiplocal 4000 --project portfolio --name api
```

Set your frontend env:

```env
NEXT_PUBLIC_API_URL=https://portfolio-api.shiplocal.cloud
```

Or let the CLI suggest changes:

```bash
shiplocal 4000 --project portfolio --name api --rewrite-env
```

### Naming rules

- **`--project`** sets the project slug (creates the project if it does not exist)
- **`--name`** sets the target within the project (default: `web`)
- The **web** target gets `https://{slug}.shiplocal.cloud`
- Other targets get `https://{slug}-{name}.shiplocal.cloud`

Examples:

| Command                                       | Public URL                            |
| --------------------------------------------- | ------------------------------------- |
| `shiplocal 3000 --project myapp`              | `https://myapp.shiplocal.cloud`       |
| `shiplocal 4000 --project myapp --name api`   | `https://myapp-api.shiplocal.cloud`   |
| `shiplocal 3002 --project myapp --name admin` | `https://myapp-admin.shiplocal.cloud` |

### Legacy mode still works

If you run `shiplocal 3000` with **no** `--project`, you get the same random subdomain behavior as before (`bright-panda.shiplocal.cloud`). Nothing breaks for single-port workflows.

Multi-target is opt-in. That was intentional — we did not want to force every user to think about project slugs on day one.

---

## What this does _not_ solve (yet)

We are honest about the boundaries:

- **Path-based routing** — one URL with `/api/*` → backend is still on the roadmap ([issue #2 in our backlog](https://github.com/ship-local/shiplocal)). Some teams will prefer that over two links.
- **Third-party APIs** — if your app calls Stripe, Paystack, or another external service, _their_ CORS policy still applies. We only fix sibling tunnels in the same ShipLocal project.
- **WebSocket upgrades for user apps** — Socket.io and similar through the tunnel are next ([v0.2 roadmap](https://github.com/ship-local/shiplocal/blob/main/ROADMAP.md)).
- **Zero-config** — you still choose ports and target names. Auto-detecting running services is future work.

Multi-target is the foundation. Path routing and zero-config build on top of it.

---

## What changes for you today

If you already use ShipLocal for client previews:

1. **Try `--project` on your next full-stack demo** — especially when auth or data fetching is involved
2. **Use `--rewrite-env`** once to see what the CLI would change in your `.env`
3. **Clean up old tunnels** in the dashboard if your default project accumulated random legacy URLs from v0.1 testing

If you self-host, see the new section in [docs/self-hosting.md](https://github.com/ship-local/shiplocal/blob/main/docs/self-hosting.md).

---

## What is next in the series

Shipping coordinated URLs was the product milestone. The engineering story — flat subdomains vs nested ones, CORS at the proxy layer, reconnect semantics, legacy migration — is messier than the CLI output suggests.

**[The next article](/blog/building-multi-target-tunnels-what-was-hard)** walks through what was harder than we expected while building this feature.

---

## Try it

```bash
npm install -g shiplocal
shiplocal login
shiplocal 3000 --project myapp
```

Open [app.shiplocal.cloud](https://app.shiplocal.cloud/dashboard) to see all targets under your project.

ShipLocal is open source: [github.com/ship-local/shiplocal](https://github.com/ship-local/shiplocal).
