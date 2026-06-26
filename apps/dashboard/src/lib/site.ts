const defaultOrigin =
  process.env['NEXT_PUBLIC_SITE_URL'] ??
  process.env['NEXT_PUBLIC_APP_URL'] ??
  'http://localhost:3001';

export const SITE_URL = process.env['NEXT_PUBLIC_SITE_URL'] ?? defaultOrigin;
export const APP_URL = process.env['NEXT_PUBLIC_APP_URL'] ?? defaultOrigin;

export function siteHost(): string | null {
  try {
    return new URL(SITE_URL).hostname;
  } catch {
    return null;
  }
}

export function appHost(): string | null {
  try {
    return new URL(APP_URL).hostname;
  } catch {
    return null;
  }
}

/** Build an absolute URL on the app subdomain (auth + dashboard). */
export function appUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return new URL(normalized, APP_URL).toString();
}

/** Build an absolute URL on the marketing site. */
export function siteUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return new URL(normalized, SITE_URL).toString();
}
