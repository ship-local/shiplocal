import { randomUUID } from 'node:crypto';
import type { WebSocket } from 'ws';
import {
  DEFAULT_TUNNEL_EXPIRY_MS,
  generateSubdomain,
  HEARTBEAT_INTERVAL_MS,
  HEARTBEAT_TIMEOUT_MS,
  REQUEST_TIMEOUT_MS,
  type TunnelRequestMessage,
  type TunnelResponseMessage,
} from '@shiplocal/shared';
import { prisma } from '../db.js';

export interface PendingRequest {
  resolve: (response: TunnelResponseMessage) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

export interface TunnelSession {
  id: string;
  dbTunnelId: string;
  projectId: string;
  userId: string;
  subdomain: string;
  localPort: number;
  socket: WebSocket;
  publicUrl: string;
  expiresAt: Date;
  lastPongAt: number;
  passwordHash: string | null;
  pendingRequests: Map<string, PendingRequest>;
}

export interface CreateSessionInput {
  socket: WebSocket;
  localPort: number;
  dbTunnelId: string;
  projectId: string;
  userId: string;
  subdomain: string;
  publicUrl: string;
  expiresAt: Date;
  passwordHash?: string | null;
}

export interface TunnelManagerOptions {
  domain: string;
  port: number;
  expiryMs?: number;
  onExpired?: (session: TunnelSession) => void;
  onSessionRemoved?: (session: TunnelSession) => void;
}

export class TunnelManager {
  private readonly sessions = new Map<string, TunnelSession>();
  private readonly subdomainIndex = new Map<string, string>();
  private readonly dbTunnelIndex = new Map<string, string>();
  private readonly expiryMs: number;
  private readonly expiryTimer: ReturnType<typeof setInterval>;
  private readonly heartbeatTimer: ReturnType<typeof setInterval>;

  constructor(private readonly options: TunnelManagerOptions) {
    this.expiryMs = options.expiryMs ?? DEFAULT_TUNNEL_EXPIRY_MS;

    this.expiryTimer = setInterval(() => {
      void this.sweepExpired();
    }, 60_000);

    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeats();
    }, HEARTBEAT_INTERVAL_MS);
  }

  generateSubdomain(): string {
    let subdomain = generateSubdomain();
    while (this.subdomainIndex.has(subdomain)) {
      subdomain = generateSubdomain();
    }
    return subdomain;
  }

  buildPublicUrl(subdomain: string): string {
    const { domain, port } = this.options;
    const hostname = domain.split(':')[0] ?? domain;
    const isLocal = hostname === 'localhost' || hostname.endsWith('.localhost');

    if (isLocal) {
      return `http://${subdomain}.localhost:${String(port)}`;
    }

    const protocol = port === 443 ? 'https' : 'http';
    const portSuffix = port === 80 || port === 443 ? '' : `:${String(port)}`;
    return `${protocol}://${subdomain}.${domain}${portSuffix}`;
  }

  getExpiryDate(): Date {
    return new Date(Date.now() + this.expiryMs);
  }

  createSession(input: CreateSessionInput): TunnelSession {
    const session: TunnelSession = {
      id: randomUUID(),
      dbTunnelId: input.dbTunnelId,
      projectId: input.projectId,
      userId: input.userId,
      subdomain: input.subdomain,
      localPort: input.localPort,
      socket: input.socket,
      publicUrl: input.publicUrl,
      expiresAt: input.expiresAt,
      lastPongAt: Date.now(),
      passwordHash: input.passwordHash ?? null,
      pendingRequests: new Map(),
    };

    this.sessions.set(session.id, session);
    this.subdomainIndex.set(session.subdomain, session.id);
    this.dbTunnelIndex.set(session.dbTunnelId, session.id);

    return session;
  }

  getBySubdomain(subdomain: string): TunnelSession | undefined {
    const id = this.subdomainIndex.get(subdomain);
    if (!id) return undefined;
    return this.sessions.get(id);
  }

  getByDbTunnelId(dbTunnelId: string): TunnelSession | undefined {
    const id = this.dbTunnelIndex.get(dbTunnelId);
    if (!id) return undefined;
    return this.sessions.get(id);
  }

  isLive(dbTunnelId: string): boolean {
    return this.dbTunnelIndex.has(dbTunnelId);
  }

  getBySocket(socket: WebSocket): TunnelSession | undefined {
    for (const session of this.sessions.values()) {
      if (session.socket === socket) return session;
    }
    return undefined;
  }

  removeSession(
    session: TunnelSession,
    options: { updateDb?: boolean } = { updateDb: true },
  ): void {
    for (const pending of session.pendingRequests.values()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Tunnel closed'));
    }
    session.pendingRequests.clear();

    this.sessions.delete(session.id);
    this.subdomainIndex.delete(session.subdomain);
    this.dbTunnelIndex.delete(session.dbTunnelId);

    if (session.socket.readyState === session.socket.OPEN) {
      session.socket.close();
    }

    if (options.updateDb) {
      void prisma.tunnel
        .update({
          where: { id: session.dbTunnelId },
          data: { status: 'OFFLINE' },
        })
        .catch(() => undefined);
    }

    this.options.onSessionRemoved?.(session);
  }

  handlePong(session: TunnelSession): void {
    session.lastPongAt = Date.now();
  }

  handleResponse(session: TunnelSession, response: TunnelResponseMessage): void {
    const pending = session.pendingRequests.get(response.id);
    if (!pending) return;

    clearTimeout(pending.timeout);
    session.pendingRequests.delete(response.id);
    pending.resolve(response);
  }

  forwardRequest(
    session: TunnelSession,
    request: TunnelRequestMessage,
  ): Promise<TunnelResponseMessage> {
    return new Promise((resolve, reject) => {
      if (session.socket.readyState !== session.socket.OPEN) {
        reject(new Error('Tunnel is offline'));
        return;
      }

      const timeout = setTimeout(() => {
        session.pendingRequests.delete(request.id);
        reject(new Error('Request timed out'));
      }, REQUEST_TIMEOUT_MS);

      session.pendingRequests.set(request.id, { resolve, reject, timeout });

      session.socket.send(JSON.stringify(request), (err: Error | null | undefined) => {
        if (err) {
          clearTimeout(timeout);
          session.pendingRequests.delete(request.id);
          reject(err);
        }
      });
    });
  }

  destroy(): void {
    clearInterval(this.expiryTimer);
    clearInterval(this.heartbeatTimer);

    for (const session of [...this.sessions.values()]) {
      this.removeSession(session);
    }
  }

  private async sweepExpired(): Promise<void> {
    const now = Date.now();

    for (const session of [...this.sessions.values()]) {
      if (session.expiresAt.getTime() <= now) {
        this.options.onExpired?.(session);
        await prisma.tunnel
          .update({
            where: { id: session.dbTunnelId },
            data: { status: 'EXPIRED' },
          })
          .catch(() => undefined);
        this.removeSession(session, { updateDb: false });
      }
    }
  }

  private sendHeartbeats(): void {
    const now = Date.now();

    for (const session of [...this.sessions.values()]) {
      if (now - session.lastPongAt > HEARTBEAT_TIMEOUT_MS) {
        this.removeSession(session);
        continue;
      }

      if (session.socket.readyState === session.socket.OPEN) {
        session.socket.send(JSON.stringify({ type: 'ping' }));
      }
    }
  }
}

export function getTunnelManager(): TunnelManager {
  if (!globalTunnelManager) {
    throw new Error('TunnelManager not initialized');
  }
  return globalTunnelManager;
}

let globalTunnelManager: TunnelManager | null = null;

export function initTunnelManager(options: TunnelManagerOptions): TunnelManager {
  globalTunnelManager?.destroy();
  globalTunnelManager = new TunnelManager(options);
  return globalTunnelManager;
}
