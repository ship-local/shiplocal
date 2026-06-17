# Deploy ShipLocal to production

Guide for deploying ShipLocal Cloud to a VPS with HTTPS and wildcard subdomains.

## Architecture

```
                    ┌─────────────┐
   Client browser ──│   Caddy     │── HTTPS
                    │  (reverse   │
                    │   proxy)    │
                    └──────┬──────┘
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    Dashboard :3001   API/Tunnel :4000   Postgres
    app.shiplocal.app  *.shiplocal.app
```

## 1. Server requirements

- Ubuntu 22.04+ or similar
- 2 GB RAM minimum
- Docker + Docker Compose
- Domain with wildcard DNS: `*.shiplocal.app` → server IP

## 2. Clone and configure

```bash
git clone https://github.com/ship-local/shiplocal.git
cd shiplocal
pnpm install
cp apps/server/.env.example apps/server/.env
cp apps/dashboard/.env.example apps/dashboard/.env.local
```

Edit `apps/server/.env`:

```env
NODE_ENV=production
DATABASE_URL=postgresql://shiplocal:STRONG_PASSWORD@postgres:5432/shiplocal
JWT_SECRET=<openssl rand -hex 32>
SHIPLOCAL_DOMAIN=shiplocal.app
API_PUBLIC_URL=https://shiplocal.app
DASHBOARD_URL=https://app.shiplocal.app
PORT=4000
HOST=0.0.0.0
TUNNEL_EXPIRY_HOURS=8
```

Edit `apps/dashboard/.env.local`:

```env
NEXT_PUBLIC_API_URL=https://shiplocal.app
```

## 3. Deploy API server (Docker)

On the VPS you only need to rebuild the **server container** — not the full monorepo (host `pnpm build` can fail on the CLI package; that is fine):

```bash
git pull
docker compose -f docker/docker-compose.prod.yml --env-file docker/.env up -d --build
pnpm db:migrate   # first deploy or after schema changes
```

## 5. Caddy (HTTPS + wildcard)

Install Caddy on the host and use `deploy/Caddyfile`:

```bash
sudo cp deploy/Caddyfile /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Caddy obtains Let's Encrypt certificates for the apex and wildcard (DNS challenge required for wildcard).

## 6. Verify

```bash
curl https://shiplocal.app/health
```

Register at `https://app.shiplocal.app/register`, then:

```bash
export SHIPLOCAL_API_URL=https://shiplocal.app
shiplocal login
shiplocal 3000
```

## 7. Beta onboarding

Manually invite 5–10 agencies:

1. Create account for them or send invite link
2. Walk through CLI login + first tunnel
3. Collect feedback in a shared doc

## Monitoring

- Health: `GET /health`
- Tunnel logs: server stdout (`tunnel request` JSON lines)
- Uptime: external ping on `/health`

## Rollback

```bash
docker compose -f docker/docker-compose.prod.yml down
git checkout <previous-tag>
pnpm build && pnpm db:migrate
docker compose -f docker/docker-compose.prod.yml up -d
```
