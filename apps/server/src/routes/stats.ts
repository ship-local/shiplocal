import type { FastifyInstance } from 'fastify';
import { prisma } from '../db.js';
import { requireAdmin, requireAuth } from '../auth/middleware.js';
import { getNpmDownloadStats } from '../lib/npm-downloads.js';
import { getTunnelManager } from '../tunnel/manager.js';

export function registerStatsRoutes(app: FastifyInstance): void {
  app.get(
    '/api/stats',
    requireAuth(async (_request, reply, user) => {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const owned = { project: { userId: user.id } };

      const [projectCount, linksGenerated, linksLast7Days, linksLast30Days, npm] =
        await Promise.all([
          prisma.project.count({ where: { userId: user.id } }),
          prisma.tunnel.count({ where: owned }),
          prisma.tunnel.count({ where: { ...owned, createdAt: { gte: sevenDaysAgo } } }),
          prisma.tunnel.count({ where: { ...owned, createdAt: { gte: thirtyDaysAgo } } }),
          getNpmDownloadStats(),
        ]);

      const manager = getTunnelManager();

      await reply.send({
        projects: projectCount,
        linksGenerated,
        linksLast7Days,
        linksLast30Days,
        onlineNow: manager.getLiveCountForUser(user.id),
        npm: {
          package: npm.package,
          downloadsLastWeek: npm.lastWeek,
          downloadsLastMonth: npm.lastMonth,
          fetchedAt: npm.fetchedAt,
        },
      });
    }),
  );

  app.get(
    '/api/admin/stats',
    requireAdmin(async (_request, reply) => {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [
        usersTotal,
        usersLast7Days,
        usersLast30Days,
        projectsTotal,
        projectsLast7Days,
        projectsLast30Days,
        linksTotal,
        linksLast7Days,
        linksLast30Days,
        activeLast7Days,
        activeLast30Days,
        recentUsers,
        npm,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
        prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
        prisma.project.count(),
        prisma.project.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
        prisma.project.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
        prisma.tunnel.count(),
        prisma.tunnel.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
        prisma.tunnel.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
        prisma.user.count({
          where: { apiTokens: { some: { lastUsed: { gte: sevenDaysAgo } } } },
        }),
        prisma.user.count({
          where: { apiTokens: { some: { lastUsed: { gte: thirtyDaysAgo } } } },
        }),
        prisma.user.findMany({
          orderBy: { createdAt: 'desc' },
          take: 12,
          select: { id: true, email: true, name: true, createdAt: true },
        }),
        getNpmDownloadStats(),
      ]);

      await reply.send({
        users: {
          total: usersTotal,
          last7Days: usersLast7Days,
          last30Days: usersLast30Days,
        },
        projects: {
          total: projectsTotal,
          last7Days: projectsLast7Days,
          last30Days: projectsLast30Days,
        },
        links: {
          total: linksTotal,
          last7Days: linksLast7Days,
          last30Days: linksLast30Days,
          onlineNow: getTunnelManager().getLiveCount(),
        },
        activeAccounts: {
          last7Days: activeLast7Days,
          last30Days: activeLast30Days,
        },
        npm: {
          package: npm.package,
          downloadsLastWeek: npm.lastWeek,
          downloadsLastMonth: npm.lastMonth,
          fetchedAt: npm.fetchedAt,
        },
        recentUsers: recentUsers.map((user) => ({
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt.toISOString(),
        })),
      });
    }),
  );
}
