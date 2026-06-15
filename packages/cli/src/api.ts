import { resolveApiUrl } from './config.js';

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
  apiUrl = resolveApiUrl(),
): Promise<{ response: Response; data: unknown }> {
  let response: Response;

  try {
    response = await fetch(`${apiUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new Error(formatServerConnectionError(apiUrl, err));
  }

  const data = await response.json().catch(() => ({}));
  return { response, data };
}
