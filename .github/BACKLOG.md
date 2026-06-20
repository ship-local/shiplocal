# GitHub issue backlog

Pre-written issues from [DEVELOPMENT.md](../DEVELOPMENT.md) §10. File these during Phase 5:

```bash
# Example — copy body from a section below
gh issue create --title "..." --label "enhancement,core" --body-file .github/issues/01-multiple-tunnel-targets.md
```

Create labels first if needed: `gh label create core --color 0E8A16` and `gh label create enhancement --color 1D76DB`.

---

## 1. Support multiple tunnel targets

**Labels:** `enhancement`, `core`, `good first issue` (maybe)

**Title:** Support multiple tunnel targets per project

**Body:** see [issues/01-multiple-tunnel-targets.md](./issues/01-multiple-tunnel-targets.md)

---

## 2. Path-based routing

**Labels:** `enhancement`, `core`

**Title:** Path-based routing for full-stack previews (`/api/*`)

**Body:** see [issues/02-path-based-routing.md](./issues/02-path-based-routing.md)

---

## 3. WebSocket upgrade for user apps

**Labels:** `enhancement`, `core`

**Title:** WebSocket upgrade support for proxied user apps

**Body:** see [issues/03-websocket-upgrade.md](./issues/03-websocket-upgrade.md)

---

## 4. CORS + cookie rewrite

**Labels:** `enhancement`, `core`

**Title:** CORS and cookie rewrite for preview domains

**Body:** see [issues/04-cors-cookie-rewrite.md](./issues/04-cors-cookie-rewrite.md)

---

## 5. Auto-detect running services

**Labels:** `enhancement`, `core`, `good first issue`

**Title:** Auto-detect running local services and suggest ports

**Body:** see [issues/05-auto-detect-services.md](./issues/05-auto-detect-services.md)

---

## 6. Feedback reply threads

**Labels:** `enhancement`, `cloud`

**Title:** Feedback reply threads for clients

**Body:** see [issues/06-feedback-reply-threads.md](./issues/06-feedback-reply-threads.md)

---

## 7. CLI env var rewrite helper

**Labels:** `enhancement`, `core`

**Title:** CLI helper to rewrite localhost URLs in environment variables

**Body:** see [issues/07-cli-env-rewrite.md](./issues/07-cli-env-rewrite.md)
