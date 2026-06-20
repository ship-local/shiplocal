## Problem

When frontend and API use separate tunnel URLs (different subdomains), browsers enforce CORS. Backend `Set-Cookie: Domain=localhost` does not work on preview domains.

## Proposal

- Rewrite or inject appropriate `Access-Control-Allow-Origin` for split-tunnel setups
- Rewrite `Set-Cookie` domain attributes for preview hostnames
- Document required Fastify/Express CORS config for self-hosters

## Layer

Core/Cloud

## Notes

Required for split frontend/API tunnels. Part of [ROADMAP v0.2](https://github.com/ship-local/shiplocal/blob/main/ROADMAP.md).
