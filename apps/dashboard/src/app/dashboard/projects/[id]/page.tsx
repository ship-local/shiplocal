'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/app-shell';
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
      <AppShell title="Project" subtitle="Loading…">
        <p style={{ color: 'var(--muted)' }}>Loading…</p>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={project.name}
      subtitle={`Slug ${project.slug} · Created ${new Date(project.createdAt).toLocaleString()}`}
    >
      <section className="dash-section">
        <h2 className="dash-section-title">Tunnels</h2>
        {project.tunnels.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
            No tunnels for this project.
          </p>
        ) : (
          <ul style={{ listStyle: 'none', display: 'grid', gap: '1rem' }}>
            {project.tunnels.map((tunnel) => (
              <li key={tunnel.id} className="dash-item">
                <p style={{ fontWeight: 600 }}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: 8,
                      height: 8,
                      borderRadius: 999,
                      background: tunnel.isLive ? 'var(--success)' : 'var(--danger)',
                      marginRight: 8,
                    }}
                    aria-hidden
                  />
                  {tunnel.isLive ? 'Online' : 'Offline'} · {tunnel.name}
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
    </AppShell>
  );
}
