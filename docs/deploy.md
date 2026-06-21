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

**Production Cloud uses the private repo** — not the public Core repo:

```bash
git clone git@github.com:ship-local/cloud.git shiplocal
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

# Required for Cloud features (feedback overlay, comments API)
SHIPLOCAL_EDITION=cloud
```

Edit `apps/dashboard/.env.local`:

```env
NEXT_PUBLIC_API_URL=https://shiplocal.cloud

# Required for Cloud dashboard (feedback UI)
NEXT_PUBLIC_SHIPLOCAL_EDITION=cloud
```

## 3. Deploy API server (Docker)

On the VPS you only need to rebuild the **server container** — not the full monorepo (host `pnpm build` can fail on the CLI package; that is fine):

```bash
git pull
docker compose -f docker/docker-compose.prod.yml --env-file docker/.env up -d --build
pnpm db:migrate   # first deploy or after schema changes
```

## 4. Deploy dashboard (PM2)

The dashboard must run **`next start`** (production), not `next dev`. If it runs in dev mode behind Caddy, CSS/JS return **400** and `/login` appears blank.

```bash
cd /var/www/shiplocal
git pull
pnpm install
pnpm --filter @shiplocal/dashboard build

# Stop old process if any (dev server or stale PM2 name)
pm2 delete shiplocal-dashboard 2>/dev/null || pm2 delete dashboard 2>/dev/null || true

pm2 start deploy/ecosystem.config.cjs
pm2 save
```

**Troubleshooting**

| Symptom                    | Cause                   | Fix                                                                 |
| -------------------------- | ----------------------- | ------------------------------------------------------------------- |
| `502` from Caddy           | Nothing on port 3001    | `pm2 logs shiplocal-dashboard` — usually missing build or PM2 crash |
| `400` on `/_next/static/*` | `next dev` behind Caddy | Use `next start` via PM2 config above                               |
| Blank `/login`             | JS failed to load       | Fix static assets first                                             |

```bash
# Is anything listening?
ss -tlnp | grep 3001

# PM2 status + logs
pm2 status
pm2 logs shiplocal-dashboard --lines 50

# Rebuild if .next is missing
pnpm --filter @shiplocal/dashboard build
pm2 restart shiplocal-dashboard
```

Ensure `apps/dashboard/.env.local` contains:

```env
NEXT_PUBLIC_API_URL=https://shiplocal.cloud
NEXT_PUBLIC_SHIPLOCAL_EDITION=cloud
```

Verify static assets load:

```bash
curl -sI https://app.shiplocal.cloud/_next/static/css/$(curl -s https://app.shiplocal.cloud | grep -o '/_next/static/css/[^"]*' | head -1 | cut -d/ -f5)
# Should return HTTP 200, not 400
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
