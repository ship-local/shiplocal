import type { TunnelSession } from './manager.js';
import { getTunnelManager } from './manager.js';
import type { CorsContext } from './response-rewrite.js';

function headerValue(value: string | string[] | undefined): string | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

function originHost(origin: string): string | null {
  try {
    return new URL(origin).host.toLowerCase();
  } catch {
    return null;
  }
}

function publicUrlHost(publicUrl: string): string | null {
  try {
    return new URL(publicUrl).host.toLowerCase();
  } catch {
    return null;
  }
}

export async function resolveCorsContext(
  session: TunnelSession,
  requestHeaders: Record<string, string | string[]>,
): Promise<CorsContext> {
  const origin = headerValue(requestHeaders['origin']);
  if (!origin) {
    return { origin: null, isSiblingOrigin: false };
  }

  const originHostValue = originHost(origin);
  if (!originHostValue) {
    return { origin, isSiblingOrigin: false };
  }

  const manager = getTunnelManager();
  const liveSessions = manager.getProjectSessions(session.projectId);

  for (const sibling of liveSessions) {
    if (sibling.id === session.id) continue;
    const siblingHost = publicUrlHost(sibling.publicUrl);
    if (siblingHost && siblingHost === originHostValue) {
      return { origin, isSiblingOrigin: true };
    }
  }

  const { prisma } = await import('../db.js');
  const dbTunnels = await prisma.tunnel.findMany({
    where: { projectId: session.projectId, id: { not: session.dbTunnelId } },
    select: { subdomain: true },
  });

  for (const tunnel of dbTunnels) {
    const siblingUrl = manager.buildPublicUrl(tunnel.subdomain);
    const siblingHost = publicUrlHost(siblingUrl);
    if (siblingHost && siblingHost === originHostValue) {
      return { origin, isSiblingOrigin: true };
    }
  }

  return { origin, isSiblingOrigin: false };
}
