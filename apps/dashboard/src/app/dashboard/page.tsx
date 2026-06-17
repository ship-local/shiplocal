'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import type { CommentSummary, ProjectSummary, TunnelSummary } from '@shiplocal/shared';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function DashboardPage() {
  const { user, token, apiToken, loading, logout } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [tunnels, setTunnels] = useState<TunnelSummary[]>([]);
  const [comments, setComments] = useState<CommentSummary[]>([]);
  const [fetching, setFetching] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [expandedScreenshot, setExpandedScreenshot] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!token) return;

    const [projectsRes, tunnelsRes, commentsRes] = await Promise.all([
      apiFetch<{ projects: ProjectSummary[] }>('/api/projects', { token }),
      apiFetch<{ tunnels: TunnelSummary[] }>('/api/tunnels', { token }),
      apiFetch<{ comments: CommentSummary[] }>('/api/comments', { token }),
    ]);

    setProjects(projectsRes.projects);
    setTunnels(tunnelsRes.tunnels);
    setComments(commentsRes.comments);
  }, [token]);

  useEffect(() => {
    if (loading) return;
    if (!user || !token) {
      router.replace('/login');
      return;
    }

    void loadData()
      .catch(() => undefined)
      .finally(() => {
        setFetching(false);
      });

    const interval = setInterval(() => {
      void loadData().catch(() => undefined);
    }, 5000);

    return () => clearInterval(interval);
  }, [loading, user, token, router, loadData]);

  useEffect(() => {
    if (!expandedScreenshot) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setExpandedScreenshot(null);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [expandedScreenshot]);

  const [actionError, setActionError] = useState<string | null>(null);

  async function handleTunnelAction(id: string, action: 'stop' | 'restart' | 'delete') {
    if (!token) return;
    setActionId(id);
    setActionError(null);

    try {
      if (action === 'delete') {
        await apiFetch(`/api/tunnels/${id}`, { method: 'DELETE', token });
      } else {
        await apiFetch(`/api/tunnels/${id}/${action}`, { method: 'POST', token });
      }
      await loadData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionId(null);
    }
  }

  if (loading || fetching) {
    return (
      <main style={mainStyle}>
        <p style={{ color: 'var(--muted)' }}>Loading dashboard…</p>
      </main>
    );
  }

  return (
    <main style={mainStyle}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Dashboard</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>{user?.email}</p>
        </div>
        <button
          onClick={() => {
            logout();
            router.push('/login');
          }}
          style={ghostButtonStyle}
        >
          Sign out
        </button>
      </header>

      {actionError ? (
        <p style={{ color: '#ef4444', fontSize: '0.875rem', marginBottom: '1rem' }}>
          {actionError}
        </p>
      ) : null}

      {apiToken ? (
        <section style={cardStyle}>
          <h2 style={sectionTitleStyle}>CLI token</h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
            Run <code style={{ color: 'var(--foreground)' }}>shiplocal login</code> or set{' '}
            <code style={{ color: 'var(--foreground)' }}>SHIPLOCAL_TOKEN</code>
          </p>
          <code style={{ fontSize: '0.75rem', wordBreak: 'break-all' }}>
            {apiToken.slice(0, 20)}…
          </code>
        </section>
      ) : null}

      <section style={{ ...cardStyle, marginTop: '1.5rem' }}>
        <h2 style={sectionTitleStyle}>Projects</h2>
        {projects.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
            No projects yet. Run the CLI to create one.
          </p>
        ) : (
          <ul style={{ listStyle: 'none', display: 'grid', gap: '0.75rem' }}>
            {projects.map((project) => (
              <li key={project.id}>
                <Link href={`/dashboard/projects/${project.id}`} style={projectLinkStyle}>
                  <span style={{ fontWeight: 500 }}>{project.name}</span>
                  <span style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
                    {project.onlineCount > 0 ? '🟢' : '🔴'} {String(project.onlineCount)}/
                    {String(project.tunnelCount)} online
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={{ ...cardStyle, marginTop: '1.5rem' }}>
        <h2 style={sectionTitleStyle}>Active tunnels</h2>
        {tunnels.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
            No tunnels yet. Run <code style={{ color: 'var(--foreground)' }}>shiplocal 3000</code>{' '}
            after logging in via CLI.
          </p>
        ) : (
          <ul style={{ listStyle: 'none', display: 'grid', gap: '1rem' }}>
            {tunnels.map((tunnel) => (
              <li
                key={tunnel.id}
                style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <p style={{ fontWeight: 500 }}>
                      {tunnel.isLive ? '🟢' : '🔴'} {tunnel.projectName}
                      {tunnel.passwordProtected ? ' 🔒' : ''}
                    </p>
                    <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
                      Port {String(tunnel.port)} · {tunnel.subdomain}
                    </p>
                    {tunnel.publicUrl ? (
                      <a
                        href={tunnel.publicUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: '0.875rem' }}
                      >
                        {tunnel.publicUrl}
                      </a>
                    ) : null}
                    <p style={{ color: 'var(--muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                      Created {new Date(tunnel.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'start' }}>
                    <button
                      disabled={actionId === tunnel.id || !tunnel.isLive}
                      onClick={() => void handleTunnelAction(tunnel.id, 'stop')}
                      style={ghostButtonStyle}
                    >
                      Stop
                    </button>
                    <button
                      disabled={actionId === tunnel.id}
                      onClick={() => void handleTunnelAction(tunnel.id, 'restart')}
                      style={ghostButtonStyle}
                    >
                      Restart
                    </button>
                    <button
                      disabled={actionId === tunnel.id}
                      onClick={() => void handleTunnelAction(tunnel.id, 'delete')}
                      style={{ ...ghostButtonStyle, color: '#ef4444' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={{ ...cardStyle, marginTop: '1.5rem' }}>
        <h2 style={sectionTitleStyle}>Client feedback</h2>
        {comments.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
            No feedback yet. Share a tunnel URL with your client — they can click 💬 on the preview.
          </p>
        ) : (
          <ul style={{ listStyle: 'none', display: 'grid', gap: '1rem' }}>
            {comments.map((comment) => (
              <li
                key={comment.id}
                style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}
              >
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  {comment.screenshot ? (
                    <button
                      type="button"
                      onClick={() => setExpandedScreenshot(comment.screenshot)}
                      title="View full screenshot"
                      style={{
                        padding: 0,
                        border: 'none',
                        background: 'none',
                        cursor: 'zoom-in',
                        flexShrink: 0,
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={comment.screenshot}
                        alt="Feedback screenshot thumbnail"
                        style={{
                          width: 120,
                          height: 80,
                          objectFit: 'contain',
                          background: 'var(--background)',
                          borderRadius: '0.5rem',
                          border: '1px solid var(--border)',
                          display: 'block',
                        }}
                      />
                    </button>
                  ) : null}
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <p style={{ fontWeight: 500, marginBottom: '0.25rem' }}>{comment.message}</p>
                    <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
                      {comment.projectName} · {comment.page}
                      {comment.selector ? ` · ${comment.selector}` : ''}
                    </p>
                    <p style={{ color: 'var(--muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                      {new Date(comment.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {expandedScreenshot ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Feedback screenshot preview"
          onClick={() => setExpandedScreenshot(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            cursor: 'zoom-out',
          }}
        >
          <button
            type="button"
            aria-label="Close screenshot preview"
            onClick={() => setExpandedScreenshot(null)}
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              width: '2.5rem',
              height: '2.5rem',
              borderRadius: '9999px',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--foreground)',
              fontSize: '1.25rem',
              cursor: 'pointer',
            }}
          >
            ×
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={expandedScreenshot}
            alt="Full feedback screenshot"
            onClick={(event) => event.stopPropagation()}
            style={{
              maxWidth: 'min(100%, 1200px)',
              maxHeight: '90vh',
              width: 'auto',
              height: 'auto',
              borderRadius: '0.5rem',
              border: '1px solid var(--border)',
              cursor: 'default',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            }}
          />
        </div>
      ) : null}
    </main>
  );
}

const mainStyle: React.CSSProperties = {
  maxWidth: 960,
  margin: '0 auto',
  padding: '3rem 1.5rem',
};

const cardStyle: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '0.75rem',
  padding: '1.5rem',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '1rem',
  fontWeight: 600,
  marginBottom: '1rem',
};

const projectLinkStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '0.75rem',
  borderRadius: '0.5rem',
  border: '1px solid var(--border)',
  textDecoration: 'none',
  color: 'inherit',
};

const ghostButtonStyle: React.CSSProperties = {
  padding: '0.5rem 0.75rem',
  borderRadius: '0.5rem',
  border: '1px solid var(--border)',
  background: 'transparent',
  color: 'var(--foreground)',
  fontSize: '0.875rem',
  cursor: 'pointer',
};
