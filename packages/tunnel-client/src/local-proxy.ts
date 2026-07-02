import http from 'node:http';
import type { IncomingHttpHeaders } from 'node:http';
import { promisify } from 'node:util';
import { brotliCompress, constants as zlibConstants, gzip } from 'node:zlib';
import {
  decodeBody,
  encodeBody,
  MAX_BODY_BYTES,
  type TunnelRequestMessage,
  type TunnelResponseMessage,
} from '@shiplocal/shared';

const LOOPBACK_HOSTS = ['127.0.0.1', '::1'] as const;
const gzipAsync = promisify(gzip);
const brotliCompressAsync = promisify(brotliCompress);
const MIN_COMPRESS_BYTES = 1024;

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

const COMPRESSIBLE_CONTENT_TYPES = [
  'application/javascript',
  'application/json',
  'application/manifest+json',
  'application/rss+xml',
  'application/vnd.apple.mpegurl',
  'application/wasm',
  'application/x-javascript',
  'application/xml',
  'image/svg+xml',
  'text/',
];

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

function headerValue(value: string | string[] | undefined): string | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

function getHeader(
  headers: IncomingHttpHeaders | Record<string, string | string[]>,
  name: string,
): string | undefined {
  const lowerName = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === lowerName) return headerValue(value);
  }
  return undefined;
}

function mergeVary(existing: string | undefined, value: string): string {
  if (!existing) return value;
  const parts = existing.split(',').map((part) => part.trim().toLowerCase());
  if (parts.includes(value.toLowerCase())) return existing;
  return `${existing}, ${value}`;
}

function setHeader(
  headers: Record<string, string | string[]>,
  name: string,
  value: string | string[],
): Record<string, string | string[]> {
  const next = Object.fromEntries(
    Object.entries(headers).filter(([key]) => key.toLowerCase() !== name.toLowerCase()),
  );
  next[name] = value;
  return next;
}

function stripHeader(
  headers: Record<string, string | string[]>,
  name: string,
): Record<string, string | string[]> {
  return Object.fromEntries(
    Object.entries(headers).filter(([key]) => key.toLowerCase() !== name.toLowerCase()),
  );
}

function isCompressibleContentType(contentType: string | undefined): boolean {
  if (!contentType) return false;
  const normalized = contentType.toLowerCase();
  if (normalized.includes('text/html')) return false;
  return COMPRESSIBLE_CONTENT_TYPES.some((type) => normalized.includes(type));
}

async function maybeCompressResponse(
  body: Buffer,
  responseHeaders: IncomingHttpHeaders,
  requestHeaders: Record<string, string | string[]>,
): Promise<{ body: Buffer; headers: Record<string, string | string[]> }> {
  const headers = sanitizeResponseHeaders(responseHeaders);

  if (
    body.length < MIN_COMPRESS_BYTES ||
    getHeader(responseHeaders, 'content-encoding') ||
    getHeader(responseHeaders, 'content-range') ||
    !isCompressibleContentType(getHeader(responseHeaders, 'content-type'))
  ) {
    return { body, headers };
  }

  const acceptEncoding = getHeader(requestHeaders, 'accept-encoding') ?? '';

  if (/\bbr\b/.test(acceptEncoding)) {
    const compressed = await brotliCompressAsync(body, {
      params: {
        [zlibConstants.BROTLI_PARAM_QUALITY]: 4,
      },
    });
    const vary = mergeVary(getHeader(headers, 'vary'), 'Accept-Encoding');
    const compressedHeaders = setHeader(stripHeader(headers, 'etag'), 'content-encoding', 'br');
    return {
      body: compressed,
      headers: setHeader(compressedHeaders, 'vary', vary),
    };
  }

  if (/\bgzip\b/.test(acceptEncoding)) {
    const compressed = await gzipAsync(body, { level: 6 });
    const vary = mergeVary(getHeader(headers, 'vary'), 'Accept-Encoding');
    const compressedHeaders = setHeader(stripHeader(headers, 'etag'), 'content-encoding', 'gzip');
    return {
      body: compressed,
      headers: setHeader(compressedHeaders, 'vary', vary),
    };
  }

  return { body, headers };
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
          void (async () => {
            const responseBody = Buffer.concat(chunks);
            const { body: encodedBody, headers } = await maybeCompressResponse(
              responseBody,
              res.headers,
              message.headers,
            );

            resolve({
              type: 'response',
              id: message.id,
              status: res.statusCode ?? 502,
              headers,
              body: encodedBody.length > 0 ? encodeBody(encodedBody) : undefined,
            });
          })().catch(reject);
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
