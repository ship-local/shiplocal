import { WebSocket } from 'ws';
import {
  parseTunnelMessage,
  TUNNEL_WS_PATH,
  type RegisteredMessage,
  type TunnelMessage,
} from '@shiplocal/shared';
import { forwardToLocal } from './local-proxy.js';

export interface TunnelClientOptions {
  serverUrl: string;
  localPort: number;
  token?: string;
  password?: string;
  onRegistered?: (info: RegisteredMessage) => void;
  onDisconnect?: () => void;
  onReconnecting?: (attempt: number) => void;
}

export interface TunnelClient {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  getPublicUrl(): string | null;
}

function toWebSocketUrl(serverUrl: string): string {
  const url = new URL(serverUrl);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = TUNNEL_WS_PATH;
  url.search = '';
  url.hash = '';
  return url.toString();
}

function formatLocalProxyError(err: unknown, localPort: number): string {
  if (err instanceof Error && 'code' in err && err.code === 'ECONNREFUSED') {
    return [
      `Nothing is running on http://127.0.0.1:${String(localPort)}.`,
      '',
      'Start your local server on that port, then refresh this page.',
      `If your app uses a different port, restart the CLI with that port (e.g. shiplocal ${String(localPort)}).`,
    ].join('\n');
  }

  return err instanceof Error ? err.message : 'Bad gateway';
}

function rawDataToString(raw: WebSocket.RawData): string {
  if (typeof raw === 'string') return raw;
  if (Buffer.isBuffer(raw)) return raw.toString('utf8');
  if (Array.isArray(raw)) return Buffer.concat(raw).toString('utf8');
  return Buffer.from(raw).toString('utf8');
}

export function createTunnelClient(options: TunnelClientOptions): TunnelClient {
  let ws: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let reconnectAttempt = 0;
  let intentionalClose = false;
  let publicUrl: string | null = null;
  let connectPromise: Promise<void> | null = null;
  let connectResolve: (() => void) | null = null;
  let connectReject: ((error: Error) => void) | null = null;
  let hasRegistered = false;

  const clearReconnect = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  const resetConnectPromise = () => {
    connectPromise = new Promise<void>((resolve, reject) => {
      connectResolve = resolve;
      connectReject = reject;
    });
  };

  const scheduleReconnect = () => {
    if (intentionalClose) return;

    clearReconnect();
    reconnectAttempt += 1;
    options.onReconnecting?.(reconnectAttempt);

    const delay = Math.min(1000 * 2 ** (reconnectAttempt - 1), 30_000);
    reconnectTimer = setTimeout(() => {
      resetConnectPromise();
      void openConnection();
    }, delay);
  };

  const handleMessage = async (raw: WebSocket.RawData) => {
    let message: TunnelMessage;

    try {
      message = parseTunnelMessage(rawDataToString(raw));
    } catch {
      return;
    }

    if (message.type === 'registered') {
      publicUrl = message.publicUrl;
      reconnectAttempt = 0;
      options.onRegistered?.(message);

      if (!hasRegistered) {
        hasRegistered = true;
        connectResolve?.();
        connectResolve = null;
        connectReject = null;
      }
      return;
    }

    if (message.type === 'error') {
      const authError = new Error(message.message);
      if (!hasRegistered && connectReject) {
        connectReject(authError);
        connectReject = null;
        connectResolve = null;
        intentionalClose = true;
        ws?.close();
      }
      return;
    }

    if (message.type === 'ping') {
      ws?.send(JSON.stringify({ type: 'pong' }));
      return;
    }

    if (message.type === 'request') {
      try {
        const response = await forwardToLocal(options.localPort, message);
        ws?.send(JSON.stringify(response));
      } catch (err) {
        const messageText = formatLocalProxyError(err, options.localPort);
        const errorResponse = {
          type: 'response' as const,
          id: message.id,
          status: 502,
          headers: { 'content-type': 'text/plain; charset=utf-8' },
          body: Buffer.from(messageText).toString('base64'),
        };
        ws?.send(JSON.stringify(errorResponse));
      }
    }
  };

  const openConnection = (): Promise<void> => {
    if (!connectPromise) {
      resetConnectPromise();
    }

    if (ws) {
      ws.removeAllListeners();
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    }

    const socket = new WebSocket(toWebSocketUrl(options.serverUrl), {
      maxPayload: 64 * 1024 * 1024,
    });
    ws = socket;

    socket.on('open', () => {
      socket.send(
        JSON.stringify({
          type: 'register',
          localPort: options.localPort,
          token: options.token,
          ...(options.password ? { password: options.password } : {}),
        }),
      );
    });

    socket.on('message', (data) => {
      void handleMessage(data);
    });

    socket.on('close', () => {
      publicUrl = null;
      options.onDisconnect?.();

      if (!intentionalClose && !hasRegistered && connectReject) {
        connectReject(new Error('Connection closed before registration'));
        connectReject = null;
        connectResolve = null;
      }

      if (!intentionalClose && hasRegistered) {
        scheduleReconnect();
      }
    });

    socket.on('error', (err) => {
      if (!hasRegistered && connectReject) {
        connectReject(err);
        connectReject = null;
        connectResolve = null;
      }
    });

    return connectPromise ?? Promise.resolve();
  };

  resetConnectPromise();

  return {
    connect() {
      intentionalClose = false;
      reconnectAttempt = 0;
      return openConnection();
    },
    disconnect() {
      intentionalClose = true;
      clearReconnect();

      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        ws.close();
      }

      ws = null;
      publicUrl = null;
      return Promise.resolve();
    },
    isConnected() {
      return ws?.readyState === WebSocket.OPEN && publicUrl !== null;
    },
    getPublicUrl() {
      return publicUrl;
    },
  };
}
