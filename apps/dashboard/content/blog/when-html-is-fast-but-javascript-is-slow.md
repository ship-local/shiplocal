---
title: When HTML Is Fast but JavaScript Is Slow
subtitle: The tunnel buffers every asset through WebSocket JSON + base64 — hydration waits.
date: 2026-07-06
description: Navbar and text appear immediately; Framer Motion heroes lag. That is not slow SSR — it is delayed JS bundles over a fully buffered tunnel path.
series: ShipLocal build series
series_order: 10
---

The portfolio app was the clue we almost misread.

Through ShipLocal:

- The navbar appeared immediately.
- Static text appeared immediately.
- The hero (Framer Motion) appeared much later.
- Some section headers (`motion.header` + `useInView`) lagged behind their body content.

Our first fear was “HTML delivery is slow.”

It wasn’t.

If HTML were the bottleneck, **everything** would feel slow. Instead we got the classic hydration split:

```text
SSR shell visible
↓
…waiting…
↓
JS hydrates
↓
motion + observers wake up
```

This post is about that waiting period — what causes it in a tunnel, and why it’s a different class of problem than reload loops ([Part 8](/blog/the-feedback-overlay-reload-loop)) or missing HMR ([Part 9](/blog/proxying-webpack-hmr-over-a-tunnel)).

---

## What the browser is actually waiting for

A modern Next.js page isn’t “done” when HTML arrives.

Roughly:

```text
HTML arrives
↓
Browser downloads JS chunks
↓
React hydrates
↓
Client components run
↓
Framer Motion animates / useInView fires
```

ShipLocal can make step 1 feel fast while steps 2–5 are slow.

That’s why the page looks “half loaded.”

---

## The tunnel path every JS chunk pays (today)

ShipLocal’s current HTTP data path is request/response over the control WebSocket:

```text
Browser
↓
ShipLocal server (preview subdomain)
↓
Control WebSocket (/tunnel) — JSON messages
↓
CLI on your laptop
↓
http://localhost:<port>
↓
buffer entire response body
↓
(optionally compress)
↓
base64 encode into JSON
↓
send back to server
↓
browser receives JS
```

A few important details hide in that diagram:

1. **Every asset is buffered** before the browser gets it (no streaming pass-through yet).
2. **Bodies are base64-encoded** inside JSON across the control socket.
3. **Next dev serves many chunks** — not one `bundle.js`.

So latency is often not “one big slow file.” It’s:

```text
many files × (round trips + encode/decode + buffering)
```

---

## Why base64 matters more than it should

Base64 inflates binary payload size by roughly **33%**.

So a 400 KB JS chunk becomes ~530 KB on the wire before you count JSON overhead.

That hurts in two ways:

- more bytes to move
- more CPU spent encoding/decoding on both ends

Compression (brotli/gzip) helps the byte count, but it doesn’t remove the per-request overhead. You still pay for:

- waiting for the full body locally
- encoding
- decoding
- JSON parse/stringify

This is why “enable compression” was a real win — but not a complete fix.

---

## DevTools: the 30-second diagnosis

If a user says “ShipLocal is slow,” start here:

1. DevTools → **Network**
2. Filter **JS**
3. Watch `_next/static/chunks/*` (or Vite chunks)

Ask:

- Are chunks slow individually (seconds each)?
- Are there dozens of sequential requests?
- Is the HTML fast while JS is slow?

If yes, you’re likely looking at **transport overhead + chunk count**, not SSR.

`shiplocal doctor` automates a smaller version of this comparison:

- local HTML vs tunnel HTML
- local JS sample vs tunnel JS sample
- slowdown multipliers you can paste into a GitHub issue

---

## Why Framer Motion made the bug obvious

Framer Motion hero sections often start hidden:

- `opacity: 0` until JS runs
- animations triggered after hydration

Locally, hydration is fast enough that you don’t notice the gap.

Through a tunnel, JS arrives later — so the “invisible until hydrated” window becomes visible.

That’s not Framer Motion being broken. It’s **delayed hydration** exposing client-first UI.

---

## What about `useInView` / IntersectionObserver?

We saw section headers lag while body text appeared fine.

That pattern tempts you to blame the observer.

Often it’s a side effect:

- headers are motion-gated (`opacity: 0` until `isInView`)
- hydration is late, so the observer attaches late
- overlay UI or layout shifts can change observer timing

The quick sanity test still works:

```tsx
// temporarily
const isInView = true;
```

If everything appears instantly, your observer logic is probably fine. Fix the underlying delay (JS delivery / reload loops / HMR) first.

---

## What we improved (without rewriting the protocol)

We were deliberate about not jumping to streaming as a v2 architecture. Before that, we shipped wins that mattered on the current model:

### Compression on the CLI leg

For compressible assets (JS, CSS, JSON, SVG, etc.), the CLI can brotli/gzip the response body before sending it back over the control socket — while **excluding HTML** (because Cloud injects into plain HTML).

This reduced bytes on the wire significantly.

### Coupled releases (server + CLI)

Compression only works if the server preserves `content-encoding` end-to-end. An older server that stripped headers would break JS delivery in subtle ways.

Lesson: treat CLI + server as one release unit.

### Diagnostics

`shiplocal doctor` gives users (and us) a consistent before/after measurement instead of vibes.

---

## What we are not pretending is solved

Buffering every asset still exists.

Base64-in-JSON still exists.

Next dev still issues lots of chunk requests.

So yes — a sophisticated portfolio can still feel slower through a tunnel than on localhost, even when everything is “correct.”

That’s not a reason to hand-wave. It’s a reason to measure and prioritize:

1. **v0.3:** binary WebSocket frames (remove base64 tax on large payloads)
2. **v0.4:** ETag / `304` caching per tunnel session (stop re-downloading stable chunks)
3. **v0.5:** streaming only if real users still hurt after 1–2

Adoption before optimization still applies — but now we can optimize with data.

---

## Practical guidance for ShipLocal users

If your tunneled Next app feels sluggish:

1. Confirm you’re not in a reload loop ([Part 8](/blog/the-feedback-overlay-reload-loop))
2. Confirm HMR WS is connected ([Part 9](/blog/proxying-webpack-hmr-over-a-tunnel))
3. Run `shiplocal doctor` and compare local vs tunnel JS timings
4. For client review sessions, prefer `next build && next start` over `next dev` (fewer moving parts, overlay-friendly HTML)

---

## What we learned

“Slow tunnel” is not one symptom.

When **HTML is fast but JS is slow**, you’re usually looking at:

- hydration delay
- per-chunk transport overhead
- too many sequential requests

And when the UI framework starts with hidden state until hydration (Framer Motion, view observers), the delay becomes impossible to ignore.

The tunnel can be “working correctly” and still feel slow — which is exactly why the next phase of ShipLocal is measured protocol work, not more guessing.

---

## Next in the series

- **Part 7 (overview):** [Why Next.js Looks Fine Locally but Breaks Through a Tunnel](/blog/why-nextjs-looks-fine-locally-but-breaks-through-a-tunnel)
- **Part 30 (field guide):** [Three Classes of Tunnel Bugs](/blog/three-classes-of-tunnel-bugs)
