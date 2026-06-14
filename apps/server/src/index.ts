import 'dotenv/config';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import Fastify from 'fastify';
import {
  DEFAULT_SERVER_PORT,
  DEFAULT_TUNNEL_DOMAIN,
  DEFAULT_TUNNEL_EXPIRY_MS,
} from '@shiplocal/shared';
import { checkDatabaseConnection, prisma } from './db.js';
import { initTunnelManager } from './tunnel/manager.js';
import { registerTunnelHttpProxy, registerTunnelWebSocket } from './tunnel/routes.js';

const port = Number.parseInt(process.env['PORT'] ?? String(DEFAULT_SERVER_PORT), 10);
const host = process.env['HOST'] ?? '0.0.0.0';
const tunnelDomain = process.env['SHIPLOCAL_DOMAIN'] ?? DEFAULT_TUNNEL_DOMAIN;
const tunnelExpiryMs = process.env['TUNNEL_EXPIRY_HOURS']
  ? Number.parseInt(process.env['TUNNEL_EXPIRY_HOURS'], 10) * 60 * 60 * 1000
  : DEFAULT_TUNNEL_EXPIRY_MS;

const app = Fastify({
  logger: true,
});

await app.register(cors, {
  origin: true,
});

await app.register(websocket);

initTunnelManager({
  domain: tunnelDomain,
  port,
  expiryMs: tunnelExpiryMs,
  onExpired: (session) => {
    app.log.info({ subdomain: session.subdomain }, 'Tunnel expired');
  },
});

registerTunnelWebSocket(app);

app.get('/health', async () => {
  const databaseConnected = await checkDatabaseConnection();

  return {
    status: databaseConnected ? 'ok' : 'degraded',
    database: databaseConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  };
});

app.get('/api/status', async () => {
  const [projectCount, tunnelCount] = await Promise.all([
    prisma.project.count(),
    prisma.tunnel.count(),
  ]);

  return {
    service: 'shiplocal-server',
    version: '0.0.1',
    projects: projectCount,
    tunnels: tunnelCount,
  };
});

registerTunnelHttpProxy(app, tunnelDomain);

const start = async () => {
  try {
    await app.listen({ port, host });
    app.log.info(`Server listening on http://${host}:${String(port)}`);
    app.log.info(`Tunnel domain: ${tunnelDomain}`);
    app.log.info(`Tunnel expiry: ${String(tunnelExpiryMs / (60 * 60 * 1000))}h`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

void start();
