import Link from 'next/link';
import { HealthStatus } from '@/components/health-status';

export default function HomePage() {
  return (
    <main
      style={{
        maxWidth: 720,
        margin: '0 auto',
        padding: '4rem 1.5rem',
      }}
    >
      <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
        ShipLocal
      </p>
      <h1 style={{ fontSize: '2.25rem', fontWeight: 700, marginBottom: '1rem' }}>
        Stop deploying just to show progress.
      </h1>
      <p style={{ color: 'var(--muted)', marginBottom: '2rem' }}>
        Share localhost with clients in seconds and collect visual feedback — without WhatsApp
        confusion.
      </p>

      <div
        style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '3rem',
        }}
      >
        <Link
          href="/login"
          style={{
            background: 'var(--surface)',
            color: 'var(--foreground)',
            border: '1px solid var(--border)',
            padding: '0.625rem 1.25rem',
            borderRadius: '0.5rem',
            fontWeight: 500,
          }}
        >
          Sign in
        </Link>
        <Link
          href="/dashboard"
          style={{
            background: 'var(--accent)',
            color: 'white',
            padding: '0.625rem 1.25rem',
            borderRadius: '0.5rem',
            fontWeight: 500,
          }}
        >
          Open dashboard
        </Link>
      </div>

      <HealthStatus />
    </main>
  );
}
