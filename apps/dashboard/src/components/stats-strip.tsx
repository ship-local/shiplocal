'use client';

import type { AccountStats } from '@/lib/stats-types';

function formatCount(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(
    value,
  );
}

interface StatsStripProps {
  stats: AccountStats | null;
  loading?: boolean;
}

export function StatsStrip({ stats, loading }: StatsStripProps) {
  const items = [
    {
      label: 'Links generated',
      value: loading ? '…' : formatCount(stats?.linksGenerated),
      hint: stats
        ? `${String(stats.linksLast7Days)} in last 7 days · ${String(stats.linksLast30Days)} in 30d`
        : 'Your tunnel links',
    },
    {
      label: 'Online now',
      value: loading ? '…' : formatCount(stats?.onlineNow),
      hint: 'Live tunnels for this account',
    },
    {
      label: 'Projects',
      value: loading ? '…' : formatCount(stats?.projects),
      hint: 'CLI-created projects',
    },
    {
      label: 'npm installs',
      value: loading ? '…' : formatCount(stats?.npm.downloadsLastMonth),
      hint:
        stats?.npm.downloadsLastWeek != null
          ? `${formatCount(stats.npm.downloadsLastWeek)} last week · package ${stats.npm.package}`
          : 'shiplocal downloads (last 30 days)',
    },
  ];

  return (
    <section className="stats-strip" aria-label="Account statistics">
      {items.map((item) => (
        <div key={item.label} className="stats-item">
          <p className="stats-label">{item.label}</p>
          <p className="stats-value">{item.value}</p>
          <p className="stats-hint">{item.hint}</p>
        </div>
      ))}
    </section>
  );
}
