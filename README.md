# ShipLocal

> From localhost to client-ready.

Share localhost with clients in seconds and collect visual feedback on the live preview.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Features

- **Instant tunnels** — expose any local port via a public URL
- **Client feedback** — 💬 overlay for element-level comments + screenshots
- **Dashboard** — manage tunnels, view feedback, stop/restart sessions
- **Password-protected previews** — `shiplocal 3000 --password secret`
- **Self-hostable** — run on your own VPS (see `docs/self-hosting.md`)

## Quick start (local)

```bash
pnpm install
pnpm docker:up
cp apps/server/.env.example apps/server/.env
cp apps/dashboard/.env.example apps/dashboard/.env.local
pnpm db:migrate
pnpm dev
```

Open http://localhost:3001 — full guide in [docs/quickstart.md](docs/quickstart.md).

## CLI

```bash
pnpm tunnel login
pnpm tunnel 3000                  # expose port 3000
pnpm tunnel 3000 --password demo  # password-protected preview
```

For global install (after npm publish): `npm install -g shiplocal`

## Documentation

| Doc                                          | Description               |
| -------------------------------------------- | ------------------------- |
| [docs/quickstart.md](docs/quickstart.md)     | Zero to first tunnel      |
| [docs/self-hosting.md](docs/self-hosting.md) | Run on your own server    |
| [docs/deploy.md](docs/deploy.md)             | Production VPS deployment |
| [docs/publish-cli.md](docs/publish-cli.md)   | npm publish checklist     |

## Project structure

```
apps/
  dashboard/          Next.js dashboard + landing
  server/             Fastify API + tunnel server
packages/
  cli/                shiplocal CLI
  feedback-overlay/   Client 💬 widget
  shared/             Types, protocol, validation
  tunnel-client/      WebSocket tunnel client
deploy/               Caddy + Docker for production
docs/                 Guides
```

## Scripts

| Command            | Description                 |
| ------------------ | --------------------------- |
| `pnpm dev`         | Start server + dashboard    |
| `pnpm build`       | Build all packages          |
| `pnpm tunnel 3000` | Start CLI tunnel (shortcut) |
| `pnpm db:migrate`  | Run Prisma migrations       |
| `pnpm docker:up`   | Start Postgres + Redis      |

## Production deploy

1. Configure env (see `apps/server/.env.example`)
2. `pnpm build && pnpm db:migrate`
3. `docker compose -f docker/docker-compose.prod.yml up -d`
4. Point Caddy at ports 3001/4000 (`deploy/Caddyfile`)

Details: [docs/deploy.md](docs/deploy.md)

## Troubleshooting

### Database connection (`P1010`)

ShipLocal Postgres runs on host port **5433** to avoid conflicts:

```
DATABASE_URL="postgresql://shiplocal:shiplocal@localhost:5433/shiplocal?schema=public"
```

Run `pnpm docker:up` before migrations.

### Tunnel shows blank page

Ensure your local app is running on the port passed to the CLI. The tunnel forwards to `127.0.0.1:<port>`.

### `shiplocal: command not found`

Use `pnpm tunnel` from the repo root, or `pnpm link --global --filter shiplocal` after building.

## License

MIT — see [LICENSE](LICENSE). Cloud-specific features may remain proprietary per open-core strategy.
