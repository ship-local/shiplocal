---
title: Deferring Feedback Overlay Init with requestIdleCallback
subtitle: Don't compete with hydration for the main thread.
date: 2026-07-21
description: Appending overlay UI on `DOMContentLoaded` can delay framework hydration. Scheduling init on idle time reduces visible jank on tunneled previews.
series: ShipLocal build series
series_order: 25
---

Even when overlay injection is “safe,” the overlay still does real work:

- inject styles
- create a fixed feedback button
- wire pick-mode / modal / screenshot capture

On a fast local load, you barely notice.

Through a tunnel — where JS may already arrive late — running that work at the same moment as React hydration makes the preview feel worse.

So we deferred overlay init.

---

## What used to happen

Roughly:

```text
HTML arrives (with overlay.js deferred)
↓
DOMContentLoaded
↓
overlay init() immediately
↓
app hydration also fighting for the main thread
```

On tunneled Next.js apps with Framer Motion, that competition shows up as staggered UI — the same class of “half loaded” feel described in [Part 10](/blog/when-html-is-fast-but-javascript-is-slow) and [Part 15](/blog/framer-motion-intersection-observer-and-tunnels).

---

## The change

```ts
function scheduleInit(): void {
  const run = () => init();
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(run, { timeout: 3000 });
  } else {
    window.setTimeout(run, 0);
  }
}
```

Flow now:

1. Wait for `DOMContentLoaded` (if needed)
2. Schedule `init()` on idle time
3. Fall back to `setTimeout(0)` where `requestIdleCallback` is missing
4. Cap wait with a timeout so the button still appears

Tradeoff: the 💬 button may appear slightly later. The app’s first paint/hydration usually feels cleaner.

---

## What deferral does not fix

Deferral is a **politeness** change, not a correctness fix.

It will not stop:

- reload loops from injecting into Next/Vite **dev** HTML ([Part 8](/blog/the-feedback-overlay-reload-loop))
- CSP blocking the script ([Part 12](/blog/content-security-policy-and-feedback-injection))
- slow JS chunk delivery through the tunnel

For those, skip injection or fix the transport.

Deferral only helps after the script is allowed to load on a stable page.

---

## Product rule

ShipLocal Cloud feedback should feel invisible until needed.

If the overlay makes the client’s first impression worse than the app itself, we’ve failed the product — even if the tunnel “works.”

---

## Related posts

- [Part 8 — Overlay reload loop](/blog/the-feedback-overlay-reload-loop)
- [Part 15 — Framer Motion side effects](/blog/framer-motion-intersection-observer-and-tunnels)
- [How to get client feedback on tunnel previews](/blog/how-to-get-client-feedback-on-tunnel-previews)
