import type { Metadata } from 'next';
import { HealthStatus } from '@/components/health-status';
import { HomeStructuredData } from '@/components/home-structured-data';
import { SiteHeader } from '@/components/site-header';
import { appUrl, siteUrl, SITE_URL } from '@/lib/site';

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
    index: '01',
    title: 'Start locally',
    body: 'Run your app on localhost — Next.js, Vite, Rails, anything.',
  },
  {
    index: '02',
    title: 'Open a tunnel',
    body: 'Run shiplocal 3000 and get a public HTTPS preview URL in seconds.',
  },
  {
    index: '03',
    title: 'Share & review',
    body: 'Send the Review URL. On Cloud, clients leave feedback without a PR or deploy.',
  },
];

export default function HomePage() {
  return (
    <>
      <HomeStructuredData />
      <SiteHeader active="home" />
      <main className="site-frame">
        <section className="hero">
          <p className="hero-brand">ShipLocal</p>
          <h1 className="hero-title">From localhost to client-ready.</h1>
          <p className="hero-copy">
            Open-source tunneling for HTTPS previews — self-host the Core, or use Cloud for managed
            tunnels and client feedback.
          </p>
          <div className="hero-actions">
            <a href={appUrl('/register')} className="btn btn-primary">
              Try ShipLocal Cloud
            </a>
            <a
              href="https://github.com/ship-local/shiplocal"
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary"
            >
              View on GitHub
            </a>
            <a href={appUrl('/login')} className="btn btn-secondary">
              Sign in
            </a>
          </div>
          <pre className="hero-terminal">
            <span className="prompt">$</span> npm install -g shiplocal{'\n'}
            <span className="prompt">$</span> shiplocal login{'\n'}
            <span className="prompt">$</span> shiplocal 3000
          </pre>
        </section>

        <section className="section-block">
          <h2 className="section-heading">Core vs Cloud</h2>
          <p className="section-lead">
            Same tunnel engine. Choose self-hosted control or managed collaboration.
          </p>
          <div className="split-list">
            <article>
              <h3>ShipLocal Core</h3>
              <p>
                MIT-licensed CLI, tunnel server, and dashboard. Install from npm, self-host on your
                VPS, or point the CLI at any compatible server.
              </p>
            </article>
            <article>
              <h3>ShipLocal Cloud</h3>
              <p>
                Managed SaaS with hosted tunnels, a collaboration dashboard, and visual client
                feedback on live previews. Free to get started.
              </p>
            </article>
          </div>
        </section>

        <section className="section-block">
          <h2 className="section-heading">How it works</h2>
          <p className="section-lead">Three steps from local process to shared preview.</p>
          <div className="steps-row">
            {steps.map((step) => (
              <article key={step.index}>
                <p className="step-index">{step.index}</p>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                  {step.title}
                </h3>
                <p style={{ color: 'var(--muted)', fontSize: '0.9rem', margin: 0 }}>{step.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section-block">
          <h2 className="section-heading">Client feedback on previews</h2>
          <p className="section-lead">
            Every tunnel shares your app over HTTPS. On Cloud, share the{' '}
            <strong style={{ color: 'var(--foreground)' }}>Review URL</strong> so clients leave
            feedback from a ShipLocal page — works on any stack.
          </p>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
            Optional in-page overlay on the Public URL prefers a production-like serve. Opt in on
            hot-reload servers with <code>shiplocal 3000 --feedback</code>.
          </p>
          <a
            href={siteUrl('/blog/how-to-get-client-feedback-on-tunnel-previews')}
            style={{ fontWeight: 600 }}
          >
            How to get client feedback on tunnel previews →
          </a>
        </section>

        <section className="section-block" style={{ paddingBottom: '4rem' }}>
          <h2 className="section-heading">System status</h2>
          <HealthStatus />
        </section>
      </main>
    </>
  );
}
