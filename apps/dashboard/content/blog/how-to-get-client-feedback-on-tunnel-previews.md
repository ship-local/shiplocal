---
title: How to Get Client Feedback on Tunnel Previews
subtitle: Share the Review URL for feedback on any stack — or use the in-page overlay on production-like serves.
date: 2026-07-05
description: ShipLocal Cloud offers a Review URL (feedback outside your app HTML) plus an optional in-page overlay. Prefer the Review URL; use next start / vite preview when you want overlay on the Public URL.
series: ShipLocal build series
series_order: 32
---

If you run `shiplocal 3000`, the CLI prints two links:

- **Public URL** — direct tunnel to your app
- **Review URL** — ShipLocal page that embeds your preview and hosts **💬 Feedback** outside your app HTML

**Prefer the Review URL for clients.** It works on Next, Vite, Python, static servers, C++/WASM demos, and even `npm run dev` — without fighting HMR, gzip, or CSP.

The rest of this guide covers the optional **in-page overlay** on the Public URL (when it appears, when it does not, and how to force it).

---

## Recommended: Review URL (any stack)

```bash
# Serve your app however you normally do (dev or production-like)
shiplocal login
shiplocal 3000
```

Send the **Review** line from the CLI (for example `https://app.shiplocal.cloud/review/happy-lion`). Clients open it, view your app, and leave feedback. No account required on their side. You see comments on the [dashboard](https://app.shiplocal.cloud/dashboard).

| How you run your app                          | Tunnel works | Review URL feedback | Public URL in-page overlay (default) |
| --------------------------------------------- | ------------ | ------------------- | ------------------------------------ |
| `npm run dev` / `next dev` / Vite / Flask dbg | Yes          | **Yes**             | **No**                               |
| `next build && next start` / `vite preview`   | Yes          | **Yes**             | **Yes** (if CSP + uncompressed HTML) |
| gunicorn / waitress / static file server      | Yes          | **Yes**             | Often **Yes**                        |
| Self-hosted Core (no Cloud)                   | Yes          | No                  | No                                   |

If the iframe is blank (some apps set `X-Frame-Options` / CSP `frame-ancestors`), use **Open raw URL** on the review page — feedback from the chrome still works.

---

## Optional: in-page overlay on the Public URL

On **ShipLocal Cloud**, the server can inject a small script into HTML responses on the **Public** URL. That script adds:

- A floating 💬 button
- Click-to-select an element
- A comment box and screenshot
- Posts to your [dashboard](https://app.shiplocal.cloud/dashboard)

Injection only happens when it is safe and useful — not on every page load.

### Why dev previews skip the overlay

Next.js and Vite dev pages include markers like `webpack-hmr` and `@vite/client`. When ShipLocal injected the overlay into that HTML, we saw:

- **Reload loops** — inject → Fast Refresh sees DOM change → full reload → inject again
- **Slow or staggered UI** — overlay JS competing with hydration and Framer Motion
- **Unstable HMR** — dev WebSocket + modified DOM

So we **skip injection on dev bundler HTML** by default. Your tunnel still works; for feedback on those sessions, use the **Review URL**.

---

## Production-like serve (for Public URL overlay)

If you specifically want 💬 **inside** the Public URL page:

```bash
# Next.js example
next build
next start          # usually port 3000

# Vite / SPA
vite build && vite preview

# Python (example)
gunicorn myapp:app -b 127.0.0.1:8000

# Static / WASM / simple HTML
python -m http.server 8080

# In another terminal
shiplocal login
shiplocal 3000
```

Send the **Public** URL. Ask the client to look for the 💬 button in the bottom-right corner.

**Verify before you send the link:** open the public URL → View Page Source → search for `data-shiplocal-overlay` or `overlay.js`. If present, feedback is enabled.

### Full-stack apps

If your frontend calls an API on another port, use project targets:

```bash
shiplocal 3000 --project myapp --name web
shiplocal 4000 --project myapp --name api
```

Run **`next start`** (or your production server) on the web port. The overlay injects into the **frontend** HTML, not the API.

### Turborepo / monorepos

Turbo orchestrates tasks — it is not the app server. Build and start **one app** at a time:

```bash
npx turbo run build --filter=hub
cd apps/hub && npm run start
shiplocal 3000
```

Tunnel the port of the app the client should see (`hub`, `web`, etc.), not the monorepo root.

### Next.js: disable HTML compression for feedback

`next start` enables gzip on HTML by default (`compress: true`). ShipLocal injects the overlay into **plain, uncompressed HTML**. If the response has a `content-encoding` header, we skip injection — the tunnel works, but there is no 💬 button and no `overlay.js` tag in page source.

For client review sessions, add this to **`next.config.js`** (or `next.config.mjs`) in the app you tunnel:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: false,
};

export default nextConfig;
```

Then rebuild and restart (`next build && next start`, or your Turbo filter). **Verify:** View Page Source on the **public** tunnel URL — you should see `data-shiplocal-overlay` before `</body>`.

This only affects the local preview you tunnel for feedback; your deployed production site can keep compression enabled.

We may add automatic decompress-and-inject later; until then, `compress: false` on the preview build is the reliable fix for Next.js.

---

## Opt-in: overlay during dev (`--feedback`)

If you need feedback while still on `npm run dev`, you can opt in:

```bash
shiplocal 3000 --feedback
```

This tells the server to inject the overlay even when dev bundler markers are present.

**Warnings:**

- You may see **reload loops** or flaky HMR on Next.js/Vite
- Animations and `useInView` timing can look wrong through the tunnel
- Use for quick internal tests, not as the default client handoff

When the CLI starts with `--feedback`, it prints a reminder about these tradeoffs.

---

## When CSP blocks the overlay

Some apps send a strict `Content-Security-Policy` (e.g. `script-src 'self'` only). ShipLocal checks CSP **before** injecting. If `https://shiplocal.cloud/overlay.js` would be blocked, we skip injection rather than add a script the browser will reject.

**What to do:**

- Prefer the **Review URL** (feedback UI is on ShipLocal’s origin, not injected into your HTML), or
- Use a production preview without strict CSP on script sources, or
- Wait for the **browser extension** (coming later) — it loads feedback UI without modifying your HTML

---

## Coming later: browser extension

We are exploring a Chrome extension that:

1. Detects when you are on a `*.shiplocal.cloud` preview tab
2. Injects feedback UI via a **content script** (not proxy HTML injection)
3. Posts comments to the same API as the built-in overlay

Because the extension does not change your app's HTML, it should not trigger Fast Refresh or HMR reload loops on dev pages. Until then, use the **Review URL** for the same “outside your HTML” benefit on share links.

---

## Checklist before sending a client link

1. **Do they need click-to-comment?** If yes, do not rely on `npm run dev` alone.
2. **Run a review build:** `next build && next start` (or equivalent). **Next.js:** set `compress: false` in `next.config` if overlay is missing from page source.
3. **Open the tunnel:** `shiplocal <port>`.
4. **Verify overlay:** View source on the public URL for `data-shiplocal-overlay`.
5. **Share the Public URL** from the CLI (not localhost).
6. **Optional:** password-protect with `shiplocal 3000 --password secret`.

If something breaks, run `shiplocal doctor <port>` and paste the output when asking for help.

---

## Summary

| Goal                            | Command / approach                                                                     |
| ------------------------------- | -------------------------------------------------------------------------------------- |
| Share WIP quickly (no feedback) | `npm run dev` + `shiplocal 3000`                                                       |
| Client feedback (recommended)   | `next build && next start` + `shiplocal 3000` (Next.js: `compress: false` for overlay) |
| Feedback on dev (risky)         | `shiplocal 3000 --feedback`                                                            |
| Strict CSP app                  | Extension (future) or relax CSP for preview                                            |
| Tunnel only (self-host)         | Core — no Cloud overlay                                                                |

The tunnel is the entry point; **review-ready previews** are how client feedback shines. Plan your client session around a production-like build, and everyone gets a smoother experience.

---

_Related: [The feedback overlay reload loop](/blog/the-feedback-overlay-reload-loop) · [Dashboard](https://app.shiplocal.cloud)_
