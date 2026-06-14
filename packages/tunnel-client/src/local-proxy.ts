import http from 'node:http';
import type { IncomingHttpHeaders } from 'node:http';
import {
  decodeBody,
  encodeBody,
  MAX_BODY_BYTES,
  type TunnelRequestMessage,
  type TunnelResponseMessage,
} from '@shiplocal/shared';

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
]);

function sanitizeRequestHeaders(
  headers: Record<string, string | string[]>,
): http.OutgoingHttpHeaders {
  const result: http.OutgoingHttpHeaders = {};

  for (const [key, value] of Object.entries(headers)) {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(lower) || lower === 'host') continue;
    result[key] = value;
  }

  return result;
}

function sanitizeResponseHeaders(headers: IncomingHttpHeaders): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {};

  for (const [key, value] of Object.entries(headers)) {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(lower)) continue;
    if (value === undefined) continue;
    result[key] = value;
  }

  return result;
}

export async function forwardToLocal(
  localPort: number,
  message: TunnelRequestMessage,
): Promise<TunnelResponseMessage> {
  const body = decodeBody(message.body);
  const pathWithQuery = message.query ? `${message.path}?${message.query}` : message.path;

  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: localPort,
        method: message.method,
        path: pathWithQuery,
        headers: sanitizeRequestHeaders(message.headers),
      },
      (res) => {
        const chunks: Buffer[] = [];
        let totalSize = 0;

        res.on('data', (chunk: Buffer) => {
          totalSize += chunk.length;
          if (totalSize > MAX_BODY_BYTES) {
            req.destroy();
            reject(new Error('Response body exceeds maximum size'));
            return;
          }
          chunks.push(chunk);
        });

        res.on('end', () => {
          const responseBody = Buffer.concat(chunks);
          resolve({
            type: 'response',
            id: message.id,
            status: res.statusCode ?? 502,
            headers: sanitizeResponseHeaders(res.headers),
            body: responseBody.length > 0 ? encodeBody(responseBody) : undefined,
          });
        });
      },
    );

    req.on('error', (err) => {
      reject(err);
    });

    if (body.length > 0) {
      req.write(body);
    }

    req.end();
  });
}
