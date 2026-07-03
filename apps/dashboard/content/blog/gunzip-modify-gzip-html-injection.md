---
title: Gunzip, Modify, Gzip — When Compression Meets HTML Injection
subtitle: Encoded HTML skips injection today. That is intentional — and limiting.
date: 2026-07-25
description: If the origin sends `content-encoding: gzip`, the proxy cannot safely inject overlay markup without decode-modify-reencode — and that must stream correctly.
series: ShipLocal build series
series_order: 29
---

_This article is coming soon._

**Coming soon.**

---

## What this article will cover

- Why we skip overlay injection when `content-encoding` is set
- Chunked / streaming gzip recompression pitfalls (partial pages in browser)
- Dev servers usually send plain HTML; production `next start` may not
- Options: decompress path, origin negotiation without encoding, or inject via JS bootstrap
- Security and cache implications of re-encoding proxied bodies
