import Link from 'next/link';
import { HealthStatus } from '@/components/health-status';
import { SiteHeader } from '@/components/site-header';

const steps = [
  {
    title: '1. Start your app locally',
    body: 'Run your client project on localhost — Next.js, Vite, Rails, anything.',
  },
  {
    title: '2. Open a tunnel',
    body: 'Run shiplocal 3000 and share the public URL with your client.',
  },
  {
    title: '3. Collect feedback',
    body: 'Clients click 💬 on the preview, pin comments to elements, and you see screenshots on your dashboard.',
  },
];

export default function HomePage() {
  return (
    <>
      <SiteHeader active="home" />
      <main style={{ maxWidth: 960, margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
          ShipLocal
        </p>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 700, marginBottom: '1rem' }}>
          From localhost to client-ready.
        </h1>
        <p
          style={{
            color: 'var(--muted)',
            fontSize: '1.125rem',
            marginBottom: '2rem',
            maxWidth: 640,
          }}
        >
          Share a live preview link in seconds. Clients leave visual feedback on the actual page —
          no deploys, no screenshot ping-pong.
        </p>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '3.5rem', flexWrap: 'wrap' }}>
          <Link href="/register" style={primaryButtonStyle}>
            Get started free
          </Link>
          <Link href="/login" style={secondaryButtonStyle}>
            Sign in
          </Link>
          <a
            href="https://github.com/ship-local/shiplocal"
            target="_blank"
            rel="noreferrer"
            style={secondaryButtonStyle}
          >
            View on GitHub
          </a>
        </div>

        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>How it works</h2>
          <div
            style={{
              display: 'grid',
              gap: '1rem',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            }}
          >
            {steps.map((step) => (
              <article key={step.title} style={stepCardStyle}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  {step.title}
                </h3>
                <p style={{ color: 'var(--muted)', fontSize: '0.875rem', margin: 0 }}>
                  {step.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section style={{ ...sectionStyle, marginTop: '2rem' }}>
          <h2 style={sectionTitleStyle}>Quick install</h2>
          <pre style={codeBlockStyle}>
            {`npm install -g shiplocal
shiplocal login
shiplocal 3000`}
          </pre>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginTop: '0.75rem' }}>
            Self-hosting? See <code>docs/self-hosting.md</code> in the repo.
          </p>
        </section>

        <section style={{ marginTop: '2rem' }}>
          <HealthStatus />
        </section>
      </main>
    </>
  );
}

const primaryButtonStyle: React.CSSProperties = {
  background: 'var(--accent)',
  color: 'white',
  padding: '0.75rem 1.5rem',
  borderRadius: '0.5rem',
  fontWeight: 600,
  textDecoration: 'none',
};

const secondaryButtonStyle: React.CSSProperties = {
  background: 'var(--surface)',
  color: 'var(--foreground)',
  border: '1px solid var(--border)',
  padding: '0.75rem 1.5rem',
  borderRadius: '0.5rem',
  fontWeight: 500,
  textDecoration: 'none',
};

const sectionStyle: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '0.75rem',
  padding: '1.5rem',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '1.125rem',
  fontWeight: 600,
  marginBottom: '1rem',
};

const stepCardStyle: React.CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: '0.5rem',
  padding: '1rem',
  background: 'var(--background)',
};

const codeBlockStyle: React.CSSProperties = {
  background: 'var(--background)',
  border: '1px solid var(--border)',
  borderRadius: '0.5rem',
  padding: '1rem',
  overflowX: 'auto',
  fontSize: '0.875rem',
  margin: 0,
};
