---
title: IPv6, localhost, and Tunnel Connection Refused
subtitle: Your browser works on localhost but the CLI cannot reach your dev server.
date: 2026-07-23
description: Trying `127.0.0.1` and `::1` — and why `next dev -H 0.0.0.0` shows up in tunnel error messages.
series: ShipLocal build series
series_order: 27
---

One of the most confusing tunnel bugs:

> Chrome opens `http://localhost:3000` fine.  
> ShipLocal returns 502 / connection refused.

From the user’s perspective, “localhost works” and “the tunnel is broken” are the same sentence.

From ours, the CLI and the browser may not be talking to the same listener.

---

## What the CLI actually dials

ShipLocal’s local forwarder tries loopback hosts in order:

```ts
const LOOPBACK_HOSTS = ['127.0.0.1', '::1'] as const;
```

If both refuse the connection, you get the classic error path:

```text
Nothing is listening on port 3000 (tried 127.0.0.1 and ::1).
```

Your browser’s `localhost` resolution might prefer IPv6 (`::1`) or hit a different binding than the CLI’s first attempt — or your server may only be listening on an unexpected interface.

---

## Common binding mismatches

### Dev server on IPv6-only / odd defaults

Some setups listen in a way that “localhost in Chrome” works while `127.0.0.1` from Node does not (or the reverse).

Guidance we surface in errors:

```bash
next dev -H 0.0.0.0
```

(or bind explicitly to `127.0.0.1`)

### Docker published ports

“Works in browser on localhost:3000” can mean Docker published a host port, while the process inside the container is bound differently. The CLI on the host must reach the **host-published** port.

### Wrong port

Dashboard in this monorepo runs on `3001`. Guessing `3000` produces the same `ECONNREFUSED` story.

`shiplocal doctor --port <n>` checks whether anything is listening before you blame the tunnel protocol.

---

## What users see through the preview URL

When the CLI can’t reach the local app, the preview often becomes a 502-style failure with a message about nothing listening on that port.

That is **correct tunnel behavior**: the control plane is up; the local origin is not reachable from the CLI process.

---

## Triage checklist

1. Confirm the app URL in the browser (exact port)
2. Run `shiplocal doctor --port <that-port>`
3. If doctor says port closed, fix the app bind/start first
4. Prefer binding to `0.0.0.0` or `127.0.0.1` explicitly in stubborn environments
5. Only then dig into proxy/HMR/protocol issues

Don’t start with streaming architecture when the TCP connect never succeeds.

---

## What we learned

`localhost` is not one address.

It’s a family of names and stacks that disagree just often enough to waste an afternoon.

Tunnel CLIs should try both IPv4 and IPv6 loopbacks — and explain the failure in human language when both refuse.

---

## Related posts

- [Part 14 — `shiplocal doctor`](/blog/building-shiplocal-doctor)
- [Part 30 — Three classes of tunnel bugs](/blog/three-classes-of-tunnel-bugs)
