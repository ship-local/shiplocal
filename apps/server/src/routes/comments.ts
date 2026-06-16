import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import type { Prisma } from '../generated/prisma/client.js';
import { createCommentSchema } from '@shiplocal/shared';
import { prisma } from '../db.js';
import { requireAuth } from '../auth/middleware.js';
import { getTunnelManager } from '../tunnel/manager.js';

const OVERLAY_SCRIPT_PATH = join(process.cwd(), '../../packages/feedback-overlay/dist/overlay.js');

let overlayScriptCache: string | null = null;

function getOverlayScript(): string {
  overlayScriptCache ??= readFileSync(OVERLAY_SCRIPT_PATH, 'utf8');
  return overlayScriptCache;
}

export function registerCommentRoutes(app: FastifyInstance): void {
  app.get('/overlay.js', async (_request, reply) => {
    try {
      const script = getOverlayScript();
      reply.header('Content-Type', 'application/javascript; charset=utf-8');
      reply.header('Cache-Control', 'public, max-age=300');
      await reply.send(script);
    } catch {
      await reply.code(404).send({ error: 'Feedback overlay not built. Run pnpm build.' });
    }
  });

  app.post(
    '/api/comments',
    {
      config: {
        rateLimit: {
          max: 30,
          timeWindow: '1 minute',
        },
      },
    },
    async (request, reply) => {
      const body = createCommentSchema.parse(request.body);

      const tunnel = await prisma.tunnel.findUnique({
        where: { id: body.tunnelId },
      });

      if (!tunnel) {
        await reply.code(404).send({ error: 'Tunnel not found' });
        return;
      }

      const manager = getTunnelManager();
      const live = manager.getByDbTunnelId(tunnel.id);
      if (!live) {
        await reply.code(400).send({ error: 'Tunnel is offline' });
        return;
      }

      const comment = await prisma.comment.create({
        data: {
          tunnelId: tunnel.id,
          page: body.page,
          selector: body.selector,
          x: body.x,
          y: body.y,
          message: body.message,
          screenshot: body.screenshot,
          ...(body.metadata ? { metadata: body.metadata as Prisma.InputJsonValue } : {}),
        },
      });

      await reply.code(201).send({
        comment: {
          id: comment.id,
          createdAt: comment.createdAt.toISOString(),
        },
      });
    },
  );

  app.get(
    '/api/comments',
    requireAuth(async (request, reply, user) => {
      const query = request.query as { tunnelId?: string; projectId?: string };

      const comments = await prisma.comment.findMany({
        where: {
          tunnel: {
            project: { userId: user.id },
            ...(query.projectId ? { projectId: query.projectId } : {}),
            ...(query.tunnelId ? { id: query.tunnelId } : {}),
          },
        },
        include: {
          tunnel: {
            select: {
              id: true,
              subdomain: true,
              port: true,
              project: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      await reply.send({
        comments: comments.map((comment) => ({
          id: comment.id,
          tunnelId: comment.tunnelId,
          projectId: comment.tunnel.project.id,
          projectName: comment.tunnel.project.name,
          subdomain: comment.tunnel.subdomain,
          page: comment.page,
          selector: comment.selector,
          x: comment.x,
          y: comment.y,
          message: comment.message,
          screenshot: comment.screenshot,
          createdAt: comment.createdAt.toISOString(),
        })),
      });
    }),
  );
}

export function injectFeedbackOverlay(html: string, tunnelId: string, apiUrl: string): string {
  const safeTunnelId = tunnelId.replace(/"/g, '');
  const safeApiUrl = apiUrl.replace(/"/g, '');
  const scriptTag = `<script src="${safeApiUrl}/overlay.js" data-tunnel-id="${safeTunnelId}" data-api-url="${safeApiUrl}" defer></script>`;

  if (html.includes('</body>')) {
    return html.replace('</body>', `${scriptTag}</body>`);
  }

  return `${html}${scriptTag}`;
}

export function isHtmlResponse(contentType: string | string[] | undefined): boolean {
  if (!contentType) return false;
  const value = Array.isArray(contentType) ? contentType[0] : contentType;
  return value?.includes('text/html') ?? false;
}
