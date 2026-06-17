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
export SHIPLOCAL_API_URL=https://shiplocal.cloud
shiplocal login
```

Create an account at https://app.shiplocal.cloud if you don't have one.

### 2. Start your local app

Run your project locally (Next.js, Vite, Rails, etc.) on a port — for example **3000**:

```bash
npm run dev
```

### 3. Open a tunnel

In a second terminal:

```bash
export SHIPLOCAL_API_URL=https://shiplocal.cloud
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

## Environment variables

| Variable            | Default                 | Description                                                   |
| ------------------- | ----------------------- | ------------------------------------------------------------- |
| `SHIPLOCAL_API_URL` | `http://localhost:4000` | API server URL. Use `https://shiplocal.cloud` for production. |
| `SHIPLOCAL_TOKEN`   | —                       | API token (alternative to `shiplocal login`)                  |

Credentials are saved to `~/.shiplocal/config.json`.

## Self-hosting

To run your own ShipLocal server instead of ShipLocal Cloud, point `SHIPLOCAL_API_URL` at your server:

```bash
export SHIPLOCAL_API_URL=https://your-server.example.com
shiplocal login
```

See the [self-hosting guide](https://github.com/ship-local/shiplocal/blob/main/docs/self-hosting.md) in the main repo.

## Troubleshooting

**`command not found: shiplocal`**  
Ensure npm global bin is on your PATH. Run `npm bin -g` and add that directory to your shell config.

**Blank page on public URL**  
Make sure your local app is running on the port you passed to the CLI.

**`Not authenticated`**  
Run `shiplocal login` first.

**Wrong server / login fails**  
Check `SHIPLOCAL_API_URL` is set to `https://shiplocal.cloud` for production.

## Links

- [GitHub](https://github.com/ship-local/shiplocal)
- [Dashboard](https://app.shiplocal.cloud)
- [Issues](https://github.com/ship-local/shiplocal/issues)

## License

MIT
