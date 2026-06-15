import type { FastifyReply, FastifyRequest } from 'fastify';
import { hashApiToken, isApiToken } from './crypto.js';
import { prisma } from '../db.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string | null;
}

declare module 'fastify' {
  interface FastifyRequest {
    currentUser?: AuthenticatedUser;
  }
}

export async function authenticateRequest(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<AuthenticatedUser | null> {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    await reply.code(401).send({ error: 'Unauthorized' });
    return null;
  }

  const token = header.slice('Bearer '.length);

  if (isApiToken(token)) {
    const apiToken = await prisma.apiToken.findUnique({
      where: { tokenHash: hashApiToken(token) },
      include: { user: true },
    });

    if (!apiToken) {
      await reply.code(401).send({ error: 'Invalid API token' });
      return null;
    }

    void prisma.apiToken.update({
      where: { id: apiToken.id },
      data: { lastUsed: new Date() },
    });

    return {
      id: apiToken.user.id,
      email: apiToken.user.email,
      name: apiToken.user.name,
    };
  }

  try {
    const payload = request.server.jwt.verify<{ sub: string; email: string; name: string | null }>(
      token,
    );

    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
    };
  } catch {
    await reply.code(401).send({ error: 'Invalid or expired token' });
    return null;
  }
}

export function requireAuth(
  handler: (request: FastifyRequest, reply: FastifyReply, user: AuthenticatedUser) => Promise<void>,
) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await authenticateRequest(request, reply);
    if (!user) return;
    request.currentUser = user;
    await handler(request, reply, user);
  };
}
