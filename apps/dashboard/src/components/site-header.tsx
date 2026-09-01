import Link from 'next/link';
import { appUrl } from '@/lib/site';

interface SiteHeaderProps {
  active?: 'home' | 'blog';
}

export function SiteHeader({ active: _active }: SiteHeaderProps) {
  return (
    <div className="site-frame">
      <header className="site-header">
        <Link href="/" className="site-logo">
          ShipLocal
        </Link>

        <nav className="site-nav" aria-label="Primary">
          <a href={appUrl('/')} className="btn btn-primary" style={{ padding: '0.5rem 0.9rem' }}>
            Try Cloud
          </a>
          <a href={appUrl('/login')}>Sign in</a>
          <a
            href="https://github.com/ship-local/shiplocal"
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: '0.8rem' }}
          >
            GitHub
          </a>
        </nav>
      </header>
    </div>
  );
}
