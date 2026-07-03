import { WebSocket } from 'ws';
import {
  decodeBody,
  encodeBody,
  getMessageBody,
  sendTunnelWsMessage,
  TunnelMessageAssembler,
  type TunnelMessageWithBody,
  TUNNEL_WS_PATH,
  type RegisteredMessage,
  type TunnelWebSocketCloseMessage,
  type TunnelWebSocketOpenMessage,
} from '@shiplocal/shared';
import { forwardToLocal } from './local-proxy.js';

export interface TunnelClientOptions {
  serverUrl: string;
  localPort: number;
  token?: string;
  password?: string;
  projectSlug?: string;
  projectId?: string;
  targetName?: string;
  tunnelId?: string;
  onRegistered?: (info: RegisteredMessage) => void;
  onDisconnect?: () => void;
  onTerminated?: (message: string) => void;
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
      `Nothing is listening on port ${String(localPort)} (tried 127.0.0.1 and ::1).`,
      '',
      'Start your local server on that port, then refresh this page.',
      'If your browser works on localhost but the tunnel does not, your dev server may only',
      'listen on IPv6 — bind to 0.0.0.0 or 127.0.0.1 (e.g. next dev -H 0.0.0.0).',
      `If your app uses a different port, restart the CLI with that port (e.g. shiplocal ${String(localPort)}).`,
    ].join('\n');
  }

  return err instanceof Error ? err.message : 'Bad gateway';
}

function rawDataToBuffer(raw: WebSocket.RawData): Buffer {
  if (typeof raw === 'string') return Buffer.from(raw, 'utf8');
  if (Buffer.isBuffer(raw)) return raw;
  if (Array.isArray(raw)) return Buffer.concat(raw);
  return Buffer.from(raw);
}

function sanitizeWebSocketHeaders(
  headers: Record<string, string | string[]>,
  localPort: number,
): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {};
  const skip = new Set([
    'connection',
    'host',
    'keep-alive',
    'proxy-authenticate',
    'proxy-authorization',
    'sec-websocket-accept',
    'sec-websocket-extensions',
    'sec-websocket-key',
    'sec-websocket-version',
    'te',
    'trailers',
    'transfer-encoding',
    'upgrade',
  ]);

  for (const [key, value] of Object.entries(headers)) {
    const lower = key.toLowerCase();
    if (skip.has(lower)) continue;
    result[key] = lower === 'origin' ? `http://localhost:${String(localPort)}` : value;
  }

  result['host'] = `localhost:${String(localPort)}`;
  return result;
}

function toLocalWebSocketUrl(localPort: number, message: TunnelWebSocketOpenMessage): string {
  const url = new URL(`ws://localhost:${String(localPort)}`);
  url.pathname = message.path;
  url.search = message.query ? `?${message.query}` : '';
  return url.toString();
}

function validCloseCode(code: number | undefined): number | undefined {
  if (code === undefined) return undefined;
  return (code >= 1000 && code <= 1014 && code !== 1004 && code !== 1005 && code !== 1006) ||
    (code >= 3000 && code <= 4999)
    ? code
    : undefined;
}

export function createTunnelClient(options: TunnelClientOptions): TunnelClient {
  let ws: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let reconnectAttempt = 0;
  let intentionalClose = false;
  let publicUrl: string | null = null;
  let registeredTunnelId: string | null = options.tunnelId ?? null;
  let connectPromise: Promise<void> | null = null;
  let connectResolve: (() => void) | null = null;
  let connectReject: ((error: Error) => void) | null = null;
  let hasRegistered = false;
  const localWebSockets = new Map<string, WebSocket>();
  const pendingLocalWebSocketMessages = new Map<string, Buffer[]>();
  const messageAssembler = new TunnelMessageAssembler();

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

  const sendControlMessage = (message: Parameters<typeof sendTunnelWsMessage>[1], body?: Buffer) => {
    if (ws?.readyState === WebSocket.OPEN) {
      sendTunnelWsMessage(ws, message, body);
    }
  };

  const closeLocalWebSockets = () => {
    for (const socket of localWebSockets.values()) {
      socket.removeAllListeners();
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close();
      }
    }
    localWebSockets.clear();
  };

  const closeLocalWebSocket = (message: TunnelWebSocketCloseMessage) => {
    const socket = localWebSockets.get(message.id);
    if (!socket) return;

    localWebSockets.delete(message.id);
    pendingLocalWebSocketMessages.delete(message.id);
    if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
      socket.close(validCloseCode(message.code), message.reason);
    }
  };

  const openLocalWebSocket = (message: TunnelWebSocketOpenMessage) => {
    const localSocket = new WebSocket(toLocalWebSocketUrl(options.localPort, message), {
      headers: sanitizeWebSocketHeaders(message.headers, options.localPort),
      maxPayload: 64 * 1024 * 1024,
    });

    localWebSockets.set(message.id, localSocket);
    pendingLocalWebSocketMessages.set(message.id, []);

    localSocket.on('open', () => {
      const pendingMessages = pendingLocalWebSocketMessages.get(message.id) ?? [];
      pendingLocalWebSocketMessages.delete(message.id);
      for (const pendingMessage of pendingMessages) {
        localSocket.send(pendingMessage);
      }
    });

    localSocket.on('message', (data) => {
      sendControlMessage(
        {
          type: 'ws-message',
          id: message.id,
        },
        rawDataToBuffer(data),
      );
    });

    localSocket.on('close', (code, reason) => {
      localWebSockets.delete(message.id);
      pendingLocalWebSocketMessages.delete(message.id);
      sendControlMessage({
        type: 'ws-close',
        id: message.id,
        code,
        reason: reason.toString('utf8'),
      });
    });

    localSocket.on('error', () => {
      localWebSockets.delete(message.id);
      pendingLocalWebSocketMessages.delete(message.id);
      sendControlMessage({
        type: 'ws-close',
        id: message.id,
        code: 1011,
        reason: 'Local WebSocket connection failed',
      });
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

  const handleMessage = async (message: TunnelMessageWithBody) => {
    if (message.type === 'registered') {
      publicUrl = message.publicUrl;
      registeredTunnelId = message.tunnelId;
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

    if (message.type === 'terminated') {
      intentionalClose = true;
      publicUrl = null;
      options.onTerminated?.(message.message);
      ws?.close();
      return;
    }

    if (message.type === 'ping') {
      ws?.send(JSON.stringify({ type: 'pong' }));
      return;
    }

    if (message.type === 'request') {
      try {
        const requestBody = getMessageBody(message);
        const response = await forwardToLocal(options.localPort, {
          ...message,
          body: requestBody.length > 0 ? encodeBody(requestBody) : undefined,
          bodyEncoding: undefined,
        });
        sendControlMessage(response, decodeBody(response.body));
      } catch (err) {
        const messageText = formatLocalProxyError(err, options.localPort);
        sendControlMessage(
          {
            type: 'response',
            id: message.id,
            status: 502,
            headers: { 'content-type': 'text/plain; charset=utf-8' },
          },
          Buffer.from(messageText),
        );
      }
      return;
    }

    if (message.type === 'ws-open') {
      openLocalWebSocket(message);
      return;
    }

    if (message.type === 'ws-message') {
      const localSocket = localWebSockets.get(message.id);
      const body = getMessageBody(message);
      if (localSocket?.readyState === WebSocket.OPEN) {
        localSocket.send(body);
      } else if (localSocket?.readyState === WebSocket.CONNECTING) {
        pendingLocalWebSocketMessages.get(message.id)?.push(body);
      }
      return;
    }

    if (message.type === 'ws-close') {
      closeLocalWebSocket(message);
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
          ...(options.projectSlug ? { projectSlug: options.projectSlug } : {}),
          ...(options.projectId ? { projectId: options.projectId } : {}),
          ...(options.targetName ? { targetName: options.targetName } : {}),
          ...(registeredTunnelId ? { tunnelId: registeredTunnelId } : {}),
        }),
      );
    });

    socket.on('message', (data, isBinary) => {
      let message: TunnelMessageWithBody | null;
      try {
        message = messageAssembler.feed(data, isBinary);
      } catch {
        return;
      }
      if (!message) return;
      void handleMessage(message);
    });

    socket.on('close', () => {
      publicUrl = null;
      closeLocalWebSockets();
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
      closeLocalWebSockets();
      messageAssembler.reset();

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
