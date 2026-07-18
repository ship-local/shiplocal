---
title: Three Classes of Tunnel Bugs
subtitle: A field guide from one debugging week — hydration, reload loops, observer timing.
date: 2026-07-26
description: The debugging playbook we wish we had on day one: Network → JS, Network → WS, overlay injection, CSP, and measure before streaming.
series: ShipLocal build series
series_order: 30
---

This is the field guide we wish we had on day one.

If your app “works on localhost” but misbehaves through a tunnel, don’t start by rewriting the protocol. Start by classifying the failure.

From one week of testing real Next.js apps through ShipLocal, almost every weird symptom fell into **three classes**.

Deep dives live in [Parts 7–10](/blog/why-nextjs-looks-fine-locally-but-breaks-through-a-tunnel). This post is the skimmable checklist.

---

## Class 1 — HTML is fast, JavaScript is slow

### Symptoms

- Navbar / SSR text appear immediately
- Framer Motion heroes animate late
- Page feels “half loaded”

### What it usually is

Hydration delay. The tunnel delivered HTML; JS chunks arrived later.

### DevTools checks

1. Network → filter **JS**
2. Watch `_next/static/chunks/*`
3. Compare HTML timing vs JS timing

### Likely causes

- Full response buffering over the control WebSocket
- Base64-in-JSON overhead on every asset
- Many sequential chunks amplifying per-request latency

### Read next

- [When HTML Is Fast but JavaScript Is Slow](/blog/when-html-is-fast-but-javascript-is-slow) (Part 10)

---

## Class 2 — Continuous reload / unstable dev runtime

### Symptoms

- Page loads, then reloads forever
- Hot reload never sticks
- DevTools → WS shows failed or flapping sockets

### What it usually is

Dev runtime interference — not “the tunnel is flaky.”

Two common roots:

1. **HTML injection** into Next/Vite dev pages (overlay → Fast Refresh → reinject → reload)
2. **Missing HMR WebSocket relay** (`/_next/webpack-hmr` never stays connected)

### DevTools checks

1. Network → filter **WS**
2. Look for `/_next/webpack-hmr` (or Vite client)
3. View Page Source → search `data-shiplocal-overlay`

### Likely causes

- Injecting `overlay.js` into `webpack-hmr` HTML
- HTTP-only proxy (no browser upgrade relay)
- Reinjection without a dedupe marker

### Read next

- [The Feedback Overlay Reload Loop](/blog/the-feedback-overlay-reload-loop) (Part 8)
- [Proxying Webpack HMR Over a Tunnel](/blog/proxying-webpack-hmr-over-a-tunnel) (Part 9)

---

## Class 3 — Partial UI (headers lag, body shows)

### Symptoms

- Section body text appears
- `motion.header` / titles stay invisible longer
- `useInView` seems “broken”

### What it usually is

A **side effect** of Class 1 or Class 2 — not a broken IntersectionObserver by itself.

Late hydration, layout shifts from overlay UI, or reload loops all change when observers fire.

### Quick test

```tsx
// temporarily
const isInView = true;
```

If everything appears instantly, fix the tunnel-side delay first.

### Read next

- [Framer Motion, IntersectionObserver, and Tunnel Side Effects](/blog/framer-motion-intersection-observer-and-tunnels) (Part 15)

---

## Suspicion ranking (what we check first)

| Rank  | Suspect                        | Why                                             |
| ----- | ------------------------------ | ----------------------------------------------- |
| ★★★★★ | HTML injection on dev pages    | Explains reload loops cleanly                   |
| ★★★★★ | Reinjection without dedupe     | Creates inject → reload → inject loops          |
| ★★★★☆ | Failed HMR WebSocket           | Next/Vite depend on it heavily                  |
| ★★★★☆ | Buffering + base64 overhead    | Explains HTML-fast / JS-slow                    |
| ★★★☆☆ | Compression / content-encoding | Helps bandwidth; can break if headers are wrong |
| ★★☆☆☆ | IntersectionObserver alone     | Usually a side effect                           |

---

## 60-second triage

1. **JS tab** — are chunks slow?
2. **WS tab** — is `webpack-hmr` connected?
3. **View source** — is overlay injected into dev HTML?
4. **CSP** — would `script-src` block the overlay?
5. **Run doctor** — paste the report

```bash
shiplocal doctor
# or
shiplocal doctor --port 3000
```

Paste the full output into a GitHub issue. That report is more useful than “ShipLocal is slow.”

---

## What to do for client demos today

If you need feedback (💬 overlay), prefer a review-ready preview:

```bash
next build && next start
shiplocal 3000
```

Dev tunnels are great for “does it work?” Review previews are better for “leave structured feedback.”

Guide: [How to get client feedback on tunnel previews](/blog/how-to-get-client-feedback-on-tunnel-previews)

---

## Related posts

- [Part 7 — Why Next.js Looks Fine Locally but Breaks Through a Tunnel](/blog/why-nextjs-looks-fine-locally-but-breaks-through-a-tunnel)
- [Part 11 — Don't Stream Your Tunnel Yet — Measure First](/blog/dont-stream-your-tunnel-yet-measure-first)
- [Part 14 — Building `shiplocal doctor`](/blog/building-shiplocal-doctor)
