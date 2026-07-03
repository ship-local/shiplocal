import { resolveApiUrlAsync } from './config.js';

function isConnectionRefused(err: unknown): boolean {
  if (!(err instanceof Error)) return false;

  const cause = err.cause;
  if (cause instanceof Error && 'code' in cause && cause.code === 'ECONNREFUSED') {
    return true;
  }

  if ('code' in err && err.code === 'ECONNREFUSED') {
    return true;
  }

  return err.message.includes('ECONNREFUSED') || err.message.includes('fetch failed');
}

export function formatServerConnectionError(apiUrl: string, err: unknown): string {
  if (isConnectionRefused(err)) {
    return [
      `Cannot reach ShipLocal server at ${apiUrl}.`,
      '',
      'Start the API server first:',
      '  pnpm dev',
      '',
      'Or run only the server:',
      '  pnpm --filter @shiplocal/server dev',
    ].join('\n');
  }

  return err instanceof Error ? err.message : 'Request failed';
}

export async function postJson(
  path: string,
  body: unknown,
  apiUrl?: string,
): Promise<{ response: Response; data: unknown }> {
  const baseUrl = apiUrl ?? (await resolveApiUrlAsync());
  let response: Response;

  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new Error(formatServerConnectionError(baseUrl, err));
  }

  const data = await response.json().catch(() => ({}));
  return { response, data };
}

export interface TimedResponse {
  response: Response;
  ms: number;
}

export async function timedFetch(
  url: string,
  init?: RequestInit & { timeoutMs?: number },
): Promise<TimedResponse> {
  const timeoutMs = init?.timeoutMs ?? 30_000;
  const fetchInit = { ...init };
  delete (fetchInit as RequestInit & { timeoutMs?: number }).timeoutMs;
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  const started = performance.now();

  try {
    const response = await fetch(url, {
      ...fetchInit,
      signal: controller.signal,
    });
    return { response, ms: performance.now() - started };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Request timed out after ${String(timeoutMs)} ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function getJson(
  path: string,
  options?: { apiUrl?: string; token?: string },
): Promise<{ response: Response; data: unknown; ms: number }> {
  const baseUrl = options?.apiUrl ?? (await resolveApiUrlAsync());
  const headers = new Headers(options?.token ? { Authorization: `Bearer ${options.token}` } : {});

  try {
    const { response, ms } = await timedFetch(`${baseUrl}${path}`, { headers });
    const data = await response.json().catch(() => ({}));
    return { response, data, ms };
  } catch (err) {
    throw new Error(formatServerConnectionError(baseUrl, err));
  }
}
