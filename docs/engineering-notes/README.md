# Engineering notes (internal)

These documents started as public “blog skeletons” during a debugging week. They are useful for ShipLocal maintainers, but they are **not** the public product blog.

Public posts live in [`apps/dashboard/content/blog/`](../apps/dashboard/content/blog/) and are meant for developers/agencies using ShipLocal (problem/vision, product how-tos, selected building-in-public stories).

This folder keeps deeper implementation / ops / roadmap notes so they do not clutter `/blog`.

## Index

| Note                                                                                                       | Topic                                         |
| ---------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| [content-security-policy-and-feedback-injection.md](./content-security-policy-and-feedback-injection.md)   | CSP parsing before overlay injection          |
| [brotli-gzip-and-the-content-encoding-trap.md](./brotli-gzip-and-the-content-encoding-trap.md)             | CLI compression + server header coupling      |
| [reserved-subdomains-and-host-routing-bugs.md](./reserved-subdomains-and-host-routing-bugs.md)             | `app`/`www`/`api`/`admin` must not be tunnels |
| [dashboard-loading-states-and-request-pile-ups.md](./dashboard-loading-states-and-request-pile-ups.md)     | Sticky loading flags, poll pile-ups, timeouts |
| [rate-limiting-vs-vite-module-storms.md](./rate-limiting-vs-vite-module-storms.md)                         | Allow-list preview traffic vs API rate limits |
| [framer-motion-intersection-observer-and-tunnels.md](./framer-motion-intersection-observer-and-tunnels.md) | Class 3 observer timing side effects          |
| [deferring-feedback-overlay-init.md](./deferring-feedback-overlay-init.md)                                 | `requestIdleCallback` for overlay init        |
| [detecting-next-and-vite-dev-html.md](./detecting-next-and-vite-dev-html.md)                               | Dev bundler markers for injection skip        |
| [only-html-should-be-intercepted.md](./only-html-should-be-intercepted.md)                                 | Proxy rule: mutate HTML, pipe the rest        |
| [gunzip-modify-gzip-html-injection.md](./gunzip-modify-gzip-html-injection.md)                             | Skip injection when HTML is encoded           |
| [adoption-before-optimization-tunnel-roadmap.md](./adoption-before-optimization-tunnel-roadmap.md)         | v0.2–v0.5 internal roadmap narrative          |
| [binary-websocket-frames-vs-base64-in-json.md](./binary-websocket-frames-vs-base64-in-json.md)             | v0.3 protocol direction                       |
| [etag-304-and-session-caching-for-tunnels.md](./etag-304-and-session-caching-for-tunnels.md)               | v0.4 caching direction                        |
| [base64-is-quietly-costing-you-thirty-percent.md](./base64-is-quietly-costing-you-thirty-percent.md)       | Payload math for control-plane bodies         |

## Public blog (keep)

Rough filter for what stays on `/blog`:

- Problem / vision for the product
- How ShipLocal works (user education)
- Product announcements and how-tos
- Building-in-public stories that help users debug real apps
- Feature explainers users can act on (`doctor`, feedback overlay, multi-target)

If a draft is mostly “what we changed in `routes.ts` / Fastify rate-limit allowList / release coupling,” it belongs here instead.
