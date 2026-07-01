import http from 'node:http';
import type { IncomingHttpHeaders } from 'node:http';
import {
  decodeBody,
  encodeBody,
  MAX_BODY_BYTES,
  type TunnelRequestMessage,
  type TunnelResponseMessage,
} from '@shiplocal/shared';

const LOOPBACK_HOSTS = ['127.0.0.1', '::1'] as const;

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

const STRIP_RESPONSE_HEADERS = new Set([...HOP_BY_HOP_HEADERS, 'content-length']);

function isConnectionRefused(err: unknown): boolean {
  return err instanceof Error && 'code' in err && err.code === 'ECONNREFUSED';
}

function sanitizeRequestHeaders(
  headers: Record<string, string | string[]>,
  localPort: number,
): http.OutgoingHttpHeaders {
  const result: http.OutgoingHttpHeaders = {};

  for (const [key, value] of Object.entries(headers)) {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(lower) || lower === 'host') {
      continue;
    }
    result[key] = value;
  }

  result['host'] = `localhost:${String(localPort)}`;

  return result;
}

function sanitizeResponseHeaders(headers: IncomingHttpHeaders): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {};

  for (const [key, value] of Object.entries(headers)) {
    const lower = key.toLowerCase();
    if (STRIP_RESPONSE_HEADERS.has(lower)) continue;
    if (value === undefined) continue;
    result[key] = value;
  }

  return result;
}

function forwardToHost(
  hostname: string,
  localPort: number,
  message: TunnelRequestMessage,
  body: Buffer,
  pathWithQuery: string,
): Promise<TunnelResponseMessage> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname,
        port: localPort,
        method: message.method,
        path: pathWithQuery,
        headers: sanitizeRequestHeaders(message.headers, localPort),
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

export async function forwardToLocal(
  localPort: number,
  message: TunnelRequestMessage,
): Promise<TunnelResponseMessage> {
  const body = decodeBody(message.body);
  const pathWithQuery = message.query ? `${message.path}?${message.query}` : message.path;

  let lastError: unknown;

  for (const hostname of LOOPBACK_HOSTS) {
    try {
      return await forwardToHost(hostname, localPort, message, body, pathWithQuery);
    } catch (err) {
      if (isConnectionRefused(err)) {
        lastError = err;
        continue;
      }
      throw err;
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }
  throw new Error('Local server unreachable');
}
