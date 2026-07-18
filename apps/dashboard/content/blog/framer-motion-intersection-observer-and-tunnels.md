---
title: Framer Motion, IntersectionObserver, and Tunnel Side Effects
subtitle: Section headers lagging behind body text is often hydration — not a broken observer.
date: 2026-07-11
description: `useInView` with negative margin never fires if layout shifts or JS arrives late. Overlay injection and slow chunks make it worse.
series: ShipLocal build series
series_order: 15
---

The weirdest portfolio symptom looked like a Framer Motion bug:

- Section **body** content appeared.
- Section **headers** (`motion.header`) stayed invisible longer.
- Sometimes titles never “woke up” until you scrolled again.

Locally, everything felt fine.

Through ShipLocal, it looked like ShipLocal was “breaking IntersectionObserver.”

It wasn’t — at least not as the root cause.

This is **Class 3** from the [field guide](/blog/three-classes-of-tunnel-bugs): partial UI that’s usually a side effect of late hydration or unstable layout.

---

## The pattern that misleads you

A common section pattern:

```tsx
const isInView = useInView(ref, {
  once: true,
  margin: '-80px',
});

return (
  <section ref={ref}>
    <motion.header
      initial={{ opacity: 0, y: 16 }}
      animate={isInView ? { opacity: 1, y: 0 } : undefined}
    >
      {title}
    </motion.header>

    {children}
  </section>
);
```

Children might render as normal HTML.

The header waits for:

1. React hydration
2. the observer to attach
3. `isInView` to become true
4. the animation to run

If step 1 is late, steps 2–4 are late. The body can appear while the title stays at `opacity: 0`.

That’s why this looks like “ShipLocal broke my headers” when the real issue is often delayed JS ([Part 10](/blog/when-html-is-fast-but-javascript-is-slow)).

---

## The 10-second test

Temporarily force:

```tsx
const isInView = true;
```

| Result                   | Meaning                                             |
| ------------------------ | --------------------------------------------------- |
| Headers appear instantly | Observer/timing is the symptom, not the app “logic” |
| Headers still lag badly  | Broader hydration/JS delivery problem               |
| Page reloads mid-test    | You’re in Class 2 — fix reload/HMR first            |

Don’t optimize the observer until Class 1 and Class 2 are healthy.

---

## How tunnels make observers worse

IntersectionObserver is sensitive to:

- when the JS that registers it arrives
- layout shifts after registration
- scroll position / viewport changes during load

Through a tunnel, those variables get noisier:

### Late JS

If `_next/static/chunks/*` take seconds, hydration is late, so the observer attaches late. By then the user may already be looking at a “broken” section.

### Overlay / fixed UI

Feedback overlays append fixed buttons and styles. That can shift layout or compete for main-thread time during init.

We mitigated this by:

- skipping overlay injection on next/vite **dev** HTML
- deferring overlay `init()` with `requestIdleCallback`

Those help, but they don’t remove the need for fast-enough JS delivery on review previews.

### Reload loops

If the page keeps reloading, observers never get a stable window to fire. Fix [injection](/blog/the-feedback-overlay-reload-loop) / [HMR](/blog/proxying-webpack-hmr-over-a-tunnel) first.

---

## App fix vs tunnel fix

### Fix in the app when…

- You want progressive enhancement: titles should be readable without JS
- You’re okay with less dramatic entrance animations on first paint
- SSR can render the final visible state, then enhance

Example mindset: don’t put critical content only behind `opacity: 0` until a client hook fires.

### Fix in the tunnel when…

- Local is snappy; tunnel JS chunks are multi-second
- `shiplocal doctor` shows huge JS slowdown vs local
- HMR/WS is unhealthy and the page is unstable

That’s ShipLocal’s job — protocol and proxy work — not “users should rewrite Framer Motion.”

---

## Practical checklist for designers of motion-heavy apps

If you’re demoing a motion-heavy site through any tunnel:

1. Confirm no reload loop (WS + overlay checks)
2. Run `shiplocal doctor` and check JS sample time
3. Temporarily set `isInView = true` to isolate observer timing
4. For client reviews, prefer `next build && next start` over `next dev`
5. Avoid making critical titles invisible until client JS runs

ShipLocal should get faster. Apps should also survive late hydration gracefully. Both can be true.

---

## What we learned

Class 3 bugs are easy to misdiagnose because they look like framework bugs.

The honest sequence is:

1. Stabilize the page (no reload loop, HMR healthy)
2. Measure JS delivery
3. Only then revisit observer margins / motion defaults

When section titles lag behind body text through a tunnel, start with hydration — not with blaming `useInView`.

---

## Related posts

- [Part 7 — Overview](/blog/why-nextjs-looks-fine-locally-but-breaks-through-a-tunnel)
- [Part 10 — HTML fast, JS slow](/blog/when-html-is-fast-but-javascript-is-slow)
- [Part 30 — Field guide](/blog/three-classes-of-tunnel-bugs)
- [Part 14 — `shiplocal doctor`](/blog/building-shiplocal-doctor)
