import { createHmac, timingSafeEqual } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { verifyPassword } from '../auth/crypto.js';

const COOKIE_PREFIX = 'sl_tunnel_';
const UNLOCK_PATH = '/_shiplocal/unlock';

export function tunnelAccessCookieName(subdomain: string): string {
  return `${COOKIE_PREFIX}${subdomain}`;
}

export function createTunnelAccessToken(
  tunnelId: string,
  subdomain: string,
  secret: string,
): string {
  return createHmac('sha256', secret).update(`${tunnelId}:${subdomain}`).digest('hex');
}

export function verifyTunnelAccessToken(
  token: string,
  tunnelId: string,
  subdomain: string,
  secret: string,
): boolean {
  const expected = createTunnelAccessToken(tunnelId, subdomain, secret);

  try {
    const tokenBuffer = Buffer.from(token, 'hex');
    const expectedBuffer = Buffer.from(expected, 'hex');
    return (
      tokenBuffer.length === expectedBuffer.length && timingSafeEqual(tokenBuffer, expectedBuffer)
    );
  } catch {
    return false;
  }
}

function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};

  const cookies: Record<string, string> = {};

  for (const part of header.split(';')) {
    const [rawKey, ...rest] = part.trim().split('=');
    if (!rawKey || rest.length === 0) continue;
    cookies[rawKey] = decodeURIComponent(rest.join('='));
  }

  return cookies;
}

export function hasTunnelAccess(
  request: FastifyRequest,
  tunnelId: string,
  subdomain: string,
  secret: string,
): boolean {
  const cookies = parseCookies(request.headers.cookie);
  const token = cookies[tunnelAccessCookieName(subdomain)];
  if (!token) return false;
  return verifyTunnelAccessToken(token, tunnelId, subdomain, secret);
}

export function setTunnelAccessCookie(
  reply: FastifyReply,
  tunnelId: string,
  subdomain: string,
  secret: string,
  secure: boolean,
): void {
  const token = createTunnelAccessToken(tunnelId, subdomain, secret);
  const parts = [
    `${tunnelAccessCookieName(subdomain)}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=86400',
  ];

  if (secure) {
    parts.push('Secure');
  }

  reply.header('Set-Cookie', parts.join('; '));
}

export function renderPasswordGateHtml(error?: string): string {
  const errorBlock = error
    ? `<p style="color:#ef4444;font-size:14px;margin:0 0 16px">${escapeHtml(error)}</p>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Password required — ShipLocal</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0a0a0a; color: #fafafa; display: grid; place-items: center; min-height: 100vh; margin: 0; }
    form { background: #171717; border: 1px solid #333; border-radius: 12px; padding: 2rem; width: min(100%, 360px); }
    h1 { font-size: 1.25rem; margin: 0 0 0.5rem; }
    p { color: #a3a3a3; font-size: 0.875rem; margin: 0 0 1.5rem; }
    input { width: 100%; box-sizing: border-box; padding: 0.75rem; border-radius: 8px; border: 1px solid #333; background: #0a0a0a; color: #fafafa; margin-bottom: 1rem; }
    button { width: 100%; padding: 0.75rem; border: none; border-radius: 8px; background: #3b82f6; color: white; font-weight: 600; cursor: pointer; }
  </style>
</head>
<body>
  <form method="POST" action="${UNLOCK_PATH}">
    <h1>Password required</h1>
    <p>This preview link is protected. Enter the password your developer shared.</p>
    ${errorBlock}
    <input type="password" name="password" placeholder="Password" required autofocus />
    <button type="submit">Continue</button>
  </form>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export async function handleTunnelUnlock(
  request: FastifyRequest,
  reply: FastifyReply,
  passwordHash: string,
  tunnelId: string,
  subdomain: string,
  secret: string,
  secure: boolean,
): Promise<boolean> {
  if (request.method === 'GET') {
    await reply.type('text/html').send(renderPasswordGateHtml());
    return true;
  }

  if (request.method !== 'POST') {
    await reply.code(405).send({ error: 'Method not allowed' });
    return true;
  }

  const body = request.body as { password?: string } | undefined;
  const password = body?.password ?? '';

  const valid = await verifyPassword(password, passwordHash);
  if (!valid) {
    await reply.type('text/html').code(401).send(renderPasswordGateHtml('Incorrect password'));
    return true;
  }

  setTunnelAccessCookie(reply, tunnelId, subdomain, secret, secure);
  await reply.redirect('/');
  return true;
}

export { UNLOCK_PATH };
