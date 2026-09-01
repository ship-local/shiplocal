import type { Metadata } from 'next';
import { HealthStatus } from '@/components/health-status';
import { HomeStructuredData } from '@/components/home-structured-data';
import { SiteHeader } from '@/components/site-header';
import { appUrl, SITE_URL } from '@/lib/site';

const META_DESCRIPTION =
  'Share a Review URL. Your client pins feedback on the running app — no deploy, no Chrome extension, no PR.';

export const metadata: Metadata = {
  title: 'ShipLocal — Send localhost. Get client comments.',
  description: META_DESCRIPTION,
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: 'ShipLocal — Send localhost. Get client comments.',
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
    title: 'Run your app',
    body: 'Next, Vite, Rails, Flask, static — anything on localhost.',
  },
  {
    index: '02',
    title: 'Run shiplocal 3000',
    body: 'You get a Public URL and a Review URL.',
  },
  {
    index: '03',
    title: 'Send the Review URL',
    body: 'They comment. You keep coding.',
  },
];

const notThis = [
  {
    title: 'ngrok',
    body: 'ngrok gives them a link. Then they text “the button is weird.” You guess which button.',
  },
  {
    title: 'A preview deploy',
    body: 'A preview deploy needs a push. Clients don’t live in git.',
  },
  {
    title: 'BugHerd',
    body: 'BugHerd is for a live site. This is for the hour before it exists.',
  },
];

export default function HomePage() {
  return (
    <>
      <HomeStructuredData />
      <SiteHeader active="home" />
      <main className="site-frame">
        <section className="hero">
          <h1 className="hero-brand">Send localhost. Get client comments.</h1>
          <p className="hero-copy">
            Share a Review URL. Your client pins feedback on the running app — no deploy, no Chrome
            extension, no PR.
          </p>
          <div className="hero-actions">
            <a href={appUrl('/')} className="btn btn-primary">
              Try Cloud
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
          <p className="section-lead" style={{ marginTop: '1rem', marginBottom: 0 }}>
            Send the Review URL, not the public one.
          </p>
        </section>

        <section className="section-block">
          <h2 className="section-heading">What they see</h2>
          <p className="section-lead">
            You keep the app on your machine. They open a link. They click the thing that&apos;s wrong
            and leave a comment. You see it on the dashboard. No “can you push a staging?” No Loom of
            you scrolling. No waiting on Vercel.
          </p>
          <div
            className="panel"
            style={{
              padding: '3rem 1.25rem',
              textAlign: 'center',
              color: 'var(--muted)',
              borderStyle: 'dashed',
            }}
            aria-label="20 second demo GIF placeholder"
          >
            <p style={{ fontWeight: 700, color: 'var(--foreground)', marginBottom: '0.4rem' }}>
              20s demo GIF
            </p>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>
              Placeholder — client pins a comment on the running app. Do not invent a clip.
            </p>
          </div>
        </section>

        <section className="section-block">
          <h2 className="section-heading">How it works</h2>
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
          <h2 className="section-heading">Don&apos;t confuse it with</h2>
          <div className="steps-row">
            {notThis.map((item) => (
              <article key={item.title}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                  {item.title}
                </h3>
                <p style={{ color: 'var(--muted)', fontSize: '0.9rem', margin: 0 }}>{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section-block">
          <h2 className="section-heading">Cloud vs Core</h2>
          <div className="split-list">
            <article>
              <h3>ShipLocal Cloud</h3>
              <p>
                Hosted tunnels, Review URL, comments. This is the product. Free to start.
              </p>
            </article>
            <article>
              <h3>ShipLocal Core</h3>
              <p>
                MIT tunnel engine. Self-host if you want the pipes on your VPS. No feedback overlay.
              </p>
            </article>
          </div>
        </section>

        <section className="section-block" id="status">
          <h2 className="section-heading">System status</h2>
          <HealthStatus />
        </section>

        <footer className="section-block" style={{ paddingBottom: '4rem' }}>
          <p className="section-lead" style={{ marginBottom: '1rem' }}>
            The tunnel is infrastructure. The comments are the product.
          </p>
          <nav className="site-nav" aria-label="Footer">
            <a
              href="https://github.com/ship-local/shiplocal/blob/main/docs/quickstart.md"
              target="_blank"
              rel="noreferrer"
            >
              Docs
            </a>
            <a href="https://github.com/ship-local/shiplocal" target="_blank" rel="noreferrer">
              GitHub
            </a>
            <a href="#status">Status</a>
          </nav>
        </footer>
      </main>
    </>
  );
}
