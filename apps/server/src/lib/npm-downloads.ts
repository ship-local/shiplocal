const NPM_PACKAGE = 'shiplocal';
const CACHE_TTL_MS = 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 4_000;

export interface NpmDownloadStats {
  package: string;
  lastWeek: number | null;
  lastMonth: number | null;
  fetchedAt: string | null;
}

interface CacheEntry {
  stats: NpmDownloadStats;
  expiresAt: number;
}

let cache: CacheEntry | null = null;

async function fetchPoint(period: 'last-week' | 'last-month'): Promise<number | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(`https://api.npmjs.org/downloads/point/${period}/${NPM_PACKAGE}`, {
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { downloads?: number };
    return typeof data.downloads === 'number' ? data.downloads : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function getNpmDownloadStats(): Promise<NpmDownloadStats> {
  if (cache && cache.expiresAt > Date.now()) {
    return cache.stats;
  }

  const [lastWeek, lastMonth] = await Promise.all([
    fetchPoint('last-week'),
    fetchPoint('last-month'),
  ]);

  const stats: NpmDownloadStats = {
    package: NPM_PACKAGE,
    lastWeek,
    lastMonth,
    fetchedAt: lastWeek !== null || lastMonth !== null ? new Date().toISOString() : null,
  };

  // Cache successes and soft-failures so a flaky npm API cannot slow every poll.
  cache = {
    stats,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };

  return stats;
}
