# ShipLocal Core

> **Open-source tunnel engine** — share localhost with a public URL.

ShipLocal Core is the MIT-licensed self-hostable tunnel: CLI, WebSocket reverse proxy, dashboard, and API. Run it on your own VPS or connect the CLI to [ShipLocal Cloud](https://shiplocal.cloud).

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**Managed Cloud (feedback overlay, collaboration):** [shiplocal.cloud](https://shiplocal.cloud) · **Full private codebase:** `ship-local/cloud` (not public)

## Features (Core)

- **Instant tunnels** — `shiplocal 3000` → public HTTPS preview URL
- **WebSocket tunnel** — reverse proxy to localhost
- **Dashboard** — auth, projects, tunnel management
- **Password-protected previews** — `shiplocal 3000 --password secret`
- **Self-hostable** — Docker + Postgres ([docs/self-hosting.md](docs/self-hosting.md))

Client feedback overlay and Cloud collaboration features are **not** included in Core — they ship with ShipLocal Cloud.

## Quick start

```bash
pnpm install
pnpm docker:up
cp apps/server/.env.example apps/server/.env
cp apps/dashboard/.env.example apps/dashboard/.env.local
pnpm db:migrate
pnpm dev
```

Set `SHIPLOCAL_EDITION=core` in `apps/server/.env` (default in this repo).

## CLI (npm)

```bash
npm install -g shiplocal
export SHIPLOCAL_API_URL=https://your-server.example.com
shiplocal login
shiplocal 3000
```

## Documentation

| Doc                                          | Description          |
| -------------------------------------------- | -------------------- |
| [docs/quickstart.md](docs/quickstart.md)     | Zero to first tunnel |
| [docs/self-hosting.md](docs/self-hosting.md) | Run on your VPS      |
| [ROADMAP.md](ROADMAP.md)                     | Product roadmap      |
| [CONTRIBUTING.md](CONTRIBUTING.md)           | Contribute to Core   |

## Open-core model

|                           | Core (this repo) | Cloud (private) |
| ------------------------- | ---------------- | --------------- |
| Visibility                | Public MIT       | Private SaaS    |
| Tunnel engine             | ✅               | ✅              |
| Feedback overlay          | ❌               | ✅              |
| Hosted at shiplocal.cloud | —                | ✅              |

Develop the full product in the private Cloud repo; sync Core to this public repo with `./scripts/sync-core-public.sh` from the Cloud monorepo.

## License

MIT — see [LICENSE](LICENSE).
