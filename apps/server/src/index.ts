import 'dotenv/config';
import cors from '@fastify/cors';
import Fastify from 'fastify';
import { DEFAULT_SERVER_PORT } from '@shiplocal/shared';
import { checkDatabaseConnection, prisma } from './db.js';

const port = Number.parseInt(process.env['PORT'] ?? String(DEFAULT_SERVER_PORT), 10);
const host = process.env['HOST'] ?? '0.0.0.0';

const app = Fastify({
  logger: true,
});

await app.register(cors, {
  origin: true,
});

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

const start = async () => {
  try {
    await app.listen({ port, host });
    app.log.info(`Server listening on http://${host}:${String(port)}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

void start();
