'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import type { CommentSummary, ProjectSummary, TunnelSummary } from '@shiplocal/shared';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { isCloudEdition } from '@/lib/edition';

const LAYOUT_STORAGE_KEY = 'shiplocal_dashboard_layout';

type DashboardLayout = 'focus' | 'split' | 'board';

const LAYOUT_OPTIONS: Array<{
  id: DashboardLayout;
  label: string;
  description: string;
}> = [
  { id: 'focus', label: 'Focus', description: 'Feedback first, controls below' },
  { id: 'split', label: 'Split', description: 'Feedback left, controls right' },
  { id: 'board', label: 'Board', description: 'Three columns side by side' },
];

function isDashboardLayout(value: string): value is DashboardLayout {
  return value === 'focus' || value === 'split' || value === 'board';
}

function readStoredLayout(): DashboardLayout {
  if (typeof window === 'undefined') return 'focus';
  const stored = localStorage.getItem(LAYOUT_STORAGE_KEY);
  return stored && isDashboardLayout(stored) ? stored : 'focus';
}

export default function DashboardPage() {
  const { user, token, apiToken, loading, logout } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [tunnels, setTunnels] = useState<TunnelSummary[]>([]);
  const [comments, setComments] = useState<CommentSummary[]>([]);
  const [fetching, setFetching] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [expandedScreenshot, setExpandedScreenshot] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [layout, setLayout] = useState<DashboardLayout>('focus');

  useEffect(() => {
    setLayout(readStoredLayout());
  }, []);

  function selectLayout(next: DashboardLayout) {
    setLayout(next);
    localStorage.setItem(LAYOUT_STORAGE_KEY, next);
  }

  const loadData = useCallback(async () => {
    if (!token) return;

    const [projectsRes, tunnelsRes] = await Promise.all([
      apiFetch<{ projects: ProjectSummary[] }>('/api/projects', { token }),
      apiFetch<{ tunnels: TunnelSummary[] }>('/api/tunnels', { token }),
    ]);

    setProjects(projectsRes.projects);
    setTunnels(tunnelsRes.tunnels);

    if (isCloudEdition()) {
      const commentsRes = await apiFetch<{ comments: CommentSummary[] }>('/api/comments', {
        token,
      });
      setComments(commentsRes.comments);
    } else {
      setComments([]);
    }
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

  const feedbackSection = isCloudEdition() ? (
    <section style={cardStyle}>
      <div style={sectionHeaderStyle}>
        <h2 style={sectionTitleStyle}>Client feedback</h2>
        {comments.length > 0 ? <span style={badgeStyle}>{String(comments.length)}</span> : null}
      </div>
      {comments.length === 0 ? (
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
          No feedback yet. Share a tunnel URL with your client — they can click 💬 on the preview.
        </p>
      ) : (
        <ul style={{ listStyle: 'none', display: 'grid', gap: '1rem' }}>
          {comments.map((comment) => (
            <li key={comment.id} style={feedbackItemStyle}>
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
                        width: 140,
                        height: 96,
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
  ) : null;

  const tunnelsSection = (
    <section style={cardStyle}>
      <h2 style={{ ...sectionTitleStyle, marginBottom: '1rem' }}>Active tunnels</h2>
      {tunnels.length === 0 ? (
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
          No tunnels yet. Run <code style={{ color: 'var(--foreground)' }}>shiplocal 3000</code>{' '}
          after logging in via CLI.
        </p>
      ) : (
        <ul style={{ listStyle: 'none', display: 'grid', gap: '1rem' }}>
          {tunnels.map((tunnel) => (
            <li key={tunnel.id} style={listItemStyle}>
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
                    {tunnel.name !== 'web' ? ` · ${tunnel.name}` : ''}
                    {tunnel.passwordProtected ? ' 🔒' : ''}
                  </p>
                  <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
                    Port {String(tunnel.port)} · {tunnel.subdomain}
                  </p>
                  <p style={{ color: 'var(--muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    CLI:{' '}
                    <code style={{ color: 'var(--foreground)' }}>
                      shiplocal {String(tunnel.port)} --project {tunnel.projectSlug}
                      {tunnel.name !== 'web' ? ` --name ${tunnel.name}` : ''}
                    </code>
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
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: '0.5rem',
                    alignItems: 'start',
                    flexWrap: 'wrap',
                  }}
                >
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
  );

  const projectsSection = (
    <section style={cardStyle}>
      <h2 style={{ ...sectionTitleStyle, marginBottom: '1rem' }}>Projects</h2>
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
                  {' '}
                  · {project.slug}
                </span>
                <span style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
                  {project.onlineCount > 0 ? '🟢' : '🔴'} {String(project.onlineCount)}/
                  {String(project.tunnelCount)} online
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {apiToken ? (
        <details style={{ marginTop: '1.25rem' }}>
          <summary style={{ cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}>
            CLI token
          </summary>
          <p style={{ color: 'var(--muted)', fontSize: '0.8125rem', margin: '0.75rem 0' }}>
            Run <code style={{ color: 'var(--foreground)' }}>shiplocal login</code> or set{' '}
            <code style={{ color: 'var(--foreground)' }}>SHIPLOCAL_TOKEN</code>
          </p>
          <code style={{ fontSize: '0.75rem', wordBreak: 'break-all' }}>
            {apiToken.slice(0, 20)}…
          </code>
        </details>
      ) : null}
    </section>
  );

  const sidebar = (
    <div style={{ display: 'grid', gap: '1.25rem', alignContent: 'start' }}>
      {tunnelsSection}
      {projectsSection}
    </div>
  );

  let content: React.ReactNode;

  if (isCloudEdition() && layout === 'split') {
    content = (
      <div className="dashboard-split">
        <div style={{ minWidth: 0 }}>{feedbackSection}</div>
        {sidebar}
      </div>
    );
  } else if (isCloudEdition() && layout === 'board') {
    content = (
      <div className="dashboard-board">
        {feedbackSection}
        {tunnelsSection}
        {projectsSection}
      </div>
    );
  } else if (isCloudEdition() && layout === 'focus') {
    content = (
      <>
        <div style={{ marginBottom: '1.25rem' }}>{feedbackSection}</div>
        <div className="dashboard-focus-secondary">{sidebar}</div>
      </>
    );
  } else {
    content = sidebar;
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
      <style>{`
        .dashboard-layout-toggle {
          display: inline-flex;
          padding: 0.25rem;
          border-radius: 0.625rem;
          border: 1px solid var(--border);
          background: var(--background);
          gap: 0.25rem;
        }
        .dashboard-layout-option {
          border: none;
          background: transparent;
          color: var(--muted);
          font-size: 0.8125rem;
          font-weight: 500;
          padding: 0.375rem 0.75rem;
          border-radius: 0.5rem;
          cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease;
        }
        .dashboard-layout-option[data-active='true'] {
          background: var(--accent);
          color: white;
        }
        .dashboard-focus-secondary {
          display: grid;
          gap: 1.25rem;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        }
        .dashboard-split {
          display: grid;
          gap: 1.25rem;
          grid-template-columns: minmax(0, 1.55fr) minmax(280px, 1fr);
          align-items: start;
        }
        .dashboard-board {
          display: grid;
          gap: 1.25rem;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          align-items: start;
        }
        @media (max-width: 1024px) {
          .dashboard-split,
          .dashboard-board {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <header style={headerStyle}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Dashboard</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>{user?.email}</p>
        </div>

        <div style={headerActionsStyle}>
          {isCloudEdition() ? (
            <div>
              <p style={layoutLabelStyle}>Layout</p>
              <div
                className="dashboard-layout-toggle"
                role="radiogroup"
                aria-label="Dashboard layout"
              >
                {LAYOUT_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className="dashboard-layout-option"
                    role="radio"
                    aria-checked={layout === option.id}
                    aria-label={option.description}
                    title={option.description}
                    data-active={layout === option.id}
                    onClick={() => selectLayout(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <button
            onClick={() => {
              logout();
              router.push('/login');
            }}
            style={ghostButtonStyle}
          >
            Sign out
          </button>
        </div>
      </header>

      {actionError ? (
        <p style={{ color: '#ef4444', fontSize: '0.875rem', marginBottom: '1rem' }}>
          {actionError}
        </p>
      ) : null}

      {content}

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
  maxWidth: 1280,
  margin: '0 auto',
  padding: '1.5rem',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: '1rem',
  flexWrap: 'wrap',
  marginBottom: '1.25rem',
};

const headerActionsStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-end',
  gap: '1rem',
  flexWrap: 'wrap',
};

const layoutLabelStyle: React.CSSProperties = {
  fontSize: '0.6875rem',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--muted)',
  marginBottom: '0.375rem',
};

const cardStyle: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '0.75rem',
  padding: '1.25rem',
};

const sectionHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  marginBottom: '1rem',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '1rem',
  fontWeight: 600,
  margin: 0,
};

const badgeStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  fontWeight: 600,
  background: 'var(--accent)',
  color: 'white',
  borderRadius: '9999px',
  padding: '0.125rem 0.5rem',
};

const feedbackItemStyle: React.CSSProperties = {
  borderTop: '1px solid var(--border)',
  paddingTop: '1rem',
};

const listItemStyle: React.CSSProperties = {
  borderTop: '1px solid var(--border)',
  paddingTop: '1rem',
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
