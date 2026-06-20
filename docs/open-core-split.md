# Open-core split: public Core + private Cloud

ShipLocal uses two GitHub repositories:

| Repo                                                            | Visibility  | Purpose                                                         |
| --------------------------------------------------------------- | ----------- | --------------------------------------------------------------- |
| [ship-local/shiplocal](https://github.com/ship-local/shiplocal) | **Public**  | Core — MIT tunnel engine, self-host docs                        |
| [ship-local/cloud](https://github.com/ship-local/cloud)         | **Private** | Full monorepo — feedback overlay, Cloud SaaS, production deploy |

You develop in **Cloud (private)**. Core is synced to the **public** repo when you want to publish OSS updates.

---

## One-time GitHub setup

### 1. Create the private Cloud repo

On GitHub: **New repository** → `ship-local/cloud` → **Private** → no README.

From your machine (full monorepo):

```bash
cd /path/to/ship-local

# Add private remote (keep origin as public target, or rename as below)
git remote add cloud https://github.com/ship-local/cloud.git
git push -u cloud main
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
git push -u origin main
```

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

Production Cloud on Hetzner:

```env
SHIPLOCAL_EDITION=cloud
NEXT_PUBLIC_SHIPLOCAL_EDITION=cloud
```

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
cd ../shiplocal-core && git add -A && git commit -m "sync: core" && git push origin main
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

Create labels if needed:

```bash
gh label create core --color 0E8A16 --description "Core tunnel engine"
gh label create enhancement --color 1D76DB --description "New feature or improvement"
gh label create cloud --color 5319E7 --description "Cloud SaaS feature"
```

---

## npm CLI

The `shiplocal` npm package publishes from `packages/cli` in either repo. Public Core repo is the canonical source for CLI releases.

---

## Troubleshooting

**Build fails in Core repo without feedback-overlay**

Ensure `SHIPLOCAL_EDITION=core` — server must not import overlay at startup (dynamic import only in cloud mode).

**Public repo still shows private**

Check Settings → visibility. Issues and stars only work on public repos.

**Two repos out of sync**

Run `sync-core-public.sh` again; Core is a snapshot, not automatic.
