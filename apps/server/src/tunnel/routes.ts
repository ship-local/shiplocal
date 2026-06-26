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
import { hashPassword } from '../auth/crypto.js';
import { prisma } from '../db.js';
import { getTunnelManager } from './manager.js';
import { registerTunnel } from './register.js';
import {
  applyCorsHeaders,
  buildPreflightHeaders,
  requestHasCredentials,
  rewriteSetCookieHeaders,
} from './response-rewrite.js';
import { resolveCorsContext } from './cors-context.js';
import { isCloudEdition } from '../edition.js';
import {
  UNLOCK_PATH,
  handleTunnelUnlock,
  hasTunnelAccess,
  renderPasswordGateHtml,
} from './password.js';

const API_PUBLIC_URL = process.env['API_PUBLIC_URL'] ?? 'http://localhost:4000';
const DASHBOARD_URL = process.env['DASHBOARD_URL'] ?? 'http://localhost:3001';
const REGISTER_URL = new URL('/register', DASHBOARD_URL).toString();
const FEEDBACK_OVERLAY_ENABLED =
  isCloudEdition() && process.env['FEEDBACK_OVERLAY_ENABLED'] !== 'false';
const JWT_SECRET = process.env['JWT_SECRET'] ?? 'dev-secret-change-me';
const IS_PRODUCTION = process.env['NODE_ENV'] === 'production';

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

function headerValue(value: string | string[] | undefined): string | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value[0] : value;
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
                  message: `Authentication required. Register at ${REGISTER_URL} if you don't have an account, then run shiplocal login`,
                }),
              );
              socket.close();
              return;
            }

            const passwordHash = message.password ? await hashPassword(message.password) : null;

            let result;
            try {
              result = await registerTunnel(user.id, message, passwordHash);
            } catch (err) {
              socket.send(
                JSON.stringify({
                  type: 'error',
                  message: err instanceof Error ? err.message : 'Registration failed',
                }),
              );
              socket.close();
              return;
            }

            const project = await prisma.project.findUniqueOrThrow({
              where: { id: result.tunnel.projectId },
            });

            session = manager.createSession({
              socket,
              localPort: message.localPort,
              dbTunnelId: result.tunnel.id,
              projectId: result.tunnel.projectId,
              userId: user.id,
              subdomain: result.subdomain,
              publicUrl: result.publicUrl,
              expiresAt: result.expiresAt,
              passwordHash,
            });

            socket.send(
              JSON.stringify({
                type: 'registered',
                tunnelId: result.tunnel.id,
                subdomain: result.subdomain,
                publicUrl: result.publicUrl,
                expiresAt: result.expiresAt.toISOString(),
                projectSlug: project.slug,
                targetName: result.tunnel.name,
                siblingUrls: result.siblingUrls,
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

export async function proxyTunnelRequest(
  request: FastifyRequest,
  reply: FastifyReply,
  domain: string,
): Promise<void> {
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

  const requestHeaders = flattenHeaders(request.headers);
  const corsContext = await resolveCorsContext(session, requestHeaders);

  if (request.method === 'OPTIONS' && corsContext.isSiblingOrigin && corsContext.origin) {
    const preflightHeaders = buildPreflightHeaders(corsContext.origin, requestHeaders);
    for (const [key, value] of Object.entries(preflightHeaders)) {
      reply.header(key, value);
    }
    await reply.code(204).send();
    return;
  }

  if (session.passwordHash) {
    if (requestPath === UNLOCK_PATH) {
      let body: Buffer = Buffer.alloc(0);
      if (request.method === 'POST') {
        try {
          body = await collectBody(request);
        } catch {
          await reply.code(413).send({ error: 'Request body too large' });
          return;
        }
      }

      const handled = await handleTunnelUnlock(
        {
          ...request,
          body:
            body.length > 0
              ? Object.fromEntries(new URLSearchParams(body.toString('utf8')))
              : undefined,
        },
        reply,
        session.passwordHash,
        session.dbTunnelId,
        session.subdomain,
        JWT_SECRET,
        IS_PRODUCTION,
      );

      if (handled) return;
    }

    if (!hasTunnelAccess(request, session.dbTunnelId, session.subdomain, JWT_SECRET)) {
      await reply.type('text/html').send(renderPasswordGateHtml());
      return;
    }
  }

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
    const startedAt = Date.now();
    const response = await manager.forwardRequest(session, {
      type: 'request',
      id: randomUUID(),
      method: request.method,
      path: requestPath,
      query,
      headers: requestHeaders,
      body: body.length > 0 ? encodeBody(body) : undefined,
    });

    request.log.info(
      {
        subdomain: session.subdomain,
        tunnelId: session.dbTunnelId,
        method: request.method,
        path: requestPath,
        status: response.status,
        durationMs: Date.now() - startedAt,
      },
      'tunnel request',
    );

    const previewHost = (request.headers.host ?? '').split(':')[0] ?? session.subdomain;
    const isSecure =
      request.protocol === 'https' || headerValue(request.headers['x-forwarded-proto']) === 'https';

    let responseHeaders = applyCorsHeaders(
      response.headers,
      corsContext,
      requestHasCredentials(requestHeaders),
    );
    responseHeaders = rewriteSetCookieHeaders(responseHeaders, previewHost, isSecure);

    applyResponseHeaders(reply, responseHeaders);
    let responseBody = decodeBody(response.body);

    const contentType = response.headers['content-type'];
    const isHtml =
      typeof contentType === 'string'
        ? contentType.includes('text/html')
        : Array.isArray(contentType)
          ? contentType.some((v) => v.includes('text/html'))
          : false;

    if (FEEDBACK_OVERLAY_ENABLED && isHtml && response.status >= 200 && response.status < 300) {
      const { injectFeedbackOverlay } = await import('../routes/comments.js');
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
  // OPTIONS is handled by @fastify/cors — registering it here too crashes on startup
  // ("Method 'OPTIONS' already declared for route '/*'").
  app.route({
    method: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'],
    url: '/*',
    handler: async (request, reply) => {
      await proxyTunnelRequest(request, reply, domain);
    },
  });
}
