---
title: Brotli, Gzip, and the content-encoding Trap
subtitle: Compress on the CLI leg — but only if the server preserves the header end-to-end.
date: 2026-07-09
description: Stripping `content-encoding` on the server while the CLI sets `gzip` or `br` breaks JS delivery. Server and CLI must ship together.
series: ShipLocal build series
series_order: 13
---

Compression is supposed to make tunnels faster.

It can also make JavaScript unreadable.

This post is about the `content-encoding` trap we hit while optimizing ShipLocal — and why **CLI and server must ship as a pair**.

---

## Why compress on the CLI leg?

ShipLocal’s HTTP path still buffers responses and sends them over a control WebSocket (often as base64-in-JSON). Bytes are expensive.

So the CLI can compress compressible assets before sending them back:

- JS / CSS / JSON / SVG / XML / wasm, etc.
- Prefer brotli if `Accept-Encoding` includes `br`
- Else gzip if available

That cuts wire size significantly — which `shiplocal doctor` can report as “JS wire savings.”

---

## Why HTML is excluded

Cloud injects the feedback overlay into HTML.

Injection needs plain text HTML.

So `text/html` is explicitly **not** compressed by `maybeCompressResponse`.

If the origin already sent `content-encoding` on HTML (e.g. `next start` with `compress: true`), ShipLocal also skips injection rather than doing a risky gunzip → modify → gzip pipeline mid-proxy.

That’s a separate story: [Gunzip, Modify, Gzip](/blog/gunzip-modify-gzip-html-injection) and the [feedback guide](/blog/how-to-get-client-feedback-on-tunnel-previews).

---

## The trap: compressed body, missing header

Here’s the failure mode:

```text
CLI compresses JS with brotli
↓
sets content-encoding: br
↓
old server strips content-encoding (or fails to forward it)
↓
browser receives compressed bytes as “plain JS”
↓
syntax errors / blank app / “hydration failed”
```

From the user’s perspective:

> “My site works on localhost and breaks through ShipLocal.”

From ours:

> “We shipped half of a compression change.”

---

## Headers that matter

When the CLI recompresses:

- Set `content-encoding` (`br` or `gzip`)
- Merge `Vary: Accept-Encoding`
- Strip `ETag` (body changed; old validators lie)

When the server proxies:

- Preserve `content-encoding` end-to-end
- Don’t treat tunnel assets like API JSON that should always be uncompressed

Compression is only a win if the browser knows how to decode the body.

---

## Deploy discipline: coupled releases

This is why we treat ShipLocal Cloud like a **coupled release unit**:

| Piece  | Role                                     |
| ------ | ---------------------------------------- |
| CLI    | may compress / set encoding              |
| Server | must preserve encoding + proxy correctly |

A user can `npm install -g shiplocal@latest` without knowing you also need a VPS redeploy.

If those versions drift, you get subtle production bugs that only appear on real JS bundles.

Rule of thumb:

> Don’t publish a CLI that compresses until the server that preserves `content-encoding` is already live.

---

## Measure, don’t assume

Compression can reduce bytes and still leave the page feeling slow if:

- you’re paying base64/JSON overhead per chunk
- Next is requesting dozens of files
- HMR/reload issues dominate the experience

Use:

```bash
shiplocal doctor
```

Look at:

- Tunnel JS sample size vs local
- encoding noted (`br` / `gzip`)
- slowdown multiplier

Compression is one lever. It’s not the whole performance story ([Part 10](/blog/when-html-is-fast-but-javascript-is-slow), [Part 11](/blog/dont-stream-your-tunnel-yet-measure-first)).

---

## What we learned

Performance features that cross the CLI/server boundary are release engineering problems disguised as encoding problems.

The bytes were fine.

The **header contract** was not.

If you optimize only one side of a tunnel, you can ship a regression that looks like “framework breakage” instead of “ops mismatch.”

---

## Related posts

- [Part 10 — HTML fast, JS slow](/blog/when-html-is-fast-but-javascript-is-slow)
- [Part 14 — `shiplocal doctor`](/blog/building-shiplocal-doctor)
- [Part 11 — Don't stream yet — measure first](/blog/dont-stream-your-tunnel-yet-measure-first)
