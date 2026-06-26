# Migrate production VPS from public Core → private Cloud repo

Use this when `/var/www/shiplocal` was cloned from **`ship-local/shiplocal`** (public) but production runs **ShipLocal Cloud** and should track **`ship-local/cloud`** (private).

**Goal:** Fresh Cloud clone at `/var/www/shiplocal`, same Postgres data, same ports, minimal downtime (~30–90 seconds while PM2 restarts).

**What stays untouched:** Postgres Docker volume, Caddy TLS certs, `docker/.env`, env secrets.

---

## Before you start

### On your laptop

1. Push all production-ready code (including landing page) to **private Cloud**:

   ```bash
   git push cloud main
   ```

2. Confirm GitHub SSH access from the VPS to the private repo:

   ```bash
   ssh root@your-vps 'ssh -T git@github.com'
   # Hi ship-local! You've successfully authenticated...
   ```

   If that fails, add the VPS deploy key to GitHub (repo **Settings → Deploy keys**, or org key with access to `ship-local/cloud`).

### On the VPS — snapshot current state

```bash
cd /var/www/shiplocal

# Back up secrets (not in git)
cp apps/server/.env ~/shiplocal-migrate-server.env.bak
cp apps/dashboard/.env.local ~/shiplocal-migrate-dashboard.env.local.bak
test -f docker/.env && cp docker/.env ~/shiplocal-migrate-docker.env.bak

# Note running services
pm2 status
docker compose -f docker/docker-compose.prod.yml ps
ss -tlnp | grep -E '3001|4000'

# Optional: record current commit
git rev-parse HEAD > ~/shiplocal-migrate-old-head.txt
```

---

## Migration strategy (near-zero downtime)

Caddy keeps listening on `:443` the whole time. Downtime is only while:

1. Docker API container is rebuilt (tunnels drop briefly), and/or
2. PM2 dashboard restarts (~5–15 s)

**Order:** clone new tree → copy env → build in new tree → swap directories → restart services → verify → keep backup 48 h.

---

## Step 1 — Clone Cloud repo alongside the old tree

```bash
cd /var/www

# Old tree becomes backup (do NOT delete yet)
mv shiplocal shiplocal-old-backup

# Fresh clone from private Cloud
git clone git@github.com:ship-local/cloud.git shiplocal
cd shiplocal
git log --oneline -3    # sanity check — should match cloud main
git remote -v           # must show ship-local/cloud.git
```

---

## Step 2 — Restore production config

```bash
cd /var/www/shiplocal

cp ~/shiplocal-migrate-server.env.bak apps/server/.env
cp ~/shiplocal-migrate-dashboard.env.local.bak apps/dashboard/.env.local
test -f ~/shiplocal-migrate-docker.env.bak && cp ~/shiplocal-migrate-docker.env.bak docker/.env
```

### Required values in `apps/server/.env`

```env
NODE_ENV=production
JWT_SECRET=<unchanged — do not rotate during migration>
SHIPLOCAL_DOMAIN=shiplocal.cloud
API_PUBLIC_URL=https://shiplocal.cloud
DASHBOARD_URL=https://app.shiplocal.cloud
PORT=4000
HOST=0.0.0.0
SHIPLOCAL_EDITION=cloud
TUNNEL_EXPIRY_HOURS=8
# DATABASE_URL is overridden by docker-compose.prod.yml — keep in sync with docker/.env POSTGRES_PASSWORD
```

### Required values in `apps/dashboard/.env.local`

```env
NEXT_PUBLIC_API_URL=https://shiplocal.cloud
NEXT_PUBLIC_SITE_URL=https://shiplocal.cloud
NEXT_PUBLIC_APP_URL=https://app.shiplocal.cloud
NEXT_PUBLIC_SHIPLOCAL_EDITION=cloud
```

---

## Step 3 — Install deps and build (old services still running)

Build in the **new** tree while the old backup still serves traffic:

```bash
cd /var/www/shiplocal
pnpm install
pnpm --filter @shiplocal/dashboard build
```

If the landing-page commit is not on `cloud main` yet, apply it before building:

```bash
git fetch origin
git log --oneline -5   # confirm landing page commits exist
# If missing, merge/cherry-pick from your laptop push first
```

---

## Step 4 — Point Docker at the new tree (API + Postgres)

Postgres **data persists** in the named volume `postgres_data` — the compose file path changes but the volume name is the same.

```bash
cd /var/www/shiplocal

# Stop old API container (from backup path — brief tunnel interruption)
cd /var/www/shiplocal-old-backup
docker compose -f docker/docker-compose.prod.yml --env-file docker/.env down
# NOTE: omit -v — do NOT remove volumes

# Start from new tree (reuses existing postgres_data volume)
cd /var/www/shiplocal
docker compose -f docker/docker-compose.prod.yml --env-file docker/.env up -d --build

# Migrations (safe if already applied)
pnpm db:migrate

# Health check
curl -s http://127.0.0.1:4000/health
```

---

## Step 5 — Swap dashboard (PM2)

```bash
cd /var/www/shiplocal

pm2 delete shiplocal-dashboard 2>/dev/null || true
pm2 start deploy/ecosystem.config.cjs
pm2 save

ss -tlnp | grep 3001
curl -sI http://127.0.0.1:3001 | head -3
```

---

## Step 6 — Caddy (usually no change)

If you already applied the landing-page `deploy/Caddyfile` on the old tree, copy from the new repo (should be identical):

```bash
sudo cp /var/www/shiplocal/deploy/Caddyfile /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Caddy does not care which directory PM2/Docker use — only ports `3001` and `4000`.

---

## Step 7 — Verify

```bash
cd /var/www/shiplocal
bash deploy/verify-landing.sh

curl -s https://shiplocal.cloud/health
curl -sI https://shiplocal.cloud | head -1        # HTTP/2 200
curl -sI https://app.shiplocal.cloud/ | head -1   # HTTP/2 308
curl -sI https://app.shiplocal.cloud/login | head -1  # HTTP/2 200
```

**Functional smoke test:**

1. Open `https://shiplocal.cloud` — landing page loads
2. Open `https://app.shiplocal.cloud/login` — sign in works
3. From your laptop: `shiplocal login` → `shiplocal 3000` — tunnel registers
4. Open tunnel URL in browser — preview loads, 💬 overlay appears (Cloud)

**Logs if something fails:**

```bash
pm2 logs shiplocal-dashboard --lines 50
docker compose -f docker/docker-compose.prod.yml logs server --tail 50
sudo journalctl -u caddy --no-pager -n 30
```

---

## Step 8 — Clean up (after 48 h)

Once you're confident:

```bash
# Remove old clone (env already copied)
rm -rf /var/www/shiplocal-old-backup

# Keep secret backups longer
# ~/shiplocal-migrate-*.bak — store offline, then delete
```

---

## Rollback (if migration fails)

```bash
# Stop new stack
cd /var/www/shiplocal
pm2 delete shiplocal-dashboard 2>/dev/null || true
docker compose -f docker/docker-compose.prod.yml --env-file docker/.env down

# Restore old tree
cd /var/www
mv shiplocal shiplocal-failed-migration
mv shiplocal-old-backup shiplocal

# Restart old stack
cd /var/www/shiplocal
docker compose -f docker/docker-compose.prod.yml --env-file docker/.env up -d
pnpm --filter @shiplocal/dashboard build   # if .next missing
pm2 start deploy/ecosystem.config.cjs
pm2 save

curl -s http://127.0.0.1:4000/health
```

---

## Future deploys (after migration)

```bash
cd /var/www/shiplocal
git pull                    # fast-forward from ship-local/cloud
pnpm install
pnpm --filter @shiplocal/dashboard build
pnpm db:migrate             # when schema changes
docker compose -f docker/docker-compose.prod.yml --env-file docker/.env up -d --build
pm2 restart shiplocal-dashboard
bash deploy/verify-landing.sh
```

No more `git checkout origin/main -- <files>` from the public repo.

---

## Checklist (printable)

| Step | Action                                                                 | Done |
| ---- | ---------------------------------------------------------------------- | ---- |
| ☐    | Push latest `cloud main` from laptop                                   |      |
| ☐    | VPS can `ssh -T git@github.com` and read `ship-local/cloud`            |      |
| ☐    | Back up `apps/server/.env`, `apps/dashboard/.env.local`, `docker/.env` |      |
| ☐    | `mv shiplocal shiplocal-old-backup`                                    |      |
| ☐    | `git clone git@github.com:ship-local/cloud.git shiplocal`              |      |
| ☐    | Restore env files into new tree                                        |      |
| ☐    | `pnpm install` + `pnpm --filter @shiplocal/dashboard build`            |      |
| ☐    | Stop Docker from old path (`down` without `-v`)                        |      |
| ☐    | Start Docker from new path (`up -d --build`)                           |      |
| ☐    | `pnpm db:migrate`                                                      |      |
| ☐    | `pm2 start deploy/ecosystem.config.cjs` + `pm2 save`                   |      |
| ☐    | Reload Caddy if needed                                                 |      |
| ☐    | `bash deploy/verify-landing.sh` + tunnel smoke test                    |      |
| ☐    | Delete `shiplocal-old-backup` after 48 h                               |      |

---

## Common pitfalls

| Mistake                                 | Consequence                   | Fix                                 |
| --------------------------------------- | ----------------------------- | ----------------------------------- |
| `docker compose down -v`                | **Deletes all user data**     | Never pass `-v` during migration    |
| Clone public `shiplocal` again          | Divergent histories return    | Only clone `ship-local/cloud`       |
| Skip dashboard rebuild after env change | Middleware/landing URLs wrong | Always `build` before `pm2 restart` |
| Rotate `JWT_SECRET` during migration    | All users logged out          | Keep existing secret                |
| Delete backup before smoke test         | Hard rollback                 | Keep `shiplocal-old-backup` 48 h    |
