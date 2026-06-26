'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

interface ProjectDetail {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  tunnels: Array<{
    id: string;
    name: string;
    subdomain: string;
    port: number;
    status: string;
    publicUrl: string | null;
    createdAt: string;
    expiresAt: string | null;
    isLive: boolean;
  }>;
}

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const { token, loading, user } = useAuth();
  const router = useRouter();
  const [project, setProject] = useState<ProjectDetail | null>(null);

  const loadProject = useCallback(async () => {
    if (!token) return;
    const data = await apiFetch<{ project: ProjectDetail }>(`/api/projects/${params.id}`, {
      token,
    });
    setProject(data.project);
  }, [token, params.id]);

  useEffect(() => {
    if (loading) return;
    if (!user || !token) {
      router.replace('/login');
      return;
    }
    void loadProject().catch(() => undefined);
  }, [loading, user, token, router, loadProject]);

  if (!project) {
    return (
      <main style={{ maxWidth: 960, margin: '0 auto', padding: '3rem 1.5rem' }}>
        <p style={{ color: 'var(--muted)' }}>Loading…</p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '3rem 1.5rem' }}>
      <Link href="/dashboard" style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
        ← Back to dashboard
      </Link>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '1rem 0 0.5rem' }}>
        {project.name}
      </h1>
      <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '2rem' }}>
        Slug: <code>{project.slug}</code> · Created {new Date(project.createdAt).toLocaleString()}
      </p>

      <section
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '0.75rem',
          padding: '1.5rem',
        }}
      >
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Tunnels</h2>
        {project.tunnels.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
            No tunnels for this project.
          </p>
        ) : (
          <ul style={{ listStyle: 'none', display: 'grid', gap: '1rem' }}>
            {project.tunnels.map((tunnel) => (
              <li
                key={tunnel.id}
                style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}
              >
                <p style={{ fontWeight: 500 }}>
                  {tunnel.isLive ? '🟢 Online' : '🔴 Offline'} · {tunnel.name}
                </p>
                <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
                  Port {String(tunnel.port)}
                </p>
                <p style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>
                  <code>
                    shiplocal {String(tunnel.port)} --project {project.slug}
                    {tunnel.name !== 'web' ? ` --name ${tunnel.name}` : ''}
                  </code>
                </p>
                {tunnel.publicUrl ? (
                  <a href={tunnel.publicUrl} target="_blank" rel="noreferrer">
                    {tunnel.publicUrl}
                  </a>
                ) : (
                  <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>{tunnel.subdomain}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
