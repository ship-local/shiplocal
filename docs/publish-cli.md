# Publishing the CLI to npm

ShipLocal publishes **one package** to npm: `shiplocal`.

The CLI is bundled with esbuild (shared + tunnel-client code inlined). Users only need:

```bash
npm install -g shiplocal
```

## Why not `@shiplocal/*` scoped packages?

npm requires you to **own the `@shiplocal` organization** to publish scoped packages. The bundled CLI avoids that — only the unscoped name `shiplocal` is needed (and it's available).

## One-time setup

```bash
npm login
npm whoami
```

## Publish (from repo root)

```bash
pnpm publish:cli
```

This builds workspace deps, bundles the CLI, and publishes `shiplocal` to npm.

## Dry run

```bash
pnpm --filter @shiplocal/shared build
pnpm --filter @shiplocal/tunnel-client build
pnpm --filter shiplocal build
cd packages/cli && pnpm pack
```

Inspect `shiplocal-0.1.0.tgz` — it should contain only `dist/` and depend on `ws` only.

## After publish — user install

```bash
npm install -g shiplocal
export SHIPLOCAL_API_URL=https://shiplocal.cloud
shiplocal login
shiplocal 3000
```

## Version bumps

Bump `packages/cli/package.json` version before each release, then run `pnpm publish:cli` again.

## Pre-publish checklist

- [ ] `pnpm typecheck && pnpm lint` pass
- [ ] `pnpm --filter shiplocal build` succeeds
- [ ] `npm whoami` shows correct account
- [ ] Version bumped if re-publishing
