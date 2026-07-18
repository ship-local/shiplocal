---
title: Gunzip, Modify, Gzip — When Compression Meets HTML Injection
subtitle: Encoded HTML skips injection today. That is intentional — and limiting.
date: 2026-07-25
description: If the origin sends `content-encoding: gzip`, the proxy cannot safely inject overlay markup without decode-modify-reencode — and that must stream correctly.
series: ShipLocal build series
series_order: 29
---

ShipLocal injects feedback markup into HTML.

That means we need a string we can safely edit.

If the origin already sent:

```text
content-encoding: gzip
```

(or brotli), the body is not that string.

Today we **skip injection** when `content-encoding` is present.

That’s intentional. It’s also a product limitation people hit with `next start`.

---

## Why skip is the safe default

The unsafe path looks like:

```text
gunzip
↓
inject <script>
↓
gzip again
↓
hope Content-Length / streaming / partial flushes are correct
```

If any of that is wrong, browsers get:

- truncated pages
- broken encodings
- intermittent blank documents

For a tunnel product, “sometimes the whole HTML is garbage” is worse than “no 💬 button.”

So Cloud only injects into **uncompressed** HTML 2xx responses.

---

## Where this shows up in practice

### Dev servers

Often send plain HTML. Overlay may still be skipped for other reasons (dev bundler markers — [Part 8](/blog/the-feedback-overlay-reload-loop)).

### `next start` / production-like local servers

Next can enable compression by default (`compress: true`). Then HTML arrives encoded → ShipLocal skips overlay injection.

Workaround we document:

```js
// next.config.js
compress: false;
```

Then rebuild/restart and verify page source contains `data-shiplocal-overlay`.

Full guide: [How to get client feedback on tunnel previews](/blog/how-to-get-client-feedback-on-tunnel-previews).

---

## Options if we ever inject into encoded HTML

1. **Decode → modify → re-encode** carefully (full body, correct headers, no truncated streams)
2. **Negotiate uncompressed HTML** from origin when Cloud feedback is enabled
3. **Bootstrap without HTML rewrite** (e.g. bookmarklet / explicit loader) — weaker UX

Each option has cache, security, and complexity costs. None are free.

Until measurements and product demand justify it, skip-on-encoded remains the correct trade.

---

## Interaction with CLI compression

Remember the split:

- CLI may compress **non-HTML** assets for the wire ([Part 13](/blog/brotli-gzip-and-the-content-encoding-trap))
- HTML stays uncompressed on that path so injection can happen
- Origin-encoded HTML is a different case (skip injection)

Two compression stories; don’t conflate them.

---

## What we learned

HTML injection and HTTP compression are adversarial features.

You can support both, but only with an explicit, tested decode/re-encode pipeline — not a hopeful `Buffer.toString('utf8')` on gzip bytes.

Until then: skip, document, and verify with View Source.

---

## Related posts

- [Part 12 — CSP and injection](/blog/content-security-policy-and-feedback-injection)
- [Part 13 — content-encoding trap](/blog/brotli-gzip-and-the-content-encoding-trap)
- [Part 28 — Only HTML should be intercepted](/blog/only-html-should-be-intercepted)
