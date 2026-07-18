---
title: Building `shiplocal doctor` for Tunnel Diagnostics
subtitle: Pasteable output beats guessing when someone says “the tunnel is slow.”
date: 2026-07-10
description: A CLI command that checks API health, auth, WebSocket handshake, local vs tunnel transfer times, compression, and HMR connectivity.
series: ShipLocal build series
series_order: 14
---

“ShipLocal is slow” is not a bug report.

It’s a feeling.

Without numbers, you get a week of guessing: buffering? compression? HMR? overlay? Framer Motion? The user’s Wi‑Fi?

So we built a diagnostic command:

```bash
shiplocal doctor
shiplocal benchmark   # alias
```

This post is why tunnel CLIs need a stethoscope, what ours checks, and how to use the output.

---

## Why infrastructure CLIs need doctor commands

Users of an npm package cannot see your monorepo.

They will not open `local-proxy.ts`.

They will not redeploy your VPS “just to check.”

They _will_ paste something into Discord or GitHub if you give them a pasteable report.

`shiplocal doctor` turns:

> it’s slow

into:

```text
Tunnel HTML: 890 ms (local was 12 ms)
Tunnel JS sample: 4.2 s (br)
HMR WebSocket: OK
WebSocket RTT: 120 ms
```

Now you know whether you’re debugging hydration delay, auth, or a dead API.

---

## What it checks

### Connectivity & auth

- `GET /health` — is the API up?
- `GET /api/tunnels` with the saved token — is auth valid?
- WebSocket handshake to `/tunnel` — can the CLI reach the control plane?

### Local app

- Is anything listening on the target port (`3000` by default)?

### End-to-end tunnel benchmark (when port is open + auth works)

1. Register a temporary tunnel
2. Fetch `/` locally and through the public URL
3. Find a sample JS chunk in the HTML
4. Fetch that chunk locally vs through the tunnel
5. Probe HMR WebSocket (`/_next/webpack-hmr` or Vite markers) through the preview domain

Then it prints slowdown multipliers and compression notes.

---

## Example output

```text
ShipLocal Doctor
================
API URL: https://shiplocal.cloud

API health: OK (38 ms) — Server reachable
Auth: OK (42 ms) — API token valid
WebSocket handshake: OK (120 ms) — Tunnel socket reachable
Local port 3000: OK — App is listening
JS transfer: WARN (4.2 s) — Sample JS took 4.2 s through the tunnel
HMR WebSocket: OK (85 ms) — Connected to /_next/webpack-hmr

Metrics
-------
WebSocket RTT: 120 ms
Tunnel registration: 210 ms
Local HTML: 12 ms, 4.2 KB
Tunnel HTML: 890 ms, 4.2 KB
HTML slowdown vs local: 74.2x
Local JS sample: 8 ms, 412 KB
Tunnel JS sample: 4.2 s, 148 KB (br)
JS wire savings: 64% smaller on wire
JS slowdown vs local: 525x

Overall: healthy with 1 warning(s)
```

That one warning tells a clearer story than a screenshot of a “pending” Network row.

---

## How to run it

```bash
shiplocal login
# start your app on a port
shiplocal doctor
shiplocal doctor --port 3001
shiplocal doctor --json
```

`--json` is for CI / support tooling. Human output is for pasteable bug reports.

If you’re not logged in, or nothing is listening on the port, doctor still reports what it can and warns about the rest.

---

## How we use it internally

Before claiming a performance “win,” we want before/after doctor output.

That discipline maps to the roadmap in [Part 11](/blog/dont-stream-your-tunnel-yet-measure-first):

- v0.3 binary frames → measure JS transfer
- v0.4 caching → measure repeat-load JS transfer
- v0.5 streaming → only if doctor still looks bad for real apps

Without a baseline, every optimization is vibes.

---

## What doctor is not

It’s not a full Lighthouse run.

It’s not a replacement for DevTools when you’re deep in a Class 2 reload loop.

It’s a **first response**:

1. Is the API/auth/WS healthy?
2. Is the local app up?
3. How bad is tunnel vs local for HTML/JS?
4. Is HMR connected through the public URL?

If those answers are clear, you know which [bug class](/blog/three-classes-of-tunnel-bugs) you’re in.

---

## Related posts

- [Part 10 — When HTML Is Fast but JavaScript Is Slow](/blog/when-html-is-fast-but-javascript-is-slow)
- [Part 11 — Don't Stream Your Tunnel Yet — Measure First](/blog/dont-stream-your-tunnel-yet-measure-first)
- [Part 30 — Three Classes of Tunnel Bugs](/blog/three-classes-of-tunnel-bugs)
