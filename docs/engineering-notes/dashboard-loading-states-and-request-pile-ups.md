---
title: Dashboard Loading States and Request Pile-Ups
subtitle: When `loading || fetching` never clears and `/api/tunnels` stacks up in Network.
date: 2026-07-13
description: A 5s poll without in-flight guards can leave the dashboard stuck on “Loading dashboard…” while hung fetches never resolve.
series: ShipLocal build series
series_order: 17
---

One afternoon, production looked “down.”

The dashboard sat on:

> Loading dashboard…

DevTools showed `/api/tunnels`, `/api/projects`, `/api/comments` pending — then more of the same, stacking.

`/health` returned 200.

The API wasn’t fully dead. The **client state machine** was.

This post is that class of bug: dashboard loading that never clears, request pile-ups, and a board layout crash that only showed up sometimes.

---

## Symptom vs reality

### What users see

- Infinite “Loading dashboard…”
- Layout switch to Board sometimes crashes
- Refresh doesn’t always help

### What Network shows

- Multiple overlapping GETs to the same endpoints
- Requests that hang past “should have failed by now”
- A poll interval that keeps scheduling more work

### What `/health` shows

- API process alive
- Database may be fine

So “is production down?” is the wrong first question.

Better:

> Is the dashboard waiting on fetches that never settle?

---

## Failure mode #1: `loading || fetching` never clears

A common React pattern:

```tsx
if (loading || fetching) return <Loading />;
```

That only works if every path sets `fetching` back to `false`.

Redirects, auth failures, and early returns are where this breaks.

If one branch returns before the `finally`, the UI can stick on loading forever — even after later requests succeed.

---

## Failure mode #2: poll pile-ups

If you poll every few seconds **without** an in-flight guard:

```text
poll #1 starts (slow)
↓
poll #2 starts (still waiting on #1)
↓
poll #3 starts
↓
Network fills with pending /api/tunnels
```

Under latency (or a briefly wedged upstream), the dashboard DDoSes itself.

Fix pattern we used:

- `loadInFlight` ref — skip if a load is already running
- slower poll interval (less aggressive than “every 5s no matter what”)
- surface `loadError` instead of only a spinner

---

## Failure mode #3: fetches that never time out

Browsers can leave `fetch` pending for a long time.

Without a timeout, `fetching` stays true, the spinner stays up, and polls keep stacking.

The dashboard API client now uses an AbortController timeout (15s by default) so hung requests become errors instead of eternal pending rows.

---

## Failure mode #4: `undefined.length` on Board layout

When switching layouts, code assumed arrays always existed.

If a response shape was partial — or state hadn’t been normalized — Board hit:

```text
Cannot read properties of undefined (reading 'length')
```

Defense:

```ts
setProjects(projectsRes.projects ?? []);
setTunnels(tunnelsRes.tunnels ?? []);
setComments(commentsRes.comments ?? []);
```

Normalize at the boundary. Don’t let optional API fields become render-time crashes.

---

## How to triage this class of outage

1. Hit `/health` (and `/api/status` if you have it)
2. Open dashboard DevTools → Network
3. Ask:
   - Are requests failing (4xx/5xx)?
   - Or pending forever?
   - Are duplicates stacking on an interval?
4. Check whether the spinner is gated on a flag that never clears

If health is green and Network is a pile-up, it’s probably a **client reliability bug**, not “the whole API is down.”

Reserved-host routing bugs can look similar from the outside ([Part 16](/blog/reserved-subdomains-and-host-routing-bugs)) — so confirm the dashboard host isn’t being treated as a tunnel subdomain.

---

## What we learned

Dashboards are distributed systems too.

Polling + missing timeouts + sticky loading flags will create “production outages” that aren’t outages.

The fixes are unglamorous:

- in-flight guards
- timeouts
- `?? []`
- error UI instead of infinite spinners

But they’re the difference between a tool that feels production-ready and one that freezes the moment the network gets weird.

---

## Related posts

- [Part 16 — Reserved subdomains](/blog/reserved-subdomains-and-host-routing-bugs)
- [Part 14 — `shiplocal doctor`](/blog/building-shiplocal-doctor)
- [Part 18 — Rate limiting vs Vite module storms](/blog/rate-limiting-vs-vite-module-storms)
