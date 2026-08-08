'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useAuth } from '@/lib/auth-context';

interface AppShellProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function AppShell({ children, title, subtitle, actions }: AppShellProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <Link href="/dashboard" className="app-brand">
          ShipLocal
        </Link>

        <nav className="app-nav" aria-label="Dashboard">
          <Link
            href="/dashboard"
            className="app-nav-link"
            data-active={pathname === '/dashboard' ? 'true' : 'false'}
          >
            Overview
          </Link>
          {user?.isAdmin ? (
            <Link
              href="/dashboard/admin"
              className="app-nav-link"
              data-active={pathname?.startsWith('/dashboard/admin') ? 'true' : 'false'}
            >
              Analytics
            </Link>
          ) : null}
          <Link
            href="/dashboard/account"
            className="app-nav-link"
            data-active={pathname?.startsWith('/dashboard/account') ? 'true' : 'false'}
          >
            Account
          </Link>
        </nav>

        <div className="app-sidebar-footer">
          <p className="app-user">{user?.email ?? 'Signed in'}</p>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              logout();
              router.push('/login');
            }}
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <div>
            <h1 className="app-title">{title}</h1>
            {subtitle ? <p className="app-subtitle">{subtitle}</p> : null}
          </div>
          {actions ? (
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>{actions}</div>
          ) : null}
        </header>
        {children}
      </div>
    </div>
  );
}
