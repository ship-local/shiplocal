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

In one terminal, run your client project (example: port 3000):

```bash
npm run dev
```

In another terminal:

```bash
pnpm tunnel 3000
```

You'll get a public URL like `http://happy-lion.localhost:4000`.

## 7. Share with your client

Send the **public URL** to your client. They browse the live preview and click **💬** to leave feedback.

You see comments and screenshots on http://localhost:3001/dashboard.

## Optional: password-protect a tunnel

```bash
pnpm tunnel 3000 --password secret123
```

Clients must enter the password before viewing the preview.

## Troubleshooting

- **Blank page on tunnel URL** — make sure your local app is running on the port you passed to the CLI.
- **ECONNREFUSED on login** — run `pnpm dev` first so the API is up on port 4000.
- **Database errors** — ensure Docker is running and Postgres is on port 5433 (see README).
