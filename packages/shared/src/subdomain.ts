const ADJECTIVES = [
  'bright',
  'calm',
  'clever',
  'eager',
  'gentle',
  'happy',
  'jolly',
  'keen',
  'lucky',
  'merry',
  'noble',
  'quick',
  'rapid',
  'sharp',
  'swift',
  'witty',
] as const;

const NOUNS = [
  'badger',
  'bear',
  'crane',
  'eagle',
  'falcon',
  'fox',
  'hawk',
  'lion',
  'lynx',
  'otter',
  'owl',
  'panda',
  'raven',
  'tiger',
  'wolf',
  'zebra',
] as const;

function secureRandomInt(max: number): number {
  const array = new Uint32Array(1);
  globalThis.crypto.getRandomValues(array);
  const value = array[0];
  if (value === undefined) {
    throw new Error('secureRandomInt failed');
  }
  return value % max;
}

function randomItem<T>(items: readonly T[]): T {
  const index = secureRandomInt(items.length);
  const item = items[index];
  if (item === undefined) {
    throw new Error('randomItem called with empty array');
  }
  return item;
}

export function generateSubdomain(): string {
  return `${randomItem(ADJECTIVES)}-${randomItem(NOUNS)}`;
}

export function buildPublicUrl(
  subdomain: string,
  domain: string,
  port: number,
  apiPublicUrl?: string,
): string {
  const hostname = domain.split(':')[0] ?? domain;
  const isLocal = hostname === 'localhost' || hostname.endsWith('.localhost');

  if (isLocal) {
    return `http://${subdomain}.localhost:${String(port)}`;
  }

  if (apiPublicUrl) {
    try {
      const base = new URL(apiPublicUrl);
      return `${base.protocol}//${subdomain}.${hostname}`;
    } catch {
      // fall through to default
    }
  }

  return `https://${subdomain}.${domain}`;
}

export function parseTunnelHost(hostHeader: string | undefined, domain: string): string | null {
  if (!hostHeader) return null;

  const host = hostHeader.split(':')[0]?.toLowerCase();
  const base = domain.split(':')[0]?.toLowerCase();

  if (!host || !base) return null;

  if (base === 'localhost') {
    if (host.endsWith('.localhost')) {
      const subdomain = host.slice(0, -'.localhost'.length);
      return subdomain.length > 0 && !subdomain.includes('.') ? subdomain : null;
    }
    return null;
  }

  if (host.endsWith(`.${base}`)) {
    const subdomain = host.slice(0, -(base.length + 1));
    return subdomain.length > 0 && !subdomain.includes('.') ? subdomain : null;
  }

  return null;
}

export function parseTunnelPath(path: string): { subdomain: string; path: string } | null {
  if (!path.startsWith('/t/')) return null;

  const rest = path.slice(3);
  const slashIndex = rest.indexOf('/');

  if (slashIndex === -1) {
    const subdomain = rest;
    return subdomain.length > 0 ? { subdomain, path: '/' } : null;
  }

  const subdomain = rest.slice(0, slashIndex);
  const remainingPath = rest.slice(slashIndex);

  return subdomain.length > 0 ? { subdomain, path: remainingPath || '/' } : null;
}
