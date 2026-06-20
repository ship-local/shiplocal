## Problem

Developers running full-stack apps often have a frontend on `:3000` and an API on `:4000`. A single tunnel only exposes one port. The client's browser cannot reach `localhost:4000` on the developer's machine.

## Proposal

Allow multiple tunnel targets within one ShipLocal project:

```bash
shiplocal 3000
shiplocal 4000
```

Creates two URLs, e.g.:

- `https://myapp.shiplocal.cloud` → frontend
- `https://api.myapp.shiplocal.cloud` → backend

Developer sets `API_URL` to the API tunnel URL.

## Layer

Core

## Notes

Part of [ROADMAP v0.2](https://github.com/ship-local/shiplocal/blob/main/ROADMAP.md). Prerequisite for full-stack agency demos. Related: path-based routing (single-URL alternative).
