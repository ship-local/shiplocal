---
title: Content-Security-Policy and Feedback Injection
subtitle: Skip the overlay when CSP would reject your script — or break silently.
date: 2026-07-08
description: Injected `<script src="…/overlay.js">` fails on strict `script-src 'self'` pages. We parse CSP headers and meta tags before modifying HTML.
series: ShipLocal build series
series_order: 12
---

_This article is coming soon._

**Coming soon.**

---

## What this article will cover

- Why tunnel products that modify HTML must understand CSP
- Reading `Content-Security-Policy` headers and `<meta http-equiv>` tags
- Directive fallbacks: `script-src-elem` → `script-src` → `default-src`
- Cases we skip: `'none'`, `'self'` only (overlay on different origin), `'strict-dynamic'`
- When `https:` or explicit host allowlists mean injection is safe
- Report-Only policies and why we skip injection conservatively
- Implementation notes from `csp-script-check.ts`
