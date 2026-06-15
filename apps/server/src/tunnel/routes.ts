import { randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  decodeBody,
  encodeBody,
  MAX_BODY_BYTES,
  parseTunnelHost,
  parseTunnelMessage,
  parseTunnelPath,
  TUNNEL_WS_PATH,
} from '@shiplocal/shared';
import { resolveUserFromApiToken } from '../routes/auth.js';
import { prisma } from '../db.js';
import { getTunnelManager } from './manager.js';
import { injectFeedbackOverlay, isHtmlResponse } from '../routes/comments.js';

const API_PUBLIC_URL = process.env['API_PUBLIC_URL'] ?? 'http://localhost:4000';
const FEEDBACK_OVERLAY_ENABLED = process.env['FEEDBACK_OVERLAY_ENABLED'] !== 'false';

function rawDataToString(raw: unknown): string {
  if (typeof raw === 'string') return raw;
  if (Buffer.isBuffer(raw)) return raw.toString('utf8');
  if (Array.isArray(raw)) return Buffer.concat(raw).toString('utf8');
  if (raw instanceof ArrayBuffer) return Buffer.from(raw).toString('utf8');
  return String(raw);
}

function collectBody(request: FastifyRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;

    request.raw.on('data', (chunk: Buffer) => {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        reject(new Error('Request body too large'));
        request.raw.destroy();
        return;
      }
      chunks.push(chunk);
    });

    request.raw.on('end', () => {
      resolve(Buffer.concat(chunks));
    });

    request.raw.on('error', reject);
  });
}

function flattenHeaders(headers: FastifyRequest['headers']): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {};

  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined) continue;
    result[key] = value;
  }

  return result;
}

function applyResponseHeaders(
  reply: FastifyReply,
  headers: Record<string, string | string[]>,
): void {
  const skip = new Set(['transfer-encoding', 'content-encoding', 'content-length']);

  for (const [key, value] of Object.entries(headers)) {
    const lower = key.toLowerCase();
    if (skip.has(lower)) continue;
    reply.header(key, value);
  }
}

async function getOrCreateProject(userId: string, projectId?: string) {
  if (projectId) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
    });
    if (project) return project;
  }

  const existing = await prisma.project.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });

  if (existing) return existing;

  return prisma.project.create({
    data: { userId, name: 'My Demo Site' },
  });
}

export function registerTunnelWebSocket(app: FastifyInstance): void {
  app.get(TUNNEL_WS_PATH, { websocket: true }, (socket) => {
    const manager = getTunnelManager();
    let session = null as ReturnType<typeof manager.createSession> | null;

    socket.on('message', (raw) => {
      void (async () => {
        try {
          const message = parseTunnelMessage(rawDataToString(raw));

          if (message.type === 'register') {
            if (session) return;

            const user = await resolveUserFromApiToken(message.token);
            if (!user) {
              socket.send(
                JSON.stringify({
                  type: 'error',
                  message: 'Authentication required. Run shiplocal login',
                }),
              );
              socket.close();
              return;
            }

            const project = await getOrCreateProject(user.id, message.projectId);
            const subdomain = manager.generateSubdomain();
            const expiresAt = manager.getExpiryDate();
            const publicUrl = manager.buildPublicUrl(subdomain);

            const dbTunnel = await prisma.tunnel.create({
              data: {
                projectId: project.id,
                subdomain,
                port: message.localPort,
                status: 'ONLINE',
                expiresAt,
              },
            });

            session = manager.createSession({
              socket,
              localPort: message.localPort,
              dbTunnelId: dbTunnel.id,
              projectId: project.id,
              userId: user.id,
              subdomain,
              publicUrl,
              expiresAt,
            });

            socket.send(
              JSON.stringify({
                type: 'registered',
                tunnelId: dbTunnel.id,
                subdomain: session.subdomain,
                publicUrl: session.publicUrl,
                expiresAt: session.expiresAt.toISOString(),
              }),
            );
            return;
          }

          if (!session) return;

          if (message.type === 'pong') {
            manager.handlePong(session);
            return;
          }

          if (message.type === 'response') {
            manager.handleResponse(session, message);
          }
        } catch (err) {
          app.log.warn({ err }, 'Invalid tunnel WebSocket message');
        }
      })();
    });

    socket.on('close', () => {
      if (session) {
        manager.removeSession(session);
      }
    });
  });
}

async function proxyTunnelRequest(
  request: FastifyRequest,
  reply: FastifyReply,
  domain: string,
): Promise<void> {
  if (
    request.url.startsWith('/api/') ||
    request.url.startsWith('/health') ||
    request.url.startsWith('/overlay.js')
  ) {
    reply.callNotFound();
    return;
  }

  const manager = getTunnelManager();
  const hostSubdomain = parseTunnelHost(request.headers.host, domain);
  const pathMatch = hostSubdomain ? null : parseTunnelPath(request.url);

  const subdomain = hostSubdomain ?? pathMatch?.subdomain;
  if (!subdomain) {
    reply.callNotFound();
    return;
  }

  const session = manager.getBySubdomain(subdomain);
  if (!session) {
    await reply.code(404).send({ error: 'Tunnel not found or offline' });
    return;
  }

  const requestPath = pathMatch?.path ?? request.url.split('?')[0] ?? '/';
  const query = request.url.includes('?') ? (request.url.split('?')[1] ?? '') : '';

  let body: Buffer;
  try {
    body =
      request.method === 'GET' || request.method === 'HEAD'
        ? Buffer.alloc(0)
        : await collectBody(request);
  } catch {
    await reply.code(413).send({ error: 'Request body too large' });
    return;
  }

  try {
    const response = await manager.forwardRequest(session, {
      type: 'request',
      id: randomUUID(),
      method: request.method,
      path: requestPath,
      query,
      headers: flattenHeaders(request.headers),
      body: body.length > 0 ? encodeBody(body) : undefined,
    });

    applyResponseHeaders(reply, response.headers);
    let responseBody = decodeBody(response.body);

    const contentType = response.headers['content-type'];
    if (
      FEEDBACK_OVERLAY_ENABLED &&
      isHtmlResponse(contentType) &&
      response.status >= 200 &&
      response.status < 300
    ) {
      const html = injectFeedbackOverlay(
        responseBody.toString('utf8'),
        session.dbTunnelId,
        API_PUBLIC_URL,
      );
      responseBody = Buffer.from(html, 'utf8');
      reply.header('content-type', 'text/html; charset=utf-8');
    }

    await reply.code(response.status).send(responseBody);
  } catch (err) {
    request.log.error({ err, subdomain }, 'Tunnel proxy failed');
    await reply.code(502).send({ error: 'Tunnel proxy failed' });
  }
}

export function registerTunnelHttpProxy(app: FastifyInstance, domain: string): void {
  app.route({
    method: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'],
    url: '/*',
    handler: async (request, reply) => {
      await proxyTunnelRequest(request, reply, domain);
    },
  });
}
