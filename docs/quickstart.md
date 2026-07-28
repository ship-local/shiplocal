# Quickstart

Get from zero to a shared preview link in under 5 minutes.

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker (for Postgres)

## 1. Clone and install

```bash
git clone https://github.com/ship-local/shiplocal.git
cd shiplocal
pnpm install
```

## 2. Start infrastructure

```bash
pnpm docker:up
cp apps/server/.env.example apps/server/.env
cp apps/dashboard/.env.example apps/dashboard/.env.local
pnpm db:migrate
```

## 3. Run ShipLocal

```bash
pnpm dev
```

- Dashboard: http://localhost:3001
- API: http://localhost:4000

## 4. Create an account

Open http://localhost:3001/register and sign up.

## 5. Log in via CLI

```bash
pnpm tunnel login
# or: node packages/cli/dist/index.js login
```

## 6. Start your app and tunnel it

In one terminal, run your client project (any stack — example port 3000):

```bash
npm run dev
# or: flask run / python -m http.server 8000 / etc.
```

In another terminal:

```bash
pnpm tunnel 3000
```

You'll get URLs like:

- **Public:** `http://happy-lion.localhost:4000` — direct preview of your app
- **Review:** `http://localhost:3001/review/happy-lion` — preview + feedback chrome (Cloud)

## 7. Share with your client

Send the **Review URL** for client feedback (no PR / no deploy). They open it, view your app in the page, and click **💬 Feedback**.

You see comments on http://localhost:3001/dashboard.

> Tip: The in-page overlay on the **Public** URL still prefers a production-like serve for JS frameworks (`next build && next start`, `vite build && vite preview`, etc.). The **Review URL** works without that.

## Optional: password-protect a tunnel

```bash
pnpm tunnel 3000 --password secret123
```

Clients must enter the password before viewing the preview (inside the iframe / raw URL).

## Troubleshooting

- **Blank page on tunnel URL** — make sure your local app is running on the port you passed to the CLI.
- **ECONNREFUSED on login** — run `pnpm dev` first so the API is up on port 4000.
- **Database errors** — ensure Docker is running and Postgres is on port 5433 (see README).
- **Preview blank in Review chrome** — some apps set `X-Frame-Options` / CSP `frame-ancestors`; use **Open raw URL** and still send feedback from the Review page.
