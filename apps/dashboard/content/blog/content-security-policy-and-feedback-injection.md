---
title: Content-Security-Policy and Feedback Injection
subtitle: Skip the overlay when CSP would reject your script — or break silently.
date: 2026-07-08
description: Injected `<script src="…/overlay.js">` fails on strict `script-src 'self'` pages. We parse CSP headers and meta tags before modifying HTML.
series: ShipLocal build series
series_order: 12
---

ShipLocal Cloud injects a feedback overlay into preview HTML:

```html
<script src="https://shiplocal.cloud/overlay.js" defer></script>
```

That works — until the page ships a Content-Security-Policy that rejects the script.

Then you get a different failure mode:

- the preview “works,”
- the 💬 button never appears,
- the console fills with CSP violations,
- and support tickets sound like “feedback is broken on my app.”

This post is how we taught the proxy to **not inject** when CSP would reject the overlay.

---

## Why tunnel products must understand CSP

Any product that modifies HTML on behalf of another origin is in CSP territory.

You are not the site owner. You are inserting a third-party script onto a page that may explicitly forbid third-party scripts.

Two bad outcomes:

1. **Inject anyway** → silent failure + console noise
2. **Always skip** → feedback never works on modern apps

The useful path is: **detect whether the overlay URL would be allowed, then inject only if safe.**

---

## Where CSP lives

ShipLocal checks both:

1. Response headers
   - `Content-Security-Policy`
   - `Content-Security-Policy-Report-Only`
2. HTML meta tags
   - `<meta http-equiv="Content-Security-Policy" content="…">`

Report-Only is treated conservatively: if Report-Only would reject the script, we still skip injection. Better to miss an overlay than pollute consoles and confuse clients.

Implementation lives in `csp-script-check.ts` and is wired through `shouldInjectFeedbackOverlay()`.

---

## Which directive decides scripts?

Effective script sources are resolved in this order:

1. `script-src-elem` (if present)
2. else `script-src`
3. else `default-src`
4. else “no CSP for scripts” → injection allowed

That matches how browsers treat external `<script src>` tags.

---

## Cases we skip

### `script-src 'none'`

Nothing external is allowed. Skip.

### `'self'` only (different origin)

Overlay is served from the ShipLocal API origin (e.g. `https://shiplocal.cloud`), while the preview page is on something like `https://happy-lion.shiplocal.cloud`.

Those are different origins. `'self'` does **not** allow the overlay. Skip.

### `'strict-dynamic'`

Nonce/hash-based trust chains. An injected external script without a nonce/hash is not reliably loadable. Skip.

### Multi-policy rejection

If **any** collected policy rejects the overlay URL, we skip. One strict policy is enough.

---

## Cases we still inject

- No CSP present
- Explicit host allowlist that includes the overlay origin (`script-src https://shiplocal.cloud`)
- Broad scheme sources like `https:` (when they apply)

We don’t try to invent a nonce for the user’s policy. That would be more invasive than ShipLocal should be.

---

## Product implication

CSP skip means:

> Tunnel works, feedback may be unavailable.

That’s the same philosophy as skipping overlay on Next/Vite **dev** HTML ([Part 8](/blog/the-feedback-overlay-reload-loop)): don’t break the page to force a Cloud feature.

For client review sessions on CSP-strict apps, the options become:

1. Temporarily relax CSP for the review environment, or
2. Allowlist the overlay origin in `script-src`, or
3. Collect feedback outside the overlay for that project

---

## What we learned

HTML injection is not just a string replace.

It’s a contract with the browser’s security model.

If you inject without reading CSP, you create “ghost bugs” — the kind that only show up in DevTools for developers who already know what CSP is.

For everyone else, the feature just “doesn’t work.”

---

## Related posts

- [Part 8 — Overlay reload loop](/blog/the-feedback-overlay-reload-loop)
- [Part 29 — Gunzip / modify / gzip](/blog/gunzip-modify-gzip-html-injection)
- [How to get client feedback on tunnel previews](/blog/how-to-get-client-feedback-on-tunnel-previews)
