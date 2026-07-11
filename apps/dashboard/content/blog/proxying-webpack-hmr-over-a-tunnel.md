---
title: Proxying Webpack HMR Over a Tunnel
subtitle: HTTP-only tunnels break Next.js and Vite dev — until you relay browser WebSockets.
date: 2026-07-05
description: Dev servers depend on `/_next/webpack-hmr` and Vite's client socket. We added ws-open, ws-message, and ws-close to the tunnel protocol and wired browser ↔ server ↔ CLI ↔ localhost.
series: ShipLocal build series
series_order: 9
---

In [Part 8](/blog/the-feedback-overlay-reload-loop), we fixed one cause of “the page keeps reloading”: injecting our feedback overlay into Next.js dev HTML.

But there was another reload culprit hiding in plain sight.

Open DevTools on a tunneled Next.js dev app and filter **WS**. You’ll usually see something like:

```text
/_next/webpack-hmr
```

If that socket fails to connect — or keeps reconnecting — the dev server falls back to behavior that looks like a broken tunnel: full page reloads, flaky updates, and a general sense that “this doesn’t work through ShipLocal.”

This post is about the second WebSocket problem tunnel builders eventually hit:

> You already have a WebSocket for the tunnel… but you still need WebSockets for the user’s app.

---

## Two WebSockets, two jobs

ShipLocal already had a control-plane WebSocket:

```text
CLI  ↔  ShipLocal server   (path: /tunnel)
```

That socket carries registration, heartbeats, and HTTP request/response messages for proxied traffic.

But modern dev servers also need a **data-plane WebSocket**:

```text
Browser  ↔  your local dev server   (path: /_next/webpack-hmr, /@vite/client, etc.)
```

These are not the same connection.

- The **control socket** is how ShipLocal moves HTTP through the tunnel.
- The **HMR socket** is how Next/Vite pushes hot updates to the browser.

If you proxy HTTP but ignore browser `Upgrade: websocket` requests, you haven’t built a dev-friendly tunnel. You’ve built a tunnel that works until someone runs `next dev`.

---

## What broken HMR looks like through a tunnel

Symptoms vary by framework, but the pattern is familiar:

- Page loads, then reloads unexpectedly
- Edits don’t hot-reload; you need a manual refresh
- DevTools → Network → WS shows failed or flapping connections
- Console mentions HMR / webpack / websocket connection issues

It’s easy to blame “latency” or “the tunnel is slow.”

Often it’s simpler: **the browser never maintained a stable HMR WebSocket through the public preview domain.**

---

## The architecture we ended up with

We kept the existing HTTP tunnel model and added a small WebSocket relay layer on top.

At a high level:

```text
Browser opens wss://<preview-domain>/_next/webpack-hmr
↓
ShipLocal server accepts the upgrade (HTTP upgrade handler)
↓
Server sends { type: "ws-open", id, path, query, headers } to CLI over /tunnel
↓
CLI opens ws://localhost:<port>/_next/webpack-hmr
↓
Frames flow both ways as ws-message / ws-close
```

So the browser thinks it’s talking to the preview domain. The CLI thinks it’s talking to localhost. The server is the relay in the middle.

---

## Protocol changes: ws-open, ws-message, ws-close

ShipLocal’s tunnel protocol already had request/response messages for HTTP. We added three message types for user-app WebSockets:

| Message      | Purpose                                                                    |
| ------------ | -------------------------------------------------------------------------- |
| `ws-open`    | Browser requested an upgrade; CLI should open the matching local WebSocket |
| `ws-message` | A frame arrived on one side; forward it to the other                       |
| `ws-close`   | One side closed; propagate close code/reason                               |

This is intentionally boring.

We didn’t try to “tunnel WebSockets” as a generic stream abstraction on day one. We modeled **connection lifecycle** explicitly:

1. open
2. message(s)
3. close

That maps cleanly to how `ws` works in Node and how browsers behave.

---

## Server side: catching browser upgrades

On the server, we register an HTTP `upgrade` handler (separate from the `/tunnel` control socket).

When a browser connects to a preview subdomain and requests a WebSocket upgrade:

1. Resolve the tunnel session by subdomain
2. Accept the browser socket
3. Send `ws-open` to the CLI session with path/query/headers
4. Relay frames both ways until close

If the tunnel is offline, the upgrade fails fast with `503` instead of hanging — small detail, big UX win.

---

## CLI side: opening localhost and buffering early frames

The CLI receives `ws-open` and creates a local WebSocket to:

```text
ws://localhost:<port><path>?<query>
```

Two edge cases showed up immediately:

### 1) Headers need sanitizing

Browser upgrade requests include WebSocket-specific headers (`sec-websocket-key`, etc.) that shouldn’t be forwarded blindly. We strip hop-by-hop headers and set a sensible `host` for localhost.

### 2) Messages can arrive before the local socket is OPEN

Browsers (and frameworks) can be fast. The CLI may receive `ws-message` frames while the local WebSocket is still `CONNECTING`.

So we buffer pending messages per connection id and flush them on `open`.

Without that, HMR can fail intermittently — the worst kind of bug.

---

## Close codes: the tiny footgun that breaks relays

WebSocket close codes have rules. Browsers are picky about which codes they’re allowed to send.

When relaying closes across three hops (browser ↔ server ↔ CLI ↔ localhost), it’s easy to propagate an invalid code and turn a normal disconnect into a protocol error.

We normalize close codes at the relay boundaries so we only forward values browsers and Node’s `ws` library accept.

This isn’t exciting engineering. It’s the kind of detail that separates “works in a demo” from “works on real apps.”

---

## Binary frames (and why we still base64 on the control socket)

HMR traffic is often text, but WebSockets are not text-only. Relaying through JSON means encoding frame payloads.

Today, `ws-message` bodies travel over the control socket as base64-in-JSON (similar to HTTP bodies). That’s not optimal for performance — [Part 10](/blog/when-html-is-fast-but-javascript-is-slow) covers that cost — but it kept the first implementation shippable without redesigning the entire transport.

The important win in Part 9 is **correctness**: HMR works through the preview domain at all.

Performance comes next.

---

## How to verify HMR is healthy (60 seconds)

On a tunneled dev app:

1. DevTools → **Network** → filter **WS**
2. Confirm `/_next/webpack-hmr` (Next) or Vite’s client socket is **connected**
3. Edit a component; confirm hot update without a full page reload
4. Run:

```bash
shiplocal doctor
```

Look for **HMR WebSocket: OK** in the output.

If WS is flapping, fix HMR before you chase JS chunk latency. A reload loop or failed upgrade will dominate the experience.

---

## What we learned

Tunnel products often ship HTTP reverse proxying first because that’s the obvious requirement.

But if your users develop through the tunnel — not just demo production builds — you need to answer:

> “What happens when the browser tries to open a WebSocket to the preview domain?”

For Next.js and Vite, the answer is: **you need an upgrade relay**, not just HTTP forwarding.

And once you add it, you’ll discover all the unglamorous relay problems: pending frames, header sanitization, close codes, and session routing.

That’s normal. It’s also why mature tunnel tools don’t treat WebSockets as an afterthought.

---

## Next in the series

- **Part 7 (overview):** [Why Next.js Looks Fine Locally but Breaks Through a Tunnel](/blog/why-nextjs-looks-fine-locally-but-breaks-through-a-tunnel)
- **Part 8:** [The Feedback Overlay Reload Loop](/blog/the-feedback-overlay-reload-loop)
- **Part 10:** [When HTML Is Fast but JavaScript Is Slow](/blog/when-html-is-fast-but-javascript-is-slow)
