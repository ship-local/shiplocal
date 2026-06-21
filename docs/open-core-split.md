# Open-core split: public Core + private Cloud

ShipLocal uses two GitHub repositories:

| Repo                                                            | Visibility  | Purpose                                                         |
| --------------------------------------------------------------- | ----------- | --------------------------------------------------------------- |
| [ship-local/shiplocal](https://github.com/ship-local/shiplocal) | **Public**  | Core — MIT tunnel engine, self-host docs                        |
| [ship-local/cloud](https://github.com/ship-local/cloud)         | **Private** | Full monorepo — feedback overlay, Cloud SaaS, production deploy |

You develop in **Cloud (private)**. Core is synced to the **public** repo when you want to publish OSS updates.

---

## FAQ — quick answers

### Where do I code and push?

| Action            | Where                                                               |
| ----------------- | ------------------------------------------------------------------- |
| Write code daily  | Private repo — `~/Desktop/Kennys/ship-local`                        |
| Push after commit | `git push cloud main` → **private** `ship-local/cloud`              |
| Update public OSS | `./scripts/sync-core-public.sh` → push from `shiplocal-core` only   |
| Publish npm CLI   | From **private** repo (`pnpm publish:cli`) — always has latest code |

Never `git push origin main` from `ship-local` — that would leak Cloud code to the public repo.

### Is the only private-only thing the feedback overlay?

**Today, mainly yes** — plus the comments API wiring that serves it:

| Private only (now)                 | Public Core                        |
| ---------------------------------- | ---------------------------------- |
| `packages/feedback-overlay` source | CLI, tunnel server, auth, projects |
| Comments API + overlay injection   | Self-host docs, tunnel management  |
| Cloud production deploy guide      |                                    |

**Later**, more **Cloud / paid** features stay private: billing, teams, client portal, approvals, polished collaboration UX.

**Tunnel engine features** (multi-tunnel, path routing `/api/*`, WebSocket upgrade, CORS) are planned for **public Core** — they help self-hosters too, not just your SaaS.

### Who uses my Hetzner VPS?

Three different setups:

**A) Cloud users (your server)**

```bash
npm install -g shiplocal
export SHIPLOCAL_API_URL=https://shiplocal.cloud
shiplocal login
shiplocal 3000
```

Their CLI and tunnels run through **your** VPS. You pay for bandwidth and compute.

**B) Self-hosters (their server)**

They clone **public** Core, run server + Postgres on **their** VPS, and point the CLI at their API:

```bash
export SHIPLOCAL_API_URL=https://tunnel.their-domain.com
```

They do **not** use your Hetzner unless they choose Cloud defaults.

**C) Local dev / PR testing (no VPS)**

```bash
pnpm dev          # localhost :4000 / :3001
pnpm tunnel 3000  # CLI → local server
```

Everything on **their laptop**. No npm, no shiplocal.cloud, no your VPS.

```
npm + SHIPLOCAL_API_URL=shiplocal.cloud     → YOUR Hetzner (Cloud)
npm + SHIPLOCAL_API_URL=their-server.com    → THEIR server (self-host)
pnpm dev / pnpm tunnel locally              → localhost only
```

### Same npm package for everyone?

Yes — one package: `shiplocal` on npm. Cloud users aim it at **shiplocal.cloud**; self-hosters aim it at **their** server URL. Publish from the **private** repo so npm matches what you ship on Cloud.

### Quick reference

| Question                    | Answer                                          |
| --------------------------- | ----------------------------------------------- |
| Code daily where?           | Private `cloud`                                 |
| Publish npm from?           | Private repo                                    |
| Public repo for?            | OSS, GitHub issues, self-hosters                |
| Multi-tunnel / API routing? | Planned **public Core**                         |
| Core users on my VPS?       | Only if they use **Cloud** (default npm URL)    |
| Local / PR testing?         | Localhost — no your VPS                         |
| Who hits my VPS?            | Users on `shiplocal.cloud` + default CLI config |

---

## Beginner guide: how the two repos work

Think of it like a **house with two addresses**:

|                                | Private `cloud`                           | Public `shiplocal`                          |
| ------------------------------ | ----------------------------------------- | ------------------------------------------- |
| **What it is**                 | Your full workshop — everything you build | The shop window — tunnel engine only        |
| **Who sees it**                | Only you                                  | Everyone on the internet                    |
| **What's missing publicly**    | —                                         | Feedback overlay source code, internal docs |
| **Where you code daily**       | ✅ Here (`~/Desktop/Kennys/ship-local`)   | ❌ Not here directly                        |
| **Where Hetzner deploys from** | ✅ `git clone cloud`                      | ❌ Never for production                     |

### Where your folders live

```
~/Desktop/Kennys/ship-local/     ← you edit here (tracks remote: cloud)
~/Desktop/Kennys/shiplocal-core/ ← sync output only (tracks remote: origin / public)
```

### What to push where

```bash
# After committing in ship-local — ALWAYS push to cloud (private):
git push cloud main

# NEVER push the full ship-local repo to origin/public:
# git push origin main   ← DON'T (would leak Cloud code)

# When you want to update the public OSS snapshot:
./scripts/sync-core-public.sh ../shiplocal-core
cd ../shiplocal-core && git add -A && git commit -m "sync: core" && git push origin main --force
```

### Updating your Hetzner server (production)

SSH into the VPS, then:

```bash
cd /var/www/shiplocal          # must be cloned from ship-local/cloud, not public shiplocal
git pull                       # pulls private Cloud code
pnpm install
pnpm --filter @shiplocal/dashboard build
pnpm db:migrate                # if schema changed
docker compose -f docker/docker-compose.prod.yml --env-file docker/.env up -d --build
pm2 restart shiplocal-dashboard
```

---

## Production Cloud on Hetzner — set edition flags

These tell the app to run in **Cloud mode** (feedback overlay on). They are plain text config files on the server — not npm settings.

### 1. Server (API + tunnel) — `apps/server/.env`

SSH to Hetzner, open the file:

```bash
nano /var/www/shiplocal/apps/server/.env
```

Add or confirm this line:

```env
SHIPLOCAL_EDITION=cloud
```

Docker also sets this in `docker-compose.prod.yml` — but if you use `.env`, keep them consistent.

Restart the API after editing:

```bash
cd /var/www/shiplocal
docker compose -f docker/docker-compose.prod.yml --env-file docker/.env up -d --build
```

### 2. Dashboard — `apps/dashboard/.env.local`

```bash
nano /var/www/shiplocal/apps/dashboard/.env.local
```

Add:

```env
NEXT_PUBLIC_SHIPLOCAL_EDITION=cloud
NEXT_PUBLIC_API_URL=https://shiplocal.cloud
```

Rebuild and restart dashboard (Next.js bakes `NEXT_PUBLIC_*` in at build time):

```bash
cd /var/www/shiplocal
pnpm --filter @shiplocal/dashboard build
pm2 restart shiplocal-dashboard
```

**If feedback overlay still missing:** you probably skipped the rebuild after adding `NEXT_PUBLIC_SHIPLOCAL_EDITION`.

---

## npm CLI — what that sentence means

The **`shiplocal` command** developers install with `npm install -g shiplocal` is built from `packages/cli/` in your repo.

- **"Publishes from packages/cli"** — when you run `pnpm publish:cli`, that folder becomes the npm package.
- **"Public Core repo is canonical"** — the _official_ open-source releases should come from the public repo's CLI code, so the world sees the same code that's on GitHub.

**In practice for you today:** publish from your private `ship-local` workspace (it has the latest CLI). After syncing Core to public, both should match for tunnel-only code. You do **not** need two npm packages — still just one `shiplocal` on npm.

---

## Fix: Cloud code leaked on public GitHub

If you previously pushed branches to **public** `ship-local/shiplocal` before the Core split, old branches may still contain `packages/feedback-overlay/`.

**Check:** https://github.com/ship-local/shiplocal/branches

**Delete leaked branches** (run locally):

```bash
gh api -X DELETE repos/ship-local/shiplocal/git/refs/heads/feat/roadmap-et-al
```

Public `main` should be Core-only (no `feedback-overlay` folder). Re-sync to strip Cloud-only files:

```bash
cd ~/Desktop/Kennys/ship-local
./scripts/sync-core-public.sh ../shiplocal-core
cd ../shiplocal-core && git add -A && git commit -m "chore: tighten Core sync" && git push origin main --force
```

**Rule:** Only push to public via `shiplocal-core` after sync — never `git push origin` from `ship-local`.

---

## One-time GitHub setup

### 1. Create the private Cloud repo

On GitHub: **New repository** → `ship-local/cloud` → **Private** → no README.

From your machine (full monorepo):

```bash
cd /path/to/ship-local

git remote add cloud https://github.com/ship-local/cloud.git

# Push your latest branch — NOT stale local main if you work on a feature branch:
git push -u cloud HEAD:main
# or after merging: git push -u cloud main
```

**Recommended remotes after setup:**

```bash
git remote -v
# cloud   https://github.com/ship-local/cloud.git   (private — daily work)
# origin  https://github.com/ship-local/shiplocal.git (public — core sync)
```

If `origin` currently points at the private full repo, rename it:

```bash
git remote rename origin cloud
git remote add origin https://github.com/ship-local/shiplocal.git
```

### 2. Publish Core to the public repo

```bash
chmod +x scripts/sync-core-public.sh
./scripts/sync-core-public.sh          # writes to ../shiplocal-core by default
# or: ./scripts/sync-core-public.sh /path/to/shiplocal-core

cd ../shiplocal-core
git add -A
git commit -m "chore: initial Core open-source release"
git push -u origin main --force
```

**Important:** The Core sync creates a **new git history** (no shared commits with the old full monorepo). Do **not** `git pull` — use `--force` to replace public `main` with Core. This is intentional.

### 3. Make the public repo visible

GitHub → **ship-local/shiplocal** → Settings → General → **Change repository visibility** → **Public**.

### 4. (Optional) Convert old private `shiplocal` repo

If `ship-local/shiplocal` was private with the full codebase:

1. Push full code to `ship-local/cloud` (private)
2. Replace `ship-local/shiplocal` contents with Core sync (step 2)
3. Set `shiplocal` to **Public**

---

## Edition flag

| Env                             | Where                       | Value                                |
| ------------------------------- | --------------------------- | ------------------------------------ |
| `SHIPLOCAL_EDITION`             | `apps/server/.env`          | `core` (public) or `cloud` (private) |
| `NEXT_PUBLIC_SHIPLOCAL_EDITION` | `apps/dashboard/.env.local` | same                                 |

**Core** disables:

- Feedback API routes and overlay injection
- Dashboard feedback UI

**Cloud** (default when unset) enables the full SaaS feature set.

See [Production Cloud on Hetzner](#production-cloud-on-hetzner--set-edition-flags) above for step-by-step setup.

---

## What is in Core vs Cloud

### Public Core includes

- `packages/cli`, `tunnel-client`, `shared`
- `apps/server` (tunnel + auth + projects; no feedback routes in core mode)
- `apps/dashboard` (tunnels/projects; no feedback UI in core mode)
- `docker/`, `deploy/`, self-host docs
- `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `ROADMAP.md`

### Stays private (Cloud repo only)

- `packages/feedback-overlay`
- Cloud production secrets and deploy configs with live credentials
- `DEVELOPMENT.md`, `discuss*.md`, draft articles

---

## Day-to-day workflow

1. **Build features** in the private Cloud repo (`git push cloud main`)
2. **Deploy** Cloud to Hetzner from Cloud repo
3. **Sync Core** when tunnel engine changes should be public:

```bash
./scripts/sync-core-public.sh
cd ../shiplocal-core && git add -A && git commit -m "sync: core" && git push origin main --force
```

4. **File GitHub issues** on the public repo (issues are disabled or invisible on private repos for community)

---

## File GitHub issues (public repo)

After the public repo is live:

```bash
cd ../shiplocal-core   # or clone public repo
gh issue create --title "Support multiple tunnel targets per project" \
  --label "enhancement,core" \
  --body-file .github/issues/01-multiple-tunnel-targets.md
```

Repeat for `.github/issues/02-*.md` through `07-*.md` (see `.github/BACKLOG.md`).

Create labels **before** filing issues (one-time):

```bash
gh label create core --color 0E8A16 --description "Core tunnel engine"
gh label create cloud --color 5319E7 --description "Cloud SaaS feature"
# enhancement usually exists by default on GitHub repos
```

Then create issues.

---

## Troubleshooting

**`git push` rejected / `refusing to merge unrelated histories` on shiplocal-core**

The Core repo is a fresh snapshot — it does not share history with the old full monorepo on GitHub. **Do not pull or merge.** Push with:

```bash
git push origin main --force
```

**Pushed stale code to `cloud`**

If you ran `git push cloud main` while on a feature branch, you pushed old local `main`, not your current work. Fix:

```bash
git push cloud feat/your-branch:main
# or: git checkout main && git merge feat/your-branch && git push cloud main
```

**Build fails in Core repo without feedback-overlay**

Ensure `SHIPLOCAL_EDITION=core` — server must not import overlay at startup (dynamic import only in cloud mode).

**Public repo still shows private**

Check Settings → visibility. Issues and stars only work on public repos.

**Two repos out of sync**

Run `sync-core-public.sh` again; Core is a snapshot, not automatic.
