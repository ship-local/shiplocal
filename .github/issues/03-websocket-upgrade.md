## Problem

Apps using Socket.io, realtime dashboards, or other WebSocket clients may fail through the HTTP-only proxy path. ShipLocal's tunnel control plane uses WebSocket, but proxied user traffic needs `Upgrade: websocket` passthrough.

## Proposal

Ensure the reverse proxy forwards WebSocket upgrade headers and maintains bidirectional frames for user applications.

## Layer

Core

## Acceptance criteria

- [ ] Socket.io or native WS app works through a preview URL
- [ ] Document limitations in self-hosting docs

Part of [ROADMAP v0.2](https://github.com/ship-local/shiplocal/blob/main/ROADMAP.md).
