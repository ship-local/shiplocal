const PUBLIC_API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

/** Server-side health checks hit the API directly — not through Caddy/public URL. */
function healthCheckBaseUrl(): string {
  return (
    process.env['SERVER_INTERNAL_URL'] ??
    (process.env['NODE_ENV'] === 'production' ? 'http://127.0.0.1:4000' : PUBLIC_API_URL)
  );
}

interface HealthData {
  status: string;
  database: string;
  timestamp: string;
}

async function fetchHealth(): Promise<HealthData | null> {
  try {
    const res = await fetch(`${healthCheckBaseUrl()}/health`, {
      next: { revalidate: 10 },
    });

    if (!res.ok) return null;
    return (await res.json()) as HealthData;
  } catch {
    return null;
  }
}

export async function HealthStatus() {
  const health = await fetchHealth();

  if (!health) {
    return (
      <div className="status-row">
        <span className="status-bad">API unreachable</span>
        <span style={{ color: 'var(--muted)' }}>
          Expected at {healthCheckBaseUrl()}. Run <code>pnpm dev</code> with Postgres up.
        </span>
      </div>
    );
  }

  const isHealthy = health.status === 'ok' && health.database === 'connected';

  return (
    <div className="status-row" aria-label="System status">
      <span>
        API:{' '}
        <span className={isHealthy ? 'status-ok' : 'status-warn'}>
          {health.status === 'ok' ? 'ok' : 'degraded'}
        </span>
      </span>
      <span>
        Database:{' '}
        <span className={health.database === 'connected' ? 'status-ok' : 'status-bad'}>
          {health.database}
        </span>
      </span>
      <span style={{ color: 'var(--muted)' }}>
        Checked {new Date(health.timestamp).toLocaleString()}
      </span>
    </div>
  );
}
