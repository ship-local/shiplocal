---
title: Test Real Apps, Not Todo-List Demos
subtitle: How a Framer Motion portfolio matured ShipLocal faster than synthetic benchmarks.
date: 2026-07-20
description: Sophisticated Next.js apps expose hydration, HMR, CSP, and injection bugs that hello-world tunnels never surface.
series: ShipLocal build series
series_order: 24
---

If your tunnel works on a Vite hello-world, you have not tested a tunnel.

You have tested a demo.

ShipLocal got dramatically better the week we stopped validating against starters and started tunneling **real** apps — especially a Next.js portfolio with Framer Motion, code-split chunks, `useInView`, and a noisy dev runtime.

That week produced more truth than months of synthetic “it loads” checks.

---

## What starters hide

A todo-list demo usually has:

- one HTML document
- a small JS bundle
- little or no HMR complexity
- no motion libraries waiting on hydration
- no strict CSP
- no client who cares if the hero animates 3 seconds late

A real app has all of the opposite.

So “works on my starter” is a weak claim for any developer tunnel.

---

## What the portfolio actually stressed

Through ShipLocal we saw:

- SSR shell fast, motion UI late → hydration / JS delivery
- Continuous reload on another app → overlay injection + Fast Refresh
- Missing or flaky hot reload → HMR WebSockets not proxied
- Partial UI (titles lagging body text) → observer timing as a side effect

Those became the three problem classes in our [field guide](/blog/three-classes-of-tunnel-bugs) and the deep dives in [Parts 7–10](/blog/why-nextjs-looks-fine-locally-but-breaks-through-a-tunnel).

None of that shows up on `create-next-app` default page with two paragraphs.

---

## The feedback loop that matters

```text
Real app report
↓
DevTools hypotheses (JS / WS / View Source)
↓
Proxy or CLI fix
↓
shiplocal doctor baseline
↓
Deploy CLI + server together
↓
Re-test the same real app
```

That loop is how infrastructure products mature. ngrok and Cloudflare Tunnel did not become reliable by polishing demos. They survived weird production-shaped workloads.

---

## Turn failures into diagnostics

Once we knew the failure modes, we encoded them into something users can paste:

```bash
shiplocal doctor
```

Health, auth, WebSocket RTT, local vs tunnel HTML/JS, HMR probe.

If someone says “ShipLocal is slow,” doctor turns vibes into a report. That only works because the report matches bugs we saw on real stacks.

More: [Building `shiplocal doctor`](/blog/building-shiplocal-doctor).

---

## What we ask beta users for

Bring the weird app:

- Next.js + Framer Motion
- Vite + multiple entry points
- full-stack projects with an API target
- CSP-locked marketing sites
- Dockerized local servers

If ShipLocal only works on clean demos, it is not ready for client work.

---

## Product takeaway

ShipLocal’s job is not “forward HTTP.”

It’s “make a real local project reviewable by a non-technical client.”

That only gets proven on real projects.

Test those first. Optimize the protocol after the failures teach you what to measure.

---

## Related posts

- [Why Next.js Looks Fine Locally but Breaks Through a Tunnel](/blog/why-nextjs-looks-fine-locally-but-breaks-through-a-tunnel)
- [Three Classes of Tunnel Bugs](/blog/three-classes-of-tunnel-bugs)
- [Don't Stream Your Tunnel Yet — Measure First](/blog/dont-stream-your-tunnel-yet-measure-first)
- [How to Get Client Feedback on Tunnel Previews](/blog/how-to-get-client-feedback-on-tunnel-previews)
