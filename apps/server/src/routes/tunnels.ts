import type { FastifyInstance } from 'fastify';
import { prisma } from '../db.js';
import { requireAuth } from '../auth/middleware.js';
import { getTunnelManager } from '../tunnel/manager.js';

function buildPublicUrl(subdomain: string, domain: string, port: number): string | null {
  const hostname = domain.split(':')[0] ?? domain;
  const isLocal = hostname === 'localhost' || hostname.endsWith('.localhost');

  if (isLocal) {
    return `http://${subdomain}.localhost:${String(port)}`;
  }

  const protocol = port === 443 ? 'https' : 'http';
  const portSuffix = port === 80 || port === 443 ? '' : `:${String(port)}`;
  return `${protocol}://${subdomain}.${domain}${portSuffix}`;
}

export function registerTunnelRoutes(
  app: FastifyInstance,
  domain: string,
  serverPort: number,
): void {
  app.get(
    '/api/tunnels',
    requireAuth(async (_request, reply, user) => {
      const tunnels = await prisma.tunnel.findMany({
        where: { project: { userId: user.id } },
        include: { project: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      });

      const manager = getTunnelManager();

      await reply.send({
        tunnels: tunnels.map((tunnel) => {
          const live = manager.getByDbTunnelId(tunnel.id);
          return {
            id: tunnel.id,
            projectId: tunnel.projectId,
            projectName: tunnel.project.name,
            subdomain: tunnel.subdomain,
            port: tunnel.port,
            status: live ? 'ONLINE' : tunnel.status,
            publicUrl: live?.publicUrl ?? buildPublicUrl(tunnel.subdomain, domain, serverPort),
            createdAt: tunnel.createdAt.toISOString(),
            expiresAt: tunnel.expiresAt?.toISOString() ?? null,
            isLive: Boolean(live),
          };
        }),
      });
    }),
  );

  app.post(
    '/api/tunnels/:id/stop',
    requireAuth(async (request, reply, user) => {
      const { id } = request.params as { id: string };
      const manager = getTunnelManager();

      const tunnel = await prisma.tunnel.findFirst({
        where: { id, project: { userId: user.id } },
      });

      if (!tunnel) {
        await reply.code(404).send({ error: 'Tunnel not found' });
        return;
      }

      const session = manager.getByDbTunnelId(id);
      if (session) {
        manager.removeSession(session, { updateDb: true });
      } else {
        await prisma.tunnel.update({
          where: { id },
          data: { status: 'OFFLINE' },
        });
      }

      await reply.send({ ok: true });
    }),
  );

  app.post(
    '/api/tunnels/:id/restart',
    requireAuth(async (request, reply, user) => {
      const { id } = request.params as { id: string };
      const manager = getTunnelManager();

      const tunnel = await prisma.tunnel.findFirst({
        where: { id, project: { userId: user.id } },
      });

      if (!tunnel) {
        await reply.code(404).send({ error: 'Tunnel not found' });
        return;
      }

      const session = manager.getByDbTunnelId(id);
      if (session) {
        manager.removeSession(session, { updateDb: true });
      }

      await reply.send({
        ok: true,
        message: 'Tunnel stopped. Restart your CLI to reconnect.',
      });
    }),
  );

  app.delete(
    '/api/tunnels/:id',
    requireAuth(async (request, reply, user) => {
      const { id } = request.params as { id: string };
      const manager = getTunnelManager();

      const tunnel = await prisma.tunnel.findFirst({
        where: { id, project: { userId: user.id } },
      });

      if (!tunnel) {
        await reply.code(404).send({ error: 'Tunnel not found' });
        return;
      }

      const session = manager.getByDbTunnelId(id);
      if (session) {
        manager.removeSession(session, { updateDb: false });
      }

      await prisma.tunnel.delete({ where: { id } });
      await reply.send({ ok: true });
    }),
  );
}
