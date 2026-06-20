import type { FastifyInstance } from 'fastify';
import { createProjectSchema } from '@shiplocal/shared';
import { prisma } from '../db.js';
import { requireAuth } from '../auth/middleware.js';
import { getTunnelManager } from '../tunnel/manager.js';

export function registerProjectRoutes(app: FastifyInstance): void {
  app.get(
    '/api/projects',
    requireAuth(async (_request, reply, user) => {
      const projects = await prisma.project.findMany({
        where: { userId: user.id },
        include: {
          tunnels: {
            select: { id: true, status: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const manager = getTunnelManager();

      await reply.send({
        projects: projects.map((project) => ({
          id: project.id,
          name: project.name,
          createdAt: project.createdAt.toISOString(),
          tunnelCount: project.tunnels.length,
          onlineCount: project.tunnels.filter((t) => t.status === 'ONLINE' || manager.isLive(t.id))
            .length,
        })),
      });
    }),
  );

  app.post(
    '/api/projects',
    requireAuth(async (request, reply, user) => {
      const body = createProjectSchema.parse(request.body);

      const project = await prisma.project.create({
        data: {
          userId: user.id,
          name: body.name,
        },
      });

      await reply.code(201).send({
        project: {
          id: project.id,
          name: project.name,
          createdAt: project.createdAt.toISOString(),
          tunnelCount: 0,
          onlineCount: 0,
        },
      });
    }),
  );

  app.get(
    '/api/projects/:id',
    requireAuth(async (request, reply, user) => {
      const { id } = request.params as { id: string };

      const project = await prisma.project.findFirst({
        where: { id, userId: user.id },
        include: {
          tunnels: { orderBy: { createdAt: 'desc' } },
        },
      });

      if (!project) {
        await reply.code(404).send({ error: 'Project not found' });
        return;
      }

      const manager = getTunnelManager();

      await reply.send({
        project: {
          id: project.id,
          name: project.name,
          createdAt: project.createdAt.toISOString(),
          tunnels: project.tunnels.map((tunnel) => {
            const live = manager.getByDbTunnelId(tunnel.id);
            return {
              id: tunnel.id,
              subdomain: tunnel.subdomain,
              port: tunnel.port,
              status: live ? 'ONLINE' : tunnel.status,
              publicUrl: live?.publicUrl ?? null,
              createdAt: tunnel.createdAt.toISOString(),
              expiresAt: tunnel.expiresAt?.toISOString() ?? null,
              isLive: Boolean(live),
            };
          }),
        },
      });
    }),
  );
}
