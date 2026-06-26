import { randomUUID } from 'node:crypto';
import {
  buildProjectSubdomain,
  dedupeSlug,
  generateSubdomain,
  isValidProjectSlug,
  isValidTargetName,
  normalizeTargetName,
  slugifyProjectName,
  type RegisterMessage,
  type SiblingTunnel,
} from '@shiplocal/shared';
import type { Project, Tunnel } from '../generated/prisma/client.js';
import { prisma } from '../db.js';
import { getTunnelManager } from './manager.js';

export interface ResolvedRegisterContext {
  project: Project;
  targetName: string;
  useCoordinatedNaming: boolean;
}

export interface RegisterTunnelResult {
  tunnel: Tunnel;
  subdomain: string;
  publicUrl: string;
  expiresAt: Date;
  siblingUrls: SiblingTunnel[];
  reconnected: boolean;
}

function usesCoordinatedNaming(message: RegisterMessage): boolean {
  return Boolean(message.projectSlug ?? message.projectId);
}

export async function resolveProjectForRegister(
  userId: string,
  message: RegisterMessage,
): Promise<ResolvedRegisterContext> {
  const useCoordinatedNaming = usesCoordinatedNaming(message);
  const requestedTargetName = message.targetName ? normalizeTargetName(message.targetName) : 'web';

  if (message.targetName && !isValidTargetName(requestedTargetName)) {
    throw new Error('Invalid target name. Use lowercase letters, numbers, and hyphens.');
  }

  const targetName = useCoordinatedNaming
    ? requestedTargetName
    : `legacy-${randomUUID().slice(0, 8)}`;

  if (message.projectSlug) {
    const slug = message.projectSlug.toLowerCase();
    if (!isValidProjectSlug(slug)) {
      throw new Error('Invalid project slug.');
    }

    const existing = await prisma.project.findFirst({
      where: { slug, userId },
    });

    if (existing) {
      return { project: existing, targetName, useCoordinatedNaming: true };
    }

    const name = slug
      .split('-')
      .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

    const project = await prisma.project.create({
      data: { userId, name, slug },
    });

    return { project, targetName, useCoordinatedNaming: true };
  }

  if (message.projectId) {
    const project = await prisma.project.findFirst({
      where: { id: message.projectId, userId },
    });

    if (!project) {
      throw new Error('Project not found.');
    }

    return { project, targetName, useCoordinatedNaming: true };
  }

  const existing = await prisma.project.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });

  if (existing) {
    return { project: existing, targetName, useCoordinatedNaming: false };
  }

  const baseSlug = slugifyProjectName('My Demo Site') || 'my-demo-site';
  const taken = await prisma.project.findMany({ select: { slug: true } });
  const slugSet = new Set(taken.map((p) => p.slug));
  const slug = dedupeSlug(baseSlug, slugSet);

  const project = await prisma.project.create({
    data: { userId, name: 'My Demo Site', slug },
  });

  return { project, targetName, useCoordinatedNaming: false };
}

async function allocateSubdomain(
  project: Project,
  targetName: string,
  useCoordinatedNaming: boolean,
): Promise<string> {
  if (!useCoordinatedNaming) {
    const manager = getTunnelManager();
    let subdomain = generateSubdomain();
    while (
      manager.getBySubdomain(subdomain) ||
      (await prisma.tunnel.findUnique({ where: { subdomain } }))
    ) {
      subdomain = generateSubdomain();
    }
    return subdomain;
  }

  const subdomain = buildProjectSubdomain(project.slug, targetName);
  const existing = await prisma.tunnel.findUnique({ where: { subdomain } });

  if (existing && existing.projectId !== project.id) {
    throw new Error(`Subdomain "${subdomain}" is already in use.`);
  }

  return subdomain;
}

async function getSiblingUrls(
  projectId: string,
  excludeTunnelId: string,
): Promise<SiblingTunnel[]> {
  const manager = getTunnelManager();
  const tunnels = await prisma.tunnel.findMany({
    where: { projectId, id: { not: excludeTunnelId } },
    select: { id: true, name: true, port: true, subdomain: true },
  });

  return tunnels.map((tunnel) => {
    const live = manager.getByDbTunnelId(tunnel.id);
    return {
      name: tunnel.name,
      port: tunnel.port,
      publicUrl: live?.publicUrl ?? manager.buildPublicUrl(tunnel.subdomain),
    };
  });
}

export async function registerTunnel(
  userId: string,
  message: RegisterMessage,
  passwordHash: string | null,
): Promise<RegisterTunnelResult> {
  const manager = getTunnelManager();
  const expiresAt = manager.getExpiryDate();

  if (message.tunnelId) {
    const existing = await prisma.tunnel.findFirst({
      where: { id: message.tunnelId, project: { userId } },
      include: { project: true },
    });

    if (!existing) {
      throw new Error('Tunnel not found.');
    }

    const liveSession = manager.getByDbTunnelId(existing.id);
    if (liveSession) {
      throw new Error('Tunnel is already online from another CLI session.');
    }

    const publicUrl = manager.buildPublicUrl(existing.subdomain);

    const tunnel = await prisma.tunnel.update({
      where: { id: existing.id },
      data: {
        port: message.localPort,
        status: 'ONLINE',
        expiresAt,
        ...(passwordHash !== null ? { passwordHash } : {}),
      },
    });

    const siblingUrls = await getSiblingUrls(existing.projectId, existing.id);

    return {
      tunnel,
      subdomain: existing.subdomain,
      publicUrl,
      expiresAt,
      siblingUrls,
      reconnected: true,
    };
  }

  const { project, targetName, useCoordinatedNaming } = await resolveProjectForRegister(
    userId,
    message,
  );

  const existingTarget = await prisma.tunnel.findUnique({
    where: {
      projectId_name: {
        projectId: project.id,
        name: targetName,
      },
    },
  });

  if (existingTarget) {
    const liveSession = manager.getByDbTunnelId(existingTarget.id);
    if (liveSession) {
      throw new Error(
        `Target "${targetName}" is already online. Stop it first or use a different --name.`,
      );
    }

    const publicUrl = manager.buildPublicUrl(existingTarget.subdomain);
    const tunnel = await prisma.tunnel.update({
      where: { id: existingTarget.id },
      data: {
        port: message.localPort,
        status: 'ONLINE',
        expiresAt,
        ...(passwordHash !== null ? { passwordHash } : {}),
      },
    });

    const siblingUrls = await getSiblingUrls(project.id, existingTarget.id);

    return {
      tunnel,
      subdomain: existingTarget.subdomain,
      publicUrl,
      expiresAt,
      siblingUrls,
      reconnected: false,
    };
  }

  const subdomain = await allocateSubdomain(project, targetName, useCoordinatedNaming);

  const dbTunnel = await prisma.tunnel.create({
    data: {
      projectId: project.id,
      name: targetName,
      subdomain,
      port: message.localPort,
      status: 'ONLINE',
      expiresAt,
      passwordHash,
    },
  });

  const publicUrl = manager.buildPublicUrl(subdomain);
  const siblingUrls = await getSiblingUrls(project.id, dbTunnel.id);

  return {
    tunnel: dbTunnel,
    subdomain,
    publicUrl,
    expiresAt,
    siblingUrls,
    reconnected: false,
  };
}

export async function createProjectWithSlug(
  userId: string,
  name: string,
  requestedSlug?: string,
): Promise<Project> {
  const base = requestedSlug ? requestedSlug.toLowerCase() : slugifyProjectName(name) || 'project';

  if (!isValidProjectSlug(base)) {
    throw new Error('Invalid project slug.');
  }

  const taken = await prisma.project.findMany({ select: { slug: true } });
  const slugSet = new Set(taken.map((p) => p.slug));
  const slug = requestedSlug ? base : dedupeSlug(base, slugSet);

  if (requestedSlug && slugSet.has(slug)) {
    throw new Error('Project slug is already taken.');
  }

  return prisma.project.create({
    data: { userId, name, slug },
  });
}
