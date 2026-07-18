---
title: Only HTML Should Be Intercepted
subtitle: Pipe JS, CSS, fonts, and images — do not buffer and rewrite everything.
date: 2026-07-24
description: A tunnel performance rule we re-learned: modify HTML for product features; stream everything else untouched.
series: ShipLocal build series
series_order: 28
---

A tempting proxy design:

```text
for every response:
  await body.text()
  maybeRewrite(body)
  return body
```

It’s simple to reason about.

It’s also how you make every JS chunk pay an HTML-shaped tax.

This post is the rule we keep re-learning:

> Intercept HTML for product features.  
> Everything else should pass through as untouched as possible.

---

## Why HTML is special in ShipLocal

Cloud features that need HTML access:

- feedback overlay injection
- (related) cookie/CORS concerns at the HTML document boundary

Those are deliberate product interceptions.

JS, CSS, fonts, images, source maps, and wasm usually need:

- correct bytes
- correct headers (`content-type`, `content-encoding`, caching)
- minimal added latency

They do **not** need string rewrites.

---

## Honest architecture note

ShipLocal today still **buffers** many responses end-to-end over the control WebSocket (request/response messages). That’s not the same as “rewriting everything,” but it’s also not true streaming pass-through.

So this article is both a principle and a debt statement:

| Goal                      | Status today                                     |
| ------------------------- | ------------------------------------------------ |
| Don’t rewrite non-HTML    | Mostly yes                                       |
| Don’t buffer non-HTML     | Not yet (protocol still buffers complete bodies) |
| Stream non-HTML long-term | Deferred to protocol v2 / after measured wins    |

See [Part 10](/blog/when-html-is-fast-but-javascript-is-slow) and [Part 11](/blog/dont-stream-your-tunnel-yet-measure-first).

---

## Anti-patterns to avoid

1. Running HTML injection logic on every content-type
2. Decoding compressed bodies “just in case” for non-HTML
3. Forcing uncompressed responses for all assets so the proxy can inspect them
4. Re-serializing JSON/JS when you only needed to forward bytes

Those mistakes create Class 1 symptoms: HTML feels fine, JS feels cursed.

---

## Checklist for tunnel builders

When reviewing a proxy pipeline:

- [ ] Is HTML detection explicit (`content-type` includes `text/html`)?
- [ ] Do you refuse to mutate encoded HTML without a real decode path?
- [ ] Are JS/CSS/font/image paths free of rewrite passes?
- [ ] Do you preserve `content-encoding` when you compress ([Part 13](/blog/brotli-gzip-and-the-content-encoding-trap))?
- [ ] Can you measure non-HTML latency with a doctor/benchmark command?

---

## What we learned

Product features want HTML.

Performance wants pipes.

If you blur those jobs, you get a tunnel that can demo a landing page and struggle on a real Next.js app.

---

## Related posts

- [Part 10 — HTML fast, JS slow](/blog/when-html-is-fast-but-javascript-is-slow)
- [Part 13 — content-encoding trap](/blog/brotli-gzip-and-the-content-encoding-trap)
- [Part 29 — Gunzip / modify / gzip](/blog/gunzip-modify-gzip-html-injection)
