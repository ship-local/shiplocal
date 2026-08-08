import type { FastifyRequest } from 'fastify';
import { MAX_BODY_BYTES } from '@shiplocal/shared';

const BODY_COLLECT_TIMEOUT_MS = 30_000;

/** Rebuild a Buffer from a body Fastify already parsed (JSON/text/buffer). */
export function bodyFromParsedRequest(body: unknown): Buffer | null {
  if (body === undefined || body === null) return null;
  if (Buffer.isBuffer(body)) return body;
  if (typeof body === 'string') return Buffer.from(body, 'utf8');
  if (typeof body === 'number' || typeof body === 'boolean') {
    return Buffer.from(JSON.stringify(body), 'utf8');
  }
  if (typeof body === 'object') {
    return Buffer.from(JSON.stringify(body), 'utf8');
  }
  return null;
}

function collectRawBody(request: FastifyRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;

    const onData = (chunk: Buffer) => {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        cleanup();
        reject(new Error('Request body too large'));
        request.raw.destroy();
        return;
      }
      chunks.push(chunk);
    };

    const onEnd = () => {
      cleanup();
      resolve(Buffer.concat(chunks));
    };

    const onError = (err: Error) => {
      cleanup();
      reject(err);
    };

    const onTimeout = () => {
      cleanup();
      reject(new Error('Request body timed out'));
      request.raw.destroy();
    };

    const timer = setTimeout(onTimeout, BODY_COLLECT_TIMEOUT_MS);

    const cleanup = () => {
      clearTimeout(timer);
      request.raw.off('data', onData);
      request.raw.off('end', onEnd);
      request.raw.off('error', onError);
    };

    request.raw.on('data', onData);
    request.raw.on('end', onEnd);
    request.raw.on('error', onError);

    // Fastify may have already drained the stream (e.g. JSON parser). Waiting for
    // another `end` hangs forever — resolve immediately with whatever we have.
    if (request.raw.readableEnded || request.raw.complete) {
      cleanup();
      resolve(Buffer.concat(chunks));
    }
  });
}

/**
 * Resolve the inbound request body for tunnel proxying.
 * Prefer Fastify's already-parsed body; never wait on a consumed stream.
 */
export async function resolveTunnelRequestBody(request: FastifyRequest): Promise<Buffer> {
  if (request.method === 'GET' || request.method === 'HEAD') {
    return Buffer.alloc(0);
  }

  const fromParsed = bodyFromParsedRequest(request.body);
  if (fromParsed) {
    if (fromParsed.length > MAX_BODY_BYTES) {
      throw new Error('Request body too large');
    }
    return fromParsed;
  }

  if (request.raw.readableEnded || request.raw.complete) {
    return Buffer.alloc(0);
  }

  return collectRawBody(request);
}

/** Keep Content-Length aligned with the body we actually forward. */
export function withBodyContentLength(
  headers: Record<string, string | string[]>,
  body: Buffer,
): Record<string, string | string[]> {
  const next: Record<string, string | string[]> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === 'content-length') continue;
    next[key] = value;
  }
  if (body.length > 0) {
    next['content-length'] = String(body.length);
  }
  return next;
}
