import Link from 'next/link';
import { appUrl } from '@/lib/site';

interface SiteHeaderProps {
  active?: 'home' | 'blog';
}

export function SiteHeader({ active }: SiteHeaderProps) {
  return (
    <div className="site-frame">
      <header className="site-header">
        <Link href="/" className="site-logo">
          ShipLocal
        </Link>

        <nav className="site-nav" aria-label="Primary">
          <Link href="/blog" data-active={active === 'blog' ? 'true' : undefined}>
            Blog
          </Link>
          <a href="https://github.com/ship-local/shiplocal" target="_blank" rel="noreferrer">
            GitHub
          </a>
          <a
            href={appUrl('/register')}
            className="btn btn-primary"
            style={{ padding: '0.5rem 0.9rem' }}
          >
            Get started
          </a>
        </nav>
      </header>
    </div>
  );
}
