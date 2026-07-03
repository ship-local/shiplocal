# ShipLocal Roadmap

> **From localhost to client-ready.**

This is the public roadmap for [ShipLocal](https://github.com/ship-local/shiplocal) — an open-source local development collaboration platform. For architecture and internal planning details, see [DEVELOPMENT.md](DEVELOPMENT.md).

**Current focus:** v0.2 — tunnel correctness for real dev apps, then beta adoption.

**Prioritization principle:** The biggest unknown is not “can the protocol be faster?” — it is whether developers adopt this workflow. Performance work follows measurement and real user feedback.

---

## v0.1 — Developer Preview

The core loop: share localhost, collect visual client feedback.

| Feature                                                  | Status             |
| -------------------------------------------------------- | ------------------ |
| CLI (`shiplocal 3000`)                                   | ✅ Shipped         |
| WebSocket tunnel + HTTP reverse proxy                    | ✅ Shipped         |
| Public preview URLs (`*.shiplocal.app`)                  | ✅ Shipped         |
| Dashboard — auth, projects, tunnel management            | ✅ Shipped         |
| Client feedback overlay (click-to-comment + screenshots) | ✅ Shipped         |
| Password-protected previews                              | ✅ Shipped         |
| npm publish (`shiplocal` on npm)                         | ✅ Shipped (0.1.6) |
| Production deploy (Hetzner Cloud)                        | ✅ Shipped         |

---

## v0.2 — Tunnel correctness + adoption _(current)_

Make real dev apps (Next.js, Vite, etc.) work reliably through the tunnel. Gather beta users before protocol changes.

| Feature                                              | Status         |
| ---------------------------------------------------- | -------------- |
| Skip feedback overlay on dev bundler HTML (HMR)      | ✅ Shipped     |
| Fix dev reload loop (overlay dedupe + deferred init) | ✅ Shipped     |
| WebSocket HMR relay for user apps                    | ✅ Shipped     |
| Asset compression (brotli/gzip) on tunnel leg        | ✅ Shipped     |
| Skip feedback overlay when CSP blocks injection      | ✅ Shipped     |
| `shiplocal doctor` / tunnel benchmark                | ✅ Shipped     |
| Path-based routing (`/api/*` → backend)              | ⬜ Planned     |
| Beta users (5–10 agencies/freelancers)               | 🔄 In progress |
| Multiple tunnel targets per project                  | ✅ Shipped     |
| CORS + cookie rewrite for preview domains            | ✅ Shipped     |
| CLI env rewrite helper (`--rewrite-env`)             | ✅ Shipped     |

---

## v0.3 — Protocol efficiency

Optimize the **current** request/response model before considering streaming.

| Feature                                          | Status     |
| ------------------------------------------------ | ---------- |
| Binary WebSocket frames (replace base64-in-JSON) | ⬜ Planned |
| Benchmark suite + before/after metrics           | ⬜ Planned |

---

## v0.4 — Caching

| Feature                                              | Status     |
| ---------------------------------------------------- | ---------- |
| ETag / `Last-Modified` / `304` per tunnel session    | ⬜ Planned |
| Session static-asset cache (fonts, images, favicons) | ⬜ Planned |

Measure again after shipping. Only proceed to v0.5 if real users still hit unacceptable latency.

---

## v0.5 — Streaming (conditional)

| Feature                          | Status                                       |
| -------------------------------- | -------------------------------------------- |
| Streamed responses (protocol v2) | ⬜ Deferred — only if v0.3–v0.4 insufficient |

---

## v0.6+ — Team workflows & Cloud

| Area             | Examples                                                         |
| ---------------- | ---------------------------------------------------------------- |
| Team workflows   | Teams, roles, persistent URLs, approval workflow, client portal  |
| Commercial Cloud | Billing, plan limits, custom domains, analytics                  |
| Long-term vision | Zero-config simulator, AI feedback assistant, GitHub PR previews |

---

## How we prioritize

1. **Correctness for real apps** — overlay, HMR, CSP (v0.2)
2. **Beta adoption** — prove the workflow matters before optimizing protocol
3. **Measured performance** — binary frames (v0.3), then caching (v0.4)
4. **Streaming last** — only if data from real users demands it (v0.5)

---

## Contributing

Want to help? Check [open issues](https://github.com/ship-local/shiplocal/issues) or propose one for docs, tests, UI, or framework detection. Core tunnel and security work stays maintainer-led during early beta.

---

_Last updated: July 2026_
