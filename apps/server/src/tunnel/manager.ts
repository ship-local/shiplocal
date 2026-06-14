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

export interface PendingRequest {
  resolve: (response: TunnelResponseMessage) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

export interface TunnelSession {
  id: string;
  subdomain: string;
  localPort: number;
  socket: WebSocket;
  publicUrl: string;
  expiresAt: Date;
  lastPongAt: number;
  pendingRequests: Map<string, PendingRequest>;
}

export interface TunnelManagerOptions {
  domain: string;
  port: number;
  expiryMs?: number;
  onExpired?: (session: TunnelSession) => void;
}

export class TunnelManager {
  private readonly sessions = new Map<string, TunnelSession>();
  private readonly subdomainIndex = new Map<string, string>();
  private readonly expiryMs: number;
  private readonly expiryTimer: ReturnType<typeof setInterval>;
  private readonly heartbeatTimer: ReturnType<typeof setInterval>;

  constructor(private readonly options: TunnelManagerOptions) {
    this.expiryMs = options.expiryMs ?? DEFAULT_TUNNEL_EXPIRY_MS;

    this.expiryTimer = setInterval(() => {
      this.sweepExpired();
    }, 60_000);

    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeats();
    }, HEARTBEAT_INTERVAL_MS);
  }

  createSession(socket: WebSocket, localPort: number): TunnelSession {
    let subdomain = generateSubdomain();

    while (this.subdomainIndex.has(subdomain)) {
      subdomain = generateSubdomain();
    }

    const id = randomUUID();
    const expiresAt = new Date(Date.now() + this.expiryMs);
    const publicUrl = this.buildPublicUrl(subdomain);

    const session: TunnelSession = {
      id,
      subdomain,
      localPort,
      socket,
      publicUrl,
      expiresAt,
      lastPongAt: Date.now(),
      pendingRequests: new Map(),
    };

    this.sessions.set(id, session);
    this.subdomainIndex.set(subdomain, id);

    return session;
  }

  getBySubdomain(subdomain: string): TunnelSession | undefined {
    const id = this.subdomainIndex.get(subdomain);
    if (!id) return undefined;
    return this.sessions.get(id);
  }

  getBySocket(socket: WebSocket): TunnelSession | undefined {
    for (const session of this.sessions.values()) {
      if (session.socket === socket) return session;
    }
    return undefined;
  }

  removeSession(session: TunnelSession): void {
    for (const pending of session.pendingRequests.values()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Tunnel closed'));
    }
    session.pendingRequests.clear();

    this.sessions.delete(session.id);
    this.subdomainIndex.delete(session.subdomain);

    if (session.socket.readyState === session.socket.OPEN) {
      session.socket.close();
    }
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

  private buildPublicUrl(subdomain: string): string {
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

  private sweepExpired(): void {
    const now = Date.now();

    for (const session of [...this.sessions.values()]) {
      if (session.expiresAt.getTime() <= now) {
        this.options.onExpired?.(session);
        this.removeSession(session);
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
