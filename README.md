# ShipLocal

> From localhost to client-ready.

Share localhost with clients in seconds and collect visual feedback.

## Prerequisites

- **Node.js 20+** ([nvm](https://github.com/nvm-sh/nvm): `nvm use`)
- **pnpm 9+** (`corepack enable && corepack prepare pnpm@9.15.9 --activate`)
- **Docker** (for Postgres and Redis)

## Quick start

```bash
# 1. Install dependencies
pnpm install

# 2. Start Postgres (+ Redis)
docker compose -f docker/docker-compose.yml up -d

# 3. Configure environment
cp apps/server/.env.example apps/server/.env
cp apps/dashboard/.env.example apps/dashboard/.env.local

# 4. Run database migrations
pnpm db:migrate

# 5. Start dev servers (API + dashboard)
pnpm dev
```

Open:

- Dashboard: http://localhost:3001
- API health: http://localhost:4000/health

## Scripts

| Command           | Description              |
| ----------------- | ------------------------ |
| `pnpm dev`        | Start server + dashboard |
| `pnpm build`      | Build all packages       |
| `pnpm lint`       | Lint all packages        |
| `pnpm typecheck`  | Typecheck all packages   |
| `pnpm db:migrate` | Run Prisma migrations    |
| `pnpm db:studio`  | Open Prisma Studio       |

## Project structure

```
apps/
  dashboard/   Next.js dashboard
  server/      Fastify API + tunnel server
packages/
  cli/         shiplocal CLI
  shared/      Shared types and validation
  tunnel-client/  WebSocket tunnel client
```

## CLI

```bash
# 1. Log in (saves token to ~/.shiplocal/config.json)
pnpm --filter shiplocal build
node packages/cli/dist/index.js login

# 2. Start your local app on port 3000

# 3. Start ShipLocal server
pnpm --filter @shiplocal/server dev

# 4. Expose localhost
node packages/cli/dist/index.js 3000
```

You'll get a public URL like `http://happy-lion.localhost:4000`. Manage tunnels at http://localhost:3001/dashboard.

For local development, set `SHIPLOCAL_DOMAIN=localhost` in `apps/server/.env`.

## Troubleshooting

### `P1010: User was denied access` on `pnpm db:migrate`

1. **Start Docker first** — `pnpm docker:up` (Docker Desktop must be running).
2. **Port conflict** — ShipLocal Postgres runs on host port **5433** (not 5432) so it does not clash with a local Postgres install. Ensure `apps/server/.env` uses:
   ```
   DATABASE_URL="postgresql://shiplocal:shiplocal@localhost:5433/shiplocal?schema=public"
   ```
3. **Restart containers** after changing ports:
   ```bash
   pnpm docker:down && pnpm docker:up
   ```
