---
title: Why Next.js Looks Fine Locally but Breaks Through a Tunnel
subtitle: Three problem classes we found testing a real Framer Motion portfolio — not a todo-list demo.
date: 2026-07-03
description: Navbar appears instantly, hero animations lag, section headers never fire — and another app reloads forever. Same tunnel, three different root causes.
series: ShipLocal build series
series_order: 7
---

We learned more about ShipLocal in one week of real-app testing than we did in months of happy-path demos.

We weren’t testing a toy app. We were testing a real Next.js portfolio with Framer Motion: hero animations, `motion.header`, `useInView`, code-split chunks, dev HMR — all the stuff that makes modern “it works on localhost” feel like production.

And the tunnel “worked”… but the page did weird things:

- The navbar and some text appeared immediately.
- The hero and section headers (Framer Motion) appeared much later.
- Another app didn’t “load slowly” — it reloaded forever.

If you build developer tools, this is a good sign. It means your product is finally being tested in the real world — where the bugs are never “one bug.”

This post is the overview: the **three problem classes** we found and the debugging approach that helped us separate “slow HTML” from “slow JavaScript” from “dev runtime breakage.”

Then we’ll go deeper in Parts 8–10.

---

## The clue we almost missed: HTML was fast

The first app looked like this:

1. HTML appears quickly (navbar, basic text).
2. Then you wait.
3. Then the Framer Motion parts animate in, and some section headers finally show.

That symptom split matters.

If ShipLocal were “just slow,” you’d expect **everything** to arrive slowly.

Instead you see:

```text
HTML arrives
↓
Some content visible immediately
↓
Later...
↓
Motion components animate in
```

That’s usually **hydration**.

Next.js is roughly:

```text
SSR HTML
↓
Browser downloads JS
↓
React hydrates
↓
Framer Motion runs
↓
Animations start / useInView fires
```

If the JS bundle is delayed, React can’t hydrate, and Framer Motion can’t run. The page looks “partly loaded,” even though the HTML arrived fine.

So our first instinct shifted from “proxy is slow” to “the tunnel is delaying JavaScript delivery.”

---

## The other app was a different class of failure: continuous reload

The second app didn’t feel “slow.” It felt broken:

- it loads,
- then reloads,
- then reloads again,
- forever.

When you see a reload loop through a tunnel, don’t start by profiling throughput. Start by asking:

- Are we breaking the dev runtime (HMR / Fast Refresh)?
- Are we injecting anything into HTML that the dev server interprets as a change?
- Are WebSockets failing and forcing the dev server into fallback behavior?

In our case, that question list was basically the roadmap.

---

## The three classes of tunnel bugs (from this week)

### 1) Hydration looks “slow” because JavaScript is slow

Symptoms:

- SSR shell is fast: navbar and text appear quickly.
- Interactive/motion components appear later.
- Anything that starts at `opacity: 0` until hydration stays invisible longer than normal.

Where to look first:

- DevTools → Network → filter `JS`
- Watch `_next/static/chunks/*`
- Are bundles taking 8–15 seconds through the tunnel?

Likely root causes (tunnel-side):

- buffering every asset instead of piping
- high overhead transport (base64-in-JSON)
- too many sequential requests (lots of chunks) amplifying per-request latency

Deep dive: **[When HTML Is Fast but JavaScript Is Slow](/blog/when-html-is-fast-but-javascript-is-slow)** (Part 10)

---

### 2) Continuous reload loops (dev runtime interference)

Symptoms:

- “It keeps refreshing.”
- DevTools → Network → WS shows reconnects or failed upgrades.
- Or the page reloads even though you never touched code.

Two common causes:

- **HMR WebSockets aren’t proxied**, so Next/Vite can’t maintain the dev socket.
- **HTML injection (overlay)** triggers Fast Refresh / full reload, causing reinjection, causing another reload.

Deep dives:

- **[The Feedback Overlay Reload Loop](/blog/the-feedback-overlay-reload-loop)** (Part 8)
- **[Proxying Webpack HMR Over a Tunnel](/blog/proxying-webpack-hmr-over-a-tunnel)** (Part 9)

---

### 3) “Partial UI” bugs that are side effects (IntersectionObserver timing)

Symptoms:

- Body text shows, but section titles (often `motion.header`) lag or don’t appear.
- `useInView` never becomes `true` “on time.”

This one is usually a **side effect**, not the primary bug:

- if hydration is late, observers attach late
- if an injected overlay shifts layout, the observer fires at a different time
- if the page keeps reloading, the observer never gets stable time to fire

The simplest test is still a good test:

```tsx
// temporarily:
const isInView = true;
```

If everything appears instantly, your observer logic is fine — something else is delaying/altering the conditions.

---

## The debugging loop we now use

When a user says “the tunnel is slow” we now follow a short checklist:

- **Network → JS**: are `_next/static/chunks/*` slow?
- **Network → WS**: is `/_next/webpack-hmr` connected or flapping?
- **View source / HTML**: are we injecting scripts into dev HTML?
- **CSP**: would `Content-Security-Policy` reject the injected overlay script?
- **Run diagnostics**: `shiplocal doctor` and paste the output.

This is the difference between guessing and diagnosing.

---

## What changed in ShipLocal because of this week

We didn’t “optimize the tunnel” generically. We made targeted fixes that map to the three classes:

- **Dev overlay safety**: skip injection on dev bundler HTML markers and dedupe injection in production pages
- **HMR support**: relay browser WebSocket upgrades through the tunnel to the local dev server
- **CSP safety**: skip overlay injection when CSP would block the script
- **Benchmarks**: add a `shiplocal doctor` command so users can report “slow” with data

These changes improve correctness first — not just speed.

---

## What’s next in this series

This article is the overview. The next three posts are the deeper dives:

- **Part 8:** [The Feedback Overlay Reload Loop We Didn't See Coming](/blog/the-feedback-overlay-reload-loop)
- **Part 9:** [Proxying Webpack HMR Over a Tunnel](/blog/proxying-webpack-hmr-over-a-tunnel)
- **Part 10:** [When HTML Is Fast but JavaScript Is Slow](/blog/when-html-is-fast-but-javascript-is-slow)

And once those land, we’ll publish a more skimmable reference:

- **Part 30:** [Three Classes of Tunnel Bugs](/blog/three-classes-of-tunnel-bugs)
