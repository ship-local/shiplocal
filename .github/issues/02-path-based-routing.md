## Problem

Two tunnel URLs work but add friction (env vars, CORS, two links for clients). A single project URL feels more like a real deployment.

## Proposal

Single preview URL with internal routing:

```
https://myproject.shiplocal.cloud/api/*  → localhost:4000
https://myproject.shiplocal.cloud/*      → localhost:3000
```

## Layer

Core/Cloud

## Notes

Requires careful namespacing — user app `/api` routes on preview subdomains must not collide with platform API routes on the apex domain.

Part of [ROADMAP v0.2](https://github.com/ship-local/shiplocal/blob/main/ROADMAP.md).
