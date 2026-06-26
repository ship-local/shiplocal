# ShipLocal Roadmap

> **From localhost to client-ready.**

This is the public roadmap for [ShipLocal](https://github.com/ship-local/shiplocal) — an open-source local development collaboration platform. For architecture and internal planning details, see [DEVELOPMENT.md](DEVELOPMENT.md).

**Current focus:** Phase 4 exit (beta users) → Phase 5 (validation and public building).

---

## v0.1 — Developer Preview _(current)_

The core loop: share localhost, collect visual client feedback.

| Feature                                                  | Status                                       |
| -------------------------------------------------------- | -------------------------------------------- |
| CLI (`shiplocal 3000`)                                   | ✅ Shipped                                   |
| WebSocket tunnel + HTTP reverse proxy                    | ✅ Shipped                                   |
| Public preview URLs (`*.shiplocal.app`)                  | ✅ Shipped                                   |
| Dashboard — auth, projects, tunnel management            | ✅ Shipped                                   |
| Client feedback overlay (click-to-comment + screenshots) | ✅ Shipped                                   |
| Password-protected previews                              | ✅ Shipped                                   |
| npm publish (`shiplocal` on npm)                         | ✅ Shipped                                   |
| Production deploy (Hetzner Cloud)                        | ✅ Shipped                                   |
| Beta users (5–10 agencies/freelancers)                   | 🔄 In progress                               |
| Real-time comment push (WebSocket)                       | ⬜ Optional — dashboard polls every 5s today |

---

## v0.2 — Full-stack apps

Unblock frontend + backend demos without the localhost trap.

| Feature                                                  | Status     |
| -------------------------------------------------------- | ---------- |
| Multiple tunnel targets per project                      | ✅ Shipped |
| Path-based routing (`/api/*` → backend, rest → frontend) | ⬜ Planned |
| WebSocket upgrade for user apps (Socket.io, etc.)        | ⬜ Planned |
| CORS + cookie rewrite for preview domains                | ✅ Shipped |
| CLI env rewrite helper (`--rewrite-env`)                 | ✅ Shipped |
| Webhook use-case docs (Stripe, Paystack, GitHub)         | ⬜ Planned |
| Feedback reply threads                                   | ⬜ Planned |

---

## v0.3 — Team workflows

Agency collaboration features.

| Feature                                       | Status     |
| --------------------------------------------- | ---------- |
| Teams and roles                               | ⬜ Planned |
| Persistent preview URLs                       | ⬜ Planned |
| Access control                                | ⬜ Planned |
| Approval workflow (Draft → Review → Approved) | ⬜ Planned |
| Client portal                                 | ⬜ Planned |

---

## v0.4 — Commercial Cloud

| Feature                         | Status     |
| ------------------------------- | ---------- |
| Billing (Paystack / Stripe)     | ⬜ Planned |
| Plan limits and usage dashboard | ⬜ Planned |
| Custom domains / white-label    | ⬜ Planned |
| Analytics                       | ⬜ Planned |

---

## Long-term vision

- **Zero-config simulator** — `shiplocal up` auto-detects Next.js, API, rewrites env vars
- **AI feedback assistant** — turn client comments into actionable suggestions
- **GitHub integration** — preview on pull requests
- **Agency OS** — proposals, contracts, invoices, deployment handoff

---

## How we prioritize

1. **Beta feedback first** — fix what breaks for real client sessions before adding features
2. **Full-stack support next** — the most common gap after single-page demos
3. **Team workflows** — monetization hook for agencies
4. **Platform expansion** — only after the core loop is proven at scale

---

## Contributing

Want to help? Check [open issues](https://github.com/ship-local/shiplocal/issues) or propose one for docs, tests, UI, or framework detection. Core tunnel and security work stays maintainer-led during early beta.

---

_Last updated: June 2026_
