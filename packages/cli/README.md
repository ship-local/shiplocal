# ShipLocal CLI

> From localhost to client-ready.

Share your local dev server with clients via a public URL. On **ShipLocal Cloud**, clients can leave visual feedback on review-ready previews (see [when the overlay appears](https://shiplocal.cloud/blog/how-to-get-client-feedback-on-tunnel-previews)).

**Dashboard:** https://app.shiplocal.cloud  
**Website:** https://shiplocal.cloud

## Install

```bash
npm install -g shiplocal
```

Requires **Node.js 20+**.

## Quick start

### 1. Log in

```bash
shiplocal login
```

Create an account at https://app.shiplocal.cloud if you don't have one.

No `export` needed — the CLI defaults to **https://shiplocal.cloud** and saves your server URL when you log in.

### 2. Start your local app

Run your project locally on whatever port it uses (3000, 5173, 8080, etc.):

```bash
npm run dev
```

### 3. Open a tunnel

Pass your app's port as the argument:

```bash
shiplocal 3000
shiplocal 5173
shiplocal 8080
```

You'll get output like:

```
🚀 ShipLocal running

Local:   http://localhost:3000
Public:  https://happy-lion.shiplocal.cloud

Share this with your client.
```

Share the **Public** URL with your client. Keep this terminal open while they view the preview.

### 4. Client feedback (when enabled)

The 💬 overlay is **not shown by default** on `npm run dev` previews. For client feedback, use a production-like build:

```bash
next build && next start
shiplocal 3000
```

When the overlay is active, clients click **💬**, pick an element, and leave feedback on your [dashboard](https://app.shiplocal.cloud/dashboard).

**Opt-in on dev:** `shiplocal 3000 --feedback` (may cause HMR/reload issues).  
**Guide:** [How to get client feedback on tunnel previews](https://shiplocal.cloud/blog/how-to-get-client-feedback-on-tunnel-previews)

## Commands

| Command                      | Description                                   |
| ---------------------------- | --------------------------------------------- |
| `shiplocal login`            | Authenticate with ShipLocal Cloud             |
| `shiplocal logout`           | Remove saved credentials                      |
| `shiplocal <port>`           | Tunnel your local app (e.g. `shiplocal 5173`) |
| `shiplocal doctor [port]`    | Diagnose connectivity and tunnel performance  |
| `shiplocal benchmark [port]` | Alias for `doctor`                            |

### Tunnel options

```bash
# Password-protect the preview URL
shiplocal 3000 --password secret

# Multi-service project (frontend + API)
shiplocal 3000 --project my-app --name web
shiplocal 4000 --project my-app --name api

# Suggest or apply .env URL rewrites for tunnel URLs
shiplocal 3000 --project my-app --rewrite-env

# Opt-in feedback overlay on dev (may cause HMR/reload issues)
shiplocal 3000 --feedback
```

### Doctor / benchmark

Check a specific port with the positional argument or `--port`:

```bash
shiplocal doctor 5173
shiplocal doctor --port 8080
shiplocal benchmark 3001 --json
```

If you omit the port, doctor defaults to **3000**.

## Environment variables (optional)

| Variable            | When to use                                                    |
| ------------------- | -------------------------------------------------------------- |
| `SHIPLOCAL_API_URL` | Self-hosted server or local dev (e.g. `http://localhost:4000`) |
| `SHIPLOCAL_TOKEN`   | Skip `login` by providing an API token directly                |

Credentials are saved to `~/.shiplocal/config.json` including the API URL from your last login.

**You do not need `export SHIPLOCAL_API_URL` for ShipLocal Cloud** — only set it if you use a custom server.

### Local development against your own server

```bash
export SHIPLOCAL_API_URL=http://localhost:4000
shiplocal login
shiplocal 3000
```

## Self-hosting

```bash
export SHIPLOCAL_API_URL=https://your-server.example.com
shiplocal login
```

See the [self-hosting guide](https://github.com/ship-local/shiplocal/blob/main/docs/self-hosting.md).

## Troubleshooting

Run diagnostics and paste the output when reporting tunnel issues:

```bash
shiplocal doctor 5173
```

This checks API health, auth, WebSocket connectivity, and (when your local app is running) compares local vs tunnel HTML/JS transfer times and HMR WebSocket health.

**`command not found: shiplocal`**  
Run `npm bin -g` and add that directory to your PATH.

**Blank page on public URL**  
Make sure your local app is running on the port you passed to the CLI.

**`Not authenticated`**  
Run `shiplocal login` first.

## Links

- [GitHub](https://github.com/ship-local/shiplocal)
- [Dashboard](https://app.shiplocal.cloud)
- [Issues](https://github.com/ship-local/shiplocal/issues)

## License

MIT
