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
      <section
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '0.75rem',
          padding: '1.25rem',
        }}
      >
        <p style={{ fontSize: '0.875rem', color: '#ef4444' }}>
          API unreachable at {healthCheckBaseUrl()}
        </p>
        <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.5rem' }}>
          Run <code style={{ color: 'var(--foreground)' }}>pnpm dev</code> and ensure Postgres is
          up.
        </p>
      </section>
    );
  }

  const isHealthy = health.status === 'ok' && health.database === 'connected';

  return (
    <section
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '0.75rem',
        padding: '1.25rem',
      }}
    >
      <h2 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem' }}>
        System status
      </h2>
      <ul style={{ listStyle: 'none', fontSize: '0.875rem' }}>
        <li style={{ marginBottom: '0.25rem' }}>
          API:{' '}
          <span style={{ color: isHealthy ? '#22c55e' : '#eab308' }}>
            {health.status === 'ok' ? 'ok' : 'degraded'}
          </span>
        </li>
        <li style={{ marginBottom: '0.25rem' }}>
          Database:{' '}
          <span style={{ color: health.database === 'connected' ? '#22c55e' : '#ef4444' }}>
            {health.database}
          </span>
        </li>
        <li style={{ color: 'var(--muted)', fontSize: '0.75rem', marginTop: '0.5rem' }}>
          Checked {new Date(health.timestamp).toLocaleString()}
        </li>
      </ul>
    </section>
  );
}
