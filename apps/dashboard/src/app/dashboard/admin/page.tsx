'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/app-shell';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { isAdminUser } from '@/lib/auth-user';
import type { AdminPlatformStats } from '@/lib/stats-types';

function formatCount(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(
    value,
  );
}

export default function AdminAnalyticsPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<AdminPlatformStats | null>(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    if (!token) return;
    setError(null);
    try {
      const data = await apiFetch<AdminPlatformStats>('/api/admin/stats', { token });
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load admin stats');
      setStats(null);
    }
  }, [token]);

  useEffect(() => {
    if (loading) return;
    if (!user || !token) {
      router.replace('/login');
      return;
    }
    if (!isAdminUser(user)) {
      router.replace('/dashboard');
      return;
    }

    void loadStats().finally(() => setFetching(false));
    const interval = setInterval(() => {
      void loadStats();
    }, 30_000);
    return () => clearInterval(interval);
  }, [loading, user, token, router, loadStats]);

  if (loading || fetching || !isAdminUser(user)) {
    return (
      <AppShell title="Platform analytics" subtitle="Loading…">
        <p style={{ color: 'var(--muted)' }}>Loading platform metrics…</p>
      </AppShell>
    );
  }

  const primary = [
    {
      label: 'Users',
      value: formatCount(stats?.users.total),
      hint: stats
        ? `${String(stats.users.last7Days)} in 7d · ${String(stats.users.last30Days)} in 30d`
        : 'Registered accounts',
    },
    {
      label: 'Links generated',
      value: formatCount(stats?.links.total),
      hint: stats
        ? `${String(stats.links.last7Days)} in 7d · ${String(stats.links.last30Days)} in 30d`
        : 'Tunnel links created',
    },
    {
      label: 'Online now',
      value: formatCount(stats?.links.onlineNow),
      hint: 'Live tunnel sessions',
    },
    {
      label: 'npm installs',
      value: formatCount(stats?.npm.downloadsLastMonth),
      hint:
        stats?.npm.downloadsLastWeek != null
          ? `${formatCount(stats.npm.downloadsLastWeek)} last week · ${stats.npm.package}`
          : 'shiplocal downloads (30d)',
    },
  ];

  const secondary = [
    {
      label: 'Projects',
      value: formatCount(stats?.projects.total),
      hint: stats
        ? `${String(stats.projects.last7Days)} in 7d · ${String(stats.projects.last30Days)} in 30d`
        : '',
    },
    {
      label: 'Active accounts (CLI)',
      value: formatCount(stats?.activeAccounts.last30Days),
      hint: stats
        ? `${String(stats.activeAccounts.last7Days)} used a token in the last 7 days`
        : 'Based on API token lastUsed',
    },
  ];

  return (
    <AppShell
      title="Platform analytics"
      subtitle="How people are using ShipLocal across the whole product"
    >
      {error ? (
        <p style={{ color: 'var(--danger)', fontSize: '0.875rem', marginBottom: '1rem' }}>
          {error}
        </p>
      ) : null}

      <section className="stats-strip" aria-label="Platform statistics">
        {primary.map((item) => (
          <div key={item.label} className="stats-item">
            <p className="stats-label">{item.label}</p>
            <p className="stats-value">{item.value}</p>
            <p className="stats-hint">{item.hint}</p>
          </div>
        ))}
      </section>

      <section
        className="stats-strip"
        aria-label="Secondary platform statistics"
        style={{ marginTop: '1.25rem', borderTop: 'none' }}
      >
        {secondary.map((item) => (
          <div key={item.label} className="stats-item">
            <p className="stats-label">{item.label}</p>
            <p className="stats-value">{item.value}</p>
            <p className="stats-hint">{item.hint}</p>
          </div>
        ))}
        <div className="stats-item">
          <p className="stats-label">npm package</p>
          <p className="stats-value" style={{ fontSize: '1.35rem' }}>
            {stats?.npm.package ?? 'shiplocal'}
          </p>
          <p className="stats-hint">
            {stats?.npm.fetchedAt
              ? `Fetched ${new Date(stats.npm.fetchedAt).toLocaleString()}`
              : 'npm registry unavailable'}
          </p>
        </div>
        <div className="stats-item">
          <p className="stats-label">Scope</p>
          <p className="stats-value" style={{ fontSize: '1.35rem' }}>
            Platform
          </p>
          <p className="stats-hint">Admin-only · read-only aggregates</p>
        </div>
      </section>

      <section className="dash-section" style={{ marginTop: '1.5rem' }}>
        <h2 className="dash-section-title">Recent signups</h2>
        {!stats || stats.recentUsers.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>No users yet.</p>
        ) : (
          <ul style={{ listStyle: 'none', display: 'grid', gap: 0 }}>
            {stats.recentUsers.map((recent) => (
              <li
                key={recent.id}
                className="dash-item"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  flexWrap: 'wrap',
                  paddingTop: '0.85rem',
                  paddingBottom: '0.85rem',
                }}
              >
                <div>
                  <p style={{ fontWeight: 600 }}>{recent.email}</p>
                  {recent.name ? (
                    <p style={{ color: 'var(--muted)', fontSize: '0.8125rem' }}>{recent.name}</p>
                  ) : null}
                </div>
                <p style={{ color: 'var(--muted)', fontSize: '0.8125rem' }}>
                  {new Date(recent.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
