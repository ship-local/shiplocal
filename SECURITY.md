# Security Policy

## Supported versions

ShipLocal is in early beta (v0.1.x). Security fixes are applied to the latest release on `main` and the current npm CLI version.

| Version | Supported |
| ------- | --------- |
| 0.1.x   | ✅        |
| < 0.1   | ❌        |

## Reporting a vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Email **security@shiplocal.cloud** with:

- Description of the issue
- Steps to reproduce
- Impact assessment (what an attacker could do)
- Affected component (CLI, tunnel server, dashboard, etc.)
- Your environment (self-hosted vs ShipLocal Cloud), if relevant

We aim to acknowledge reports within **72 hours** and will keep you updated on remediation progress.

## What to report

Examples of in-scope issues:

- Unauthorized tunnel registration or hijacking of preview URLs
- Authentication bypass on dashboard or API routes
- Subdomain takeover or predictable tunnel slugs enabling unauthorized access
- Injection via proxied content or feedback overlay
- Secrets or tokens exposed in logs, responses, or client-side code
- Rate-limit or resource-exhaustion attacks against the tunnel server

## Out of scope

- Social engineering
- Denial of service against a self-hosted instance without a demonstrated protocol flaw
- Issues in third-party dependencies without a demonstrable impact on ShipLocal
- Missing security headers on user-proxied localhost apps (the developer controls that app)

## Safe harbor

We support responsible disclosure. We will not pursue legal action against researchers who:

- Make a good-faith effort to avoid privacy violations and service disruption
- Report issues privately and allow reasonable time to fix before public disclosure

## Security practices (self-hosters)

If you run your own ShipLocal server:

- Use strong `JWT_SECRET` and database passwords
- Enable TLS (Caddy or reverse proxy) for all public endpoints
- Keep Docker images and dependencies updated
- Do not expose Postgres or Redis ports publicly
- Rotate API tokens if a developer laptop is compromised

See [docs/self-hosting.md](docs/self-hosting.md) and [docs/deploy.md](docs/deploy.md).

## Credits

We credit reporters in release notes when they agree to be named.
