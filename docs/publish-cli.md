# Publishing the CLI to npm

ShipLocal publishes **three packages** to npm:

| Package       | npm name                   |
| ------------- | -------------------------- |
| Shared types  | `@shiplocal/shared`        |
| Tunnel client | `@shiplocal/tunnel-client` |
| CLI           | `shiplocal`                |

Users install only the CLI:

```bash
npm install -g shiplocal
```

npm automatically installs `@shiplocal/shared` and `@shiplocal/tunnel-client` as dependencies.

## One-time setup

```bash
npm login
npm whoami
```

You need an npm account with permission to publish:

- `shiplocal` (unscoped)
- `@shiplocal/*` (scoped, public)

## Publish (from repo root)

```bash
pnpm publish:packages
```

This will:

1. Build all packages
2. Publish `@shiplocal/shared@0.1.0`
3. Publish `@shiplocal/tunnel-client@0.1.0`
4. Publish `shiplocal@0.1.0` (workspace deps are rewritten to published versions)

## Dry run (verify tarball before publishing)

```bash
pnpm build
pnpm --filter @shiplocal/shared pack
pnpm --filter @shiplocal/tunnel-client pack
pnpm --filter shiplocal pack
```

Inspect the generated `.tgz` files in each package directory.

## After publish — user install

```bash
npm install -g shiplocal
export SHIPLOCAL_API_URL=https://shiplocal.cloud
shiplocal login
shiplocal 3000
```

## Version bumps

Before the next release, bump versions in:

- `packages/shared/package.json`
- `packages/tunnel-client/package.json`
- `packages/cli/package.json`

Keep all three on the same semver for simplicity.

## Pre-publish checklist

- [ ] `pnpm typecheck && pnpm lint && pnpm build` pass
- [ ] No secrets in published files (`files` only includes `dist/`)
- [ ] Version bumped
- [ ] `npm whoami` shows correct account
- [ ] Test with `npm pack` tarballs locally if needed
