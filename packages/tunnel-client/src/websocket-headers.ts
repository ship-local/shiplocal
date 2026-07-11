/**
 * WebSocket upgrade helpers for relaying browser sockets to localhost.
 *
 * Vite requires Sec-WebSocket-Protocol: vite-hmr (or vite-ping). The `ws`
 * client only treats a subprotocol as "requested" when passed via the
 * constructor `protocols` argument — putting it in `headers` alone makes
 * `ws` reject the handshake with:
 *   "Server sent a subprotocol but none was requested"
 * which drops HMR and triggers Vite's infinite reload loop.
 */

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'host',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'sec-websocket-accept',
  'sec-websocket-extensions',
  'sec-websocket-key',
  'sec-websocket-protocol',
  'sec-websocket-version',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
]);

export function extractWebSocketProtocols(
  headers: Record<string, string | string[]>,
): string[] | undefined {
  const raw = headers['sec-websocket-protocol'] ?? headers['Sec-WebSocket-Protocol'];
  if (raw === undefined) return undefined;

  const value = Array.isArray(raw) ? raw.join(',') : raw;
  const protocols = value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  return protocols.length > 0 ? protocols : undefined;
}

export function sanitizeWebSocketHeaders(
  headers: Record<string, string | string[]>,
  localPort: number,
): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {};

  for (const [key, value] of Object.entries(headers)) {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(lower)) continue;
    result[key] = lower === 'origin' ? `http://localhost:${String(localPort)}` : value;
  }

  result['host'] = `localhost:${String(localPort)}`;
  return result;
}
