## Problem

Developers must manually swap env vars when tunneling:

```env
# Before
NEXT_PUBLIC_API=http://localhost:4000

# After
NEXT_PUBLIC_API=https://api-xyz.shiplocal.cloud
```

Easy to forget; breaks full-stack previews.

## Proposal

CLI helper that detects common env var patterns and suggests or applies rewrites when a tunnel URL is created:

```bash
shiplocal 4000 --rewrite-env
# or interactive prompt after tunnel starts
```

## Layer

Core

## Notes

Step toward zero-config simulator (`shiplocal up`). Part of [ROADMAP v0.2+](https://github.com/ship-local/shiplocal/blob/main/ROADMAP.md).
