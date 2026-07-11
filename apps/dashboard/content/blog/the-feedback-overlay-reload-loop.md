---
title: The Feedback Overlay Reload Loop We Didn't See Coming
subtitle: Injecting a `<script>` into every HTML response can fight Next.js Fast Refresh.
date: 2026-07-04
description: ShipLocal injects a client feedback overlay into proxied HTML. On Next.js dev pages, that innocent DOM change can trigger reload → reinject → reload forever.
series: ShipLocal build series
series_order: 8
---

We thought the hard part of ShipLocal would be tunneling.

It wasn’t.

The hard part was everything you accidentally touch when you try to “just add one script tag.”

ShipLocal Cloud adds a feedback overlay to preview pages so clients can click, comment, and attach screenshots. Under the hood, that meant injecting this into HTML:

```html
<script src="https://shiplocal.cloud/overlay.js" defer></script>
```

It worked perfectly on production-like pages.

Then we tested a real Next.js dev app and discovered a new failure mode:

> The page loads … then reloads … then reloads … forever.

This post is what happened, why it happened, and what we changed so dev previews stay stable.

---

## The symptom: a reload loop that looks like “tunnel is broken”

If you’ve ever debugged a reload loop in a framework dev server, you know how annoying it feels:

- you didn’t change code,
- you didn’t click anything,
- but the browser keeps refreshing.

Through a tunnel it’s even worse, because you have two easy wrong conclusions:

1. “The tunnel is unstable.”
2. “Next.js doesn’t work through tunnels.”

In our case, the tunnel was fine. The bug was **our overlay injection** interacting with the dev runtime.

---

## Why this happens: Next dev treats HTML changes as a signal

Next.js dev is not just “serve HTML.” It is a live runtime:

- Fast Refresh
- webpack HMR
- dev-only scripts injected into the page
- WebSocket connections like `/_next/webpack-hmr`

When you mutate the HTML that comes back from the dev server, you’re not only changing what the browser renders — you’re changing what the dev runtime sees.

So the problem pattern looked like this:

```text
Tunnel proxy injects overlay.js into dev HTML
↓
Next dev runtime detects unexpected page change
↓
Full reload
↓
Tunnel injects again (because it's another HTML response)
↓
Reload again
↓
Loop forever
```

This is why the “it keeps refreshing” bug was not one bug. It was a class of mistakes:

- injecting into dev HTML at all
- injecting repeatedly
- injecting without a dedupe marker

---

## What ShipLocal was doing (the naive version)

Originally, ShipLocal Cloud injected the overlay into **every** HTML response that looked injectable:

- status \(200–299\)
- content-type includes `text/html`
- not already encoded (no `content-encoding`)

It’s an understandable first implementation because it’s minimal and requires no client changes.

But it’s also a trap: dev servers return HTML often, and they care deeply about what’s inside it.

---

## Fix #1: skip injection on dev bundler HTML

The first big change was a product decision:

**A dev tunnel is for sharing work-in-progress quickly. A review preview is for collecting structured feedback.**

So by default we skip injection when the HTML contains dev bundler markers, e.g.:

- `webpack-hmr` (Next.js)
- `@vite/client` (Vite)
- `@react-refresh`
- `__turbopack`
- `react-refresh.js`

That means the tunnel still works for dev, but the client won’t see the 💬 overlay until you run a review-ready preview (e.g. `next build && next start`).

Deep dive on detection: [Detecting Next.js and Vite Dev HTML](/blog/detecting-next-and-vite-dev-html)

---

## Fix #2: dedupe injection (don’t inject twice)

Even outside dev, you never want to inject multiple times into the same HTML.

So the injected script now includes a marker:

```html
<script
  src="https://shiplocal.cloud/overlay.js"
  data-shiplocal-overlay
  data-tunnel-id="…"
  data-api-url="…"
  defer
></script>
```

And before injecting, ShipLocal checks if that marker already exists:

- if yes → don’t inject again

This one change prevents a whole category of bugs that look like “the overlay is duplicated” or “the page gets heavier each refresh.”

---

## Fix #3: defer overlay initialization so it doesn't fight hydration

Even when injection is safe (production-like pages), the overlay does real work:

- inject styles
- create UI elements (button, modal)
- capture screenshots (html2canvas)

On fast local loads, you don’t notice.

On tunneled previews — where JS may already arrive later — running overlay init at the same time can compete with hydration.

So we schedule init more gently:

- wait for DOMContentLoaded
- then run on `requestIdleCallback` (with a timeout fallback)

This doesn’t fix dev reload loops by itself. It reduces jank in the “review preview” case.

Deep dive: [Deferring Feedback Overlay Init](/blog/deferring-feedback-overlay-init)

---

## Fix #4: don’t inject when CSP would block the script

Some sites ship strict CSP:

- `script-src 'self'`
- nonce/hash-only policies
- `strict-dynamic`

If you inject `overlay.js` into such pages, you create a different class of bug:

- the preview “works,”
- but the overlay silently fails,
- and you get confusing console errors.

So ShipLocal now parses CSP from response headers and meta tags and **skips injection** if the overlay URL would be rejected.

Deep dive: [Content-Security-Policy and Feedback Injection](/blog/content-security-policy-and-feedback-injection)

---

## How to debug this class of bug in 60 seconds

If you suspect an injection-based reload loop:

1. **Open DevTools → Network**
2. Filter `WS`
3. Look for `/_next/webpack-hmr` (Next) or Vite’s socket activity
4. View Page Source and search for `data-shiplocal-overlay`

If the page is in dev mode and you see the overlay injected, you’re likely reproducing the old failure mode.

If you need feedback collection, switch from dev to a review preview:

```bash
next build
next start
shiplocal 3000
```

Then verify the public page source contains `data-shiplocal-overlay`.

---

## What this taught us

The tunnel wasn’t the hard part.

The hard part was recognizing that **HTML injection is not a neutral operation** in modern dev environments. Frameworks use HTML as part of a larger runtime contract — and if you violate it, you get failure modes that look like networking.

In other words:

> A reload loop is not a “performance bug.” It’s usually a correctness bug.

And correctness always ships before optimization.

---

## Next in the series

- **Part 7 (overview):** [Why Next.js Looks Fine Locally but Breaks Through a Tunnel](/blog/why-nextjs-looks-fine-locally-but-breaks-through-a-tunnel)
- **Part 9:** [Proxying Webpack HMR Over a Tunnel](/blog/proxying-webpack-hmr-over-a-tunnel)
