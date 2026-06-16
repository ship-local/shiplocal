# Publishing the CLI to npm

The `shiplocal` CLI depends on `@shiplocal/shared` and `@shiplocal/tunnel-client`. Publish all three packages (or bundle the CLI) before users can `npm install -g shiplocal`.

## Option A: Publish workspace packages (recommended for beta)

1. Bump versions in `packages/shared`, `packages/tunnel-client`, `packages/cli`.
2. Build all packages: `pnpm build`
3. Publish in order:

```bash
pnpm --filter @shiplocal/shared publish --access public
pnpm --filter @shiplocal/tunnel-client publish --access public
pnpm --filter shiplocal publish --access public
```

4. Update `packages/cli/package.json` dependencies from `workspace:*` to published versions before the CLI publish step.

## Option B: Global link (local beta testers)

```bash
pnpm --filter shiplocal build
pnpm link --global --filter shiplocal
shiplocal login
```

## Pre-publish checklist

- [ ] `JWT_SECRET` and secrets not in package
- [ ] Version bumped (semver)
- [ ] `pnpm typecheck && pnpm lint && pnpm build` pass
- [ ] README install instructions updated
- [ ] `SHIPLOCAL_API_URL` documented for Cloud vs self-host

## npm account setup

```bash
npm login
npm whoami
```

Package name `shiplocal` must be available on npm (check npmjs.com).
