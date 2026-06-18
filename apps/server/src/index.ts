// In production (Docker/VPS), env vars are provided by the runtime.
// Only load dotenv for local development.
if (process.env['NODE_ENV'] !== 'production') {
  await import('dotenv/config');
}
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import websocket from '@fastify/websocket';
import Fastify from 'fastify';
import {
  DEFAULT_SERVER_PORT,
  DEFAULT_TUNNEL_DOMAIN,
  DEFAULT_TUNNEL_EXPIRY_MS,
  parseTunnelHost,
} from '@shiplocal/shared';
import { checkDatabaseConnection, prisma } from './db.js';
import { registerCommentRoutes } from './routes/comments.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerProjectRoutes } from './routes/projects.js';
import { registerTunnelRoutes } from './routes/tunnels.js';
import { initTunnelManager, getTunnelManager } from './tunnel/manager.js';
import {
  registerTunnelHttpProxy,
  registerTunnelWebSocket,
  proxyTunnelRequest,
} from './tunnel/routes.js';

const port = Number.parseInt(process.env['PORT'] ?? String(DEFAULT_SERVER_PORT), 10);
const host = process.env['HOST'] ?? '0.0.0.0';
const tunnelDomain = process.env['SHIPLOCAL_DOMAIN'] ?? DEFAULT_TUNNEL_DOMAIN;
const apiPublicUrl = process.env['API_PUBLIC_URL'];
const dashboardUrl = process.env['DASHBOARD_URL'] ?? 'http://localhost:3001';
const tunnelExpiryMs = process.env['TUNNEL_EXPIRY_HOURS']
  ? Number.parseInt(process.env['TUNNEL_EXPIRY_HOURS'], 10) * 60 * 60 * 1000
  : DEFAULT_TUNNEL_EXPIRY_MS;

const app = Fastify({
  logger: true,
});

await app.register(cors, {
  origin: true,
  credentials: true,
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
});

await app.register(rateLimit, {
  global: true,
  max: 200,
  timeWindow: '1 minute',
});

await app.register(jwt, {
  secret: process.env['JWT_SECRET'] ?? 'dev-secret-change-me',
});

await app.register(websocket, {
  options: { maxPayload: 64 * 1024 * 1024 },
});

initTunnelManager({
  domain: tunnelDomain,
  port,
  apiPublicUrl,
  expiryMs: tunnelExpiryMs,
  onExpired: (session) => {
    app.log.info({ subdomain: session.subdomain }, 'Tunnel expired');
  },
});

registerAuthRoutes(app);
registerCommentRoutes(app);
registerProjectRoutes(app);
registerTunnelRoutes(app, tunnelDomain, port);
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
    version: '0.1.0',
    projects: projectCount,
    tunnels: tunnelCount,
  };
});

app.get('/', async (request, reply) => {
  const subdomain = parseTunnelHost(request.headers.host, tunnelDomain);
  if (subdomain) {
    await proxyTunnelRequest(request, reply, tunnelDomain);
    return;
  }

  const hostHeader = request.headers.host?.split(':')[0]?.toLowerCase();
  const baseDomain = tunnelDomain.split(':')[0]?.toLowerCase();
  if (hostHeader === baseDomain) {
    await reply.redirect(dashboardUrl);
    return;
  }

  await reply.code(404).send({ error: 'Not found' });
});

registerTunnelHttpProxy(app, tunnelDomain);

let shuttingDown = false;

const shutdown = async (signal: string) => {
  if (shuttingDown) return;
  shuttingDown = true;

  app.log.info({ signal }, 'Shutting down gracefully');

  try {
    getTunnelManager().destroy();
    await app.close();
    await prisma.$disconnect();
    app.log.info('Shutdown complete');
    process.exit(0);
  } catch (err) {
    app.log.error({ err }, 'Error during shutdown');
    process.exit(1);
  }
};

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

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
