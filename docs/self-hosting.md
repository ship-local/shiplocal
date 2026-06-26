# Self-hosting ShipLocal

Run ShipLocal on your own server or locally without ShipLocal Cloud.

## What you get

- Tunnel server (WebSocket + HTTP proxy)
- Dashboard (tunnel management + client feedback)
- CLI (`shiplocal` / `pnpm tunnel`)
- Postgres for users, tunnels, and comments

## Local development

See [quickstart.md](./quickstart.md).

Key environment variables (`apps/server/.env`):

| Variable           | Example                 | Purpose               |
| ------------------ | ----------------------- | --------------------- |
| `DATABASE_URL`     | `postgresql://...`      | Postgres connection   |
| `JWT_SECRET`       | long random string      | Auth tokens           |
| `SHIPLOCAL_DOMAIN` | `localhost`             | Tunnel subdomain base |
| `DASHBOARD_URL`    | `http://localhost:3001` | OAuth redirects       |
| `API_PUBLIC_URL`   | `http://localhost:4000` | Overlay script + API  |

For local tunnels, set `SHIPLOCAL_DOMAIN=localhost`. Public URLs look like `http://subdomain.localhost:4000`.

## Multi-target full-stack previews

Expose frontend and API as coordinated URLs under one project:

```bash
# Terminal 1 — frontend (web target)
shiplocal 3000 --project myapp

# Terminal 2 — API
shiplocal 4000 --project myapp --name api
```

This creates flat subdomains:

- `https://myapp.yourdomain.com` → localhost:3000
- `https://myapp-api.yourdomain.com` → localhost:4000

Set your frontend env to the API tunnel URL, or use the env helper:

```bash
shiplocal 4000 --project myapp --name api --rewrite-env
```

The tunnel proxy automatically adds CORS headers when the browser origin is another tunnel in the same project, and rewrites `Set-Cookie` domains from `localhost` to the preview hostname.

Without `--project`, tunnels keep the legacy random subdomain behavior (`bright-badger`, etc.).

## Production self-host

1. Provision a VPS (Ubuntu 22.04+ recommended).
2. Point DNS:
   - `shiplocal.yourdomain.com` → dashboard
   - `*.shiplocal.yourdomain.com` → tunnel server (wildcard)
3. Copy `deploy/Caddyfile` and adjust domains.
4. Use `docker/docker-compose.prod.yml` or run Node processes with PM2.
5. Set production env:

```env
NODE_ENV=production
SHIPLOCAL_DOMAIN=shiplocal.yourdomain.com
API_PUBLIC_URL=https://shiplocal.yourdomain.com
DASHBOARD_URL=https://app.yourdomain.com
JWT_SECRET=<generate-with-openssl-rand-hex-32>
```

6. Run migrations: `pnpm db:migrate`
7. Build: `pnpm build`
8. Start server: `pnpm --filter @shiplocal/server start`
9. Start dashboard: `pnpm --filter @shiplocal/dashboard start`

See [deploy.md](./deploy.md) for Caddy + Docker details.

## Security checklist

- [ ] Strong `JWT_SECRET` (32+ random bytes)
- [ ] HTTPS via Caddy or nginx
- [ ] Rate limiting enabled (built into server)
- [ ] Use `--password` on tunnels for sensitive previews
- [ ] Do not expose Postgres publicly

## Core vs Cloud

This monorepo includes Cloud features (feedback overlay, dashboard polish). When open-sourcing Core (month 3+), the self-host bundle will be tunnel + basic dashboard only.
