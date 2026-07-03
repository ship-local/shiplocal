# ShipLocal CLI

> From localhost to client-ready.

Share your local dev server with clients via a public URL. Clients can leave visual feedback on the live preview.

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

Run your project locally on a port — for example **3000**:

```bash
npm run dev
```

### 3. Open a tunnel

```bash
shiplocal 3000
```

You'll get output like:

```
🚀 ShipLocal running

Local:   http://localhost:3000
Public:  https://happy-lion.shiplocal.cloud

Share this with your client.
```

Share the **Public** URL with your client. Keep this terminal open while they view the preview.

### 4. Client feedback

Clients open the public URL, click **💬**, pick an element, and leave feedback. You see comments and screenshots on your [dashboard](https://app.shiplocal.cloud/dashboard).

## Commands

| Command                            | Description                       |
| ---------------------------------- | --------------------------------- |
| `shiplocal login`                  | Authenticate with ShipLocal Cloud |
| `shiplocal logout`                 | Remove saved credentials          |
| `shiplocal 3000`                   | Tunnel local port 3000            |
| `shiplocal 3000 --password secret` | Password-protect the preview URL  |

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
shiplocal doctor
# or
shiplocal benchmark --port 3000
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
