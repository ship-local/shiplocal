import Link from 'next/link';
import { appUrl } from '@/lib/site';

interface SiteHeaderProps {
  active?: 'home' | 'blog';
}

export function SiteHeader({ active }: SiteHeaderProps) {
  return (
    <header
      style={{
        maxWidth: 960,
        margin: '0 auto',
        padding: '1.25rem 1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem',
        flexWrap: 'wrap',
      }}
    >
      <Link
        href="/"
        style={{
          color: 'var(--foreground)',
          textDecoration: 'none',
          fontWeight: 700,
          fontSize: '0.9375rem',
        }}
      >
        ShipLocal
      </Link>

      <nav style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <Link
          href="/blog"
          style={{
            color: active === 'blog' ? 'var(--foreground)' : 'var(--muted)',
            fontSize: '0.875rem',
            fontWeight: active === 'blog' ? 600 : 400,
            textDecoration: 'none',
          }}
        >
          Blog
        </Link>
        <a
          href="https://github.com/ship-local/shiplocal"
          target="_blank"
          rel="noreferrer"
          style={{ color: 'var(--muted)', fontSize: '0.875rem', textDecoration: 'none' }}
        >
          GitHub
        </a>
        <a
          href={appUrl('/register')}
          style={{
            background: 'var(--accent)',
            color: 'white',
            padding: '0.5rem 0.875rem',
            borderRadius: '0.5rem',
            fontWeight: 600,
            fontSize: '0.875rem',
            textDecoration: 'none',
          }}
        >
          Get started
        </a>
      </nav>
    </header>
  );
}
