import type { FastifyInstance } from 'fastify';
import { loginSchema, registerSchema } from '@shiplocal/shared';
import { prisma } from '../db.js';
import {
  generateApiTokenValue,
  getApiTokenPrefix,
  hashApiToken,
  hashPassword,
  isApiToken,
  verifyPassword,
} from '../auth/crypto.js';
import { requireAuth } from '../auth/middleware.js';

const DASHBOARD_URL = process.env['DASHBOARD_URL'] ?? 'http://localhost:3001';

async function createApiTokenForUser(userId: string): Promise<string> {
  const token = generateApiTokenValue();

  await prisma.apiToken.create({
    data: {
      userId,
      tokenHash: hashApiToken(token),
      prefix: getApiTokenPrefix(token),
      name: 'CLI',
    },
  });

  return token;
}

function signJwt(
  app: FastifyInstance,
  user: { id: string; email: string; name: string | null },
): string {
  return app.jwt.sign(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
    },
    { expiresIn: '7d' },
  );
}

export function registerAuthRoutes(app: FastifyInstance): void {
  app.post('/api/auth/register', async (request, reply) => {
    const body = registerSchema.parse(request.body);

    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) {
      await reply.code(409).send({ error: 'Email already registered' });
      return;
    }

    const passwordHash = await hashPassword(body.password);
    const user = await prisma.user.create({
      data: {
        email: body.email,
        name: body.name ?? null,
        passwordHash,
      },
    });

    await prisma.project.create({
      data: {
        userId: user.id,
        name: 'My Demo Site',
      },
    });

    const [token, apiToken] = await Promise.all([
      Promise.resolve(signJwt(app, user)),
      createApiTokenForUser(user.id),
    ]);

    await reply.send({
      user: { id: user.id, email: user.email, name: user.name },
      token,
      apiToken,
    });
  });

  app.post('/api/auth/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);

    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user?.passwordHash) {
      await reply.code(401).send({ error: 'Invalid email or password' });
      return;
    }

    const valid = await verifyPassword(body.password, user.passwordHash);
    if (!valid) {
      await reply.code(401).send({ error: 'Invalid email or password' });
      return;
    }

    const token = signJwt(app, user);

    const existingToken = await prisma.apiToken.findFirst({
      where: { userId: user.id, name: 'CLI' },
      orderBy: { createdAt: 'desc' },
    });

    let apiToken: string;
    if (existingToken) {
      apiToken = generateApiTokenValue();
      await prisma.apiToken.update({
        where: { id: existingToken.id },
        data: {
          tokenHash: hashApiToken(apiToken),
          prefix: getApiTokenPrefix(apiToken),
        },
      });
    } else {
      apiToken = await createApiTokenForUser(user.id);
    }

    await reply.send({
      user: { id: user.id, email: user.email, name: user.name },
      token,
      apiToken,
    });
  });

  app.get(
    '/api/auth/me',
    requireAuth(async (_request, reply, user) => {
      await reply.send({ user });
    }),
  );

  app.post(
    '/api/auth/token',
    requireAuth(async (_request, reply, user) => {
      const apiToken = await createApiTokenForUser(user.id);
      await reply.send({ apiToken });
    }),
  );

  app.get('/api/auth/google', async (_request, reply) => {
    const clientId = process.env['GOOGLE_CLIENT_ID'];
    if (!clientId) {
      await reply.code(503).send({ error: 'Google OAuth not configured' });
      return;
    }

    const redirectUri = `${process.env['API_PUBLIC_URL'] ?? 'http://localhost:4000'}/api/auth/google/callback`;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'online',
      prompt: 'select_account',
    });

    await reply.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  });

  app.get('/api/auth/google/callback', async (request, reply) => {
    const clientId = process.env['GOOGLE_CLIENT_ID'];
    const clientSecret = process.env['GOOGLE_CLIENT_SECRET'];
    if (!clientId || !clientSecret) {
      await reply.code(503).send({ error: 'Google OAuth not configured' });
      return;
    }

    const code = (request.query as { code?: string }).code;
    if (!code) {
      await reply.code(400).send({ error: 'Missing authorization code' });
      return;
    }

    const redirectUri = `${process.env['API_PUBLIC_URL'] ?? 'http://localhost:4000'}/api/auth/google/callback`;

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      await reply.code(401).send({ error: 'Failed to exchange Google authorization code' });
      return;
    }

    const tokenData = (await tokenRes.json()) as { access_token?: string };
    if (!tokenData.access_token) {
      await reply.code(401).send({ error: 'Invalid Google token response' });
      return;
    }

    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!profileRes.ok) {
      await reply.code(401).send({ error: 'Failed to fetch Google profile' });
      return;
    }

    const profile = (await profileRes.json()) as {
      email?: string;
      name?: string;
      picture?: string;
    };

    if (!profile.email) {
      await reply.code(400).send({ error: 'Google account has no email' });
      return;
    }

    let user = await prisma.user.findUnique({ where: { email: profile.email } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: profile.email,
          name: profile.name ?? null,
          image: profile.picture ?? null,
        },
      });

      await prisma.project.create({
        data: { userId: user.id, name: 'My Demo Site' },
      });
    } else if (profile.picture && !user.image) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { image: profile.picture, name: user.name ?? profile.name ?? null },
      });
    }

    const jwt = signJwt(app, user);
    const redirectUrl = new URL('/auth/callback', DASHBOARD_URL);
    redirectUrl.searchParams.set('token', jwt);
    await reply.redirect(redirectUrl.toString());
  });
}

export async function resolveUserFromApiToken(token: string | undefined) {
  if (!token || !isApiToken(token)) return null;

  const apiToken = await prisma.apiToken.findUnique({
    where: { tokenHash: hashApiToken(token) },
    include: { user: true },
  });

  if (!apiToken) return null;

  void prisma.apiToken.update({
    where: { id: apiToken.id },
    data: { lastUsed: new Date() },
  });

  return apiToken.user;
}
