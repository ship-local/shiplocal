# Contributing to ShipLocal

Thank you for your interest in ShipLocal. This project is an **open-source local development collaboration platform** — share localhost with clients and collect visual feedback on the live preview.

We are in early beta. The maintainer team leads architecture and core tunnel work; community contributions on docs, tests, UI, and integrations are welcome.

## Ways to contribute

| Area             | Examples                                                    | Good for                                             |
| ---------------- | ----------------------------------------------------------- | ---------------------------------------------------- |
| **Docs**         | Quickstart improvements, framework guides, troubleshooting  | First-time contributors                              |
| **Tests**        | CLI, tunnel client, API route coverage                      | Developers who like quality gates                    |
| **UI**           | Dashboard polish, accessibility, responsive layout          | Frontend contributors                                |
| **Integrations** | Framework detection, example repos                          | DevOps / tooling folks                               |
| **Core tunnel**  | Proxy edge cases, WebSocket upgrades, multi-service routing | Experienced contributors — discuss in an issue first |

See [ROADMAP.md](ROADMAP.md) for planned work. Check [open issues](https://github.com/ship-local/shiplocal/issues) before starting something new.

## Open-core model

ShipLocal uses an **open-core** strategy:

- **Core (MIT, open forever):** CLI, tunnel client, tunnel server, shared types, self-hosting docs
- **Cloud (managed SaaS):** Hosted infrastructure, feedback overlay polish, billing, teams — not all Cloud code is in this repo

When contributing, prefer changes that help **self-hosters and solo developers** share localhost. If your change touches Cloud-only business logic, open an issue first.

## Development setup

Requirements: Node.js 20+, pnpm 9+, Docker (for Postgres).

```bash
git clone https://github.com/ship-local/shiplocal.git
cd shiplocal
pnpm install
pnpm docker:up
cp apps/server/.env.example apps/server/.env
cp apps/dashboard/.env.example apps/dashboard/.env.local
pnpm db:migrate
pnpm dev
```

- Dashboard: http://localhost:3001
- API / tunnel server: http://localhost:4000
- CLI shortcut: `pnpm tunnel 3000`

Full guide: [docs/quickstart.md](docs/quickstart.md)

## Project layout

```
apps/
  dashboard/     Next.js — landing, dashboard, blog
  server/        Fastify — API, tunnel server, proxy
packages/
  cli/           shiplocal CLI (published to npm)
  tunnel-client/ WebSocket tunnel logic
  shared/        Types, protocol, validation
  feedback-overlay/ Client feedback widget
```

## Before you open a PR

1. **Open an issue** for non-trivial changes — especially core tunnel, security, or architecture
2. **Branch** from `main`: `feat/short-description` or `fix/short-description`
3. **Run checks** from the repo root:

```bash
pnpm lint
pnpm typecheck
pnpm build
```

4. **Keep PRs focused** — one concern per pull request
5. **Write a clear description** — what changed, why, how to test

## Commit messages

Use concise, imperative subjects:

```
fix(cli): warn when local port is not listening
docs: add Laravel quickstart example
feat(server): strip content-encoding on proxied responses
```

## Code style

- TypeScript strict mode
- Match existing patterns in the file you edit
- No drive-by refactors in unrelated files
- Comments only for non-obvious business or infrastructure logic

## Reporting bugs

Use the [bug report template](https://github.com/ship-local/shiplocal/issues/new?template=bug_report.yml). Include:

- OS and Node version
- Steps to reproduce
- Expected vs actual behavior
- Relevant logs (redact tokens and URLs if needed)

## Security issues

**Do not** open public issues for vulnerabilities. See [SECURITY.md](SECURITY.md).

## Community

Be respectful and constructive. See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

Questions? Open a [Discussion](https://github.com/ship-local/shiplocal/discussions) or comment on a related issue.

---

Maintainer-led during early beta — we review PRs as quickly as we can. Thank you for helping make localhost collaboration less painful.
