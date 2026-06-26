export interface CorsContext {
  origin: string | null;
  isSiblingOrigin: boolean;
}

function headerValue(value: string | string[] | undefined): string | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

export function buildPreflightHeaders(
  origin: string,
  requestHeaders: Record<string, string | string[]>,
): Record<string, string> {
  const requestMethod =
    headerValue(requestHeaders['access-control-request-method']) ??
    'GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS';
  const requestHeadersList =
    headerValue(requestHeaders['access-control-request-headers']) ??
    'Content-Type, Authorization, X-Requested-With';

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': requestMethod,
    'Access-Control-Allow-Headers': requestHeadersList,
    'Access-Control-Max-Age': '86400',
  };
}

export function applyCorsHeaders(
  headers: Record<string, string | string[]>,
  cors: CorsContext,
  hasCookies: boolean,
): Record<string, string | string[]> {
  if (!cors.isSiblingOrigin || !cors.origin) {
    return headers;
  }

  return {
    ...headers,
    'Access-Control-Allow-Origin': cors.origin,
    'Access-Control-Allow-Credentials': hasCookies ? 'true' : 'true',
    Vary: mergeVary(headerValue(headers['vary']), 'Origin'),
  };
}

function mergeVary(existing: string | undefined, value: string): string {
  if (!existing) return value;
  const parts = existing.split(',').map((part) => part.trim().toLowerCase());
  if (parts.includes(value.toLowerCase())) return existing;
  return `${existing}, ${value}`;
}

export function rewriteSetCookieHeaders(
  headers: Record<string, string | string[]>,
  previewHost: string,
  isSecure: boolean,
): Record<string, string | string[]> {
  const setCookie = headers['set-cookie'] ?? headers['Set-Cookie'];
  if (!setCookie) return headers;

  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
  const rewritten = cookies.map((cookie) => rewriteSingleCookie(cookie, previewHost, isSecure));

  return {
    ...headers,
    'set-cookie': rewritten,
  };
}

function rewriteSingleCookie(cookie: string, previewHost: string, isSecure: boolean): string {
  let updated = cookie;

  updated = updated.replace(/;\s*Domain=localhost/gi, `; Domain=${previewHost}`);
  updated = updated.replace(/;\s*Domain=127\.0\.0\.1/gi, `; Domain=${previewHost}`);

  if (isSecure && !/;\s*Secure/gi.test(updated)) {
    updated = `${updated}; Secure`;
  }

  return updated;
}

export function requestHasCredentials(requestHeaders: Record<string, string | string[]>): boolean {
  const cookie = headerValue(requestHeaders['cookie']);
  return Boolean(cookie);
}
