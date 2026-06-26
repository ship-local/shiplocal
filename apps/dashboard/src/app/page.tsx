import type { Metadata } from 'next';
import { HealthStatus } from '@/components/health-status';
import { HomeStructuredData } from '@/components/home-structured-data';
import { SiteHeader } from '@/components/site-header';
import { appUrl, SITE_URL } from '@/lib/site';

const META_DESCRIPTION =
  'ShipLocal is an open-source localhost tunneling platform that lets developers securely share local applications over HTTPS in seconds. Create public preview URLs, self-host the tunnel server, and collaborate with clients before deployment.';

export const metadata: Metadata = {
  title: 'ShipLocal — Open-source localhost tunneling',
  description: META_DESCRIPTION,
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: 'ShipLocal — Open-source localhost tunneling',
    description: META_DESCRIPTION,
    url: SITE_URL,
    siteName: 'ShipLocal',
    type: 'website',
    images: [{ url: '/og-image.png' }],
  },
};

const steps = [
  {
    title: '1. Start your app locally',
    body: 'Run your client project on localhost — Next.js, Vite, Rails, anything.',
  },
  {
    title: '2. Open a tunnel',
    body: 'Run shiplocal 3000 and get a public HTTPS preview URL in seconds.',
  },
  {
    title: '3. Share and collaborate',
    body: 'Send the link to clients or teammates. On ShipLocal Cloud, they can leave visual feedback pinned to elements on the live page.',
  },
];

export default function HomePage() {
  return (
    <>
      <HomeStructuredData />
      <SiteHeader active="home" />
      <main style={{ maxWidth: 960, margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
          ShipLocal Core · Open source
        </p>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 700, marginBottom: '1rem' }}>
          From localhost to client-ready.
        </h1>
        <p
          style={{
            color: 'var(--muted)',
            fontSize: '1.125rem',
            marginBottom: '2rem',
            maxWidth: 720,
            lineHeight: 1.6,
          }}
        >
          ShipLocal is an open-source localhost tunneling platform that lets developers securely
          share local applications over HTTPS in seconds. Create public preview URLs, self-host the
          tunnel server, and collaborate with clients before deployment.
        </p>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '3.5rem', flexWrap: 'wrap' }}>
          <a href={appUrl('/register')} style={primaryButtonStyle}>
            Try ShipLocal Cloud
          </a>
          <a
            href="https://github.com/ship-local/shiplocal"
            target="_blank"
            rel="noreferrer"
            style={secondaryButtonStyle}
          >
            View on GitHub
          </a>
          <a href={appUrl('/login')} style={secondaryButtonStyle}>
            Sign in to Cloud
          </a>
        </div>

        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>ShipLocal Core vs ShipLocal Cloud</h2>
          <div
            style={{
              display: 'grid',
              gap: '1rem',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            }}
          >
            <article style={stepCardStyle}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                ShipLocal Core
              </h3>
              <p
                style={{ color: 'var(--muted)', fontSize: '0.875rem', margin: 0, lineHeight: 1.6 }}
              >
                MIT-licensed CLI, tunnel server, and dashboard. Install from npm, self-host on your
                VPS, or point the CLI at any compatible server.
              </p>
            </article>
            <article style={stepCardStyle}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                ShipLocal Cloud
              </h3>
              <p
                style={{ color: 'var(--muted)', fontSize: '0.875rem', margin: 0, lineHeight: 1.6 }}
              >
                Managed SaaS with hosted tunnels, a collaboration dashboard, and visual client
                feedback on live previews. Free to get started — no self-hosting required.
              </p>
            </article>
          </div>
        </section>

        <section style={{ ...sectionStyle, marginTop: '2rem' }}>
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
