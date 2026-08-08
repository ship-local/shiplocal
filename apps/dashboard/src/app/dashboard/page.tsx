'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { AccountStats, CommentSummary, ProjectSummary, TunnelSummary } from '@shiplocal/shared';
import { AppShell } from '@/components/app-shell';
import { StatsStrip } from '@/components/stats-strip';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { isCloudEdition } from '@/lib/edition';

const LAYOUT_STORAGE_KEY = 'shiplocal_dashboard_layout';
const POLL_INTERVAL_MS = 10_000;

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
  const { user, token, apiToken, loading } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [tunnels, setTunnels] = useState<TunnelSummary[]>([]);
  const [comments, setComments] = useState<CommentSummary[]>([]);
  const [stats, setStats] = useState<AccountStats | null>(null);
  const [fetching, setFetching] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [feedbackActionId, setFeedbackActionId] = useState<string | null>(null);
  const [expandedScreenshot, setExpandedScreenshot] = useState<string | null>(null);
  const [expandedLoadingId, setExpandedLoadingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [layout, setLayout] = useState<DashboardLayout>('focus');
  const loadInFlight = useRef(false);

  useEffect(() => {
    setLayout(readStoredLayout());
  }, []);

  function selectLayout(next: DashboardLayout) {
    setLayout(next);
    localStorage.setItem(LAYOUT_STORAGE_KEY, next);
  }

  const loadData = useCallback(async () => {
    if (!token || loadInFlight.current) return;

    loadInFlight.current = true;
    setLoadError(null);

    try {
      const [projectsRes, tunnelsRes, statsRes] = await Promise.all([
        apiFetch<{ projects: ProjectSummary[] }>('/api/projects', { token }),
        apiFetch<{ tunnels: TunnelSummary[] }>('/api/tunnels', { token }),
        apiFetch<AccountStats>('/api/stats', { token }),
      ]);

      setProjects(projectsRes.projects ?? []);
      setTunnels(tunnelsRes.tunnels ?? []);
      setStats(statsRes);

      if (isCloudEdition()) {
        const commentsRes = await apiFetch<{ comments: CommentSummary[] }>('/api/comments', {
          token,
        });
        setComments(commentsRes.comments ?? []);
      } else {
        setComments([]);
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      loadInFlight.current = false;
    }
  }, [token]);

  useEffect(() => {
    if (loading) return;
    if (!user || !token) {
      setFetching(false);
      router.replace('/login');
      return;
    }

    void loadData().finally(() => {
      setFetching(false);
    });

    const interval = setInterval(() => {
      void loadData();
    }, POLL_INTERVAL_MS);

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

  async function handleDeleteFeedback(id: string) {
    if (!token) return;
    setFeedbackActionId(id);
    setActionError(null);

    try {
      await apiFetch(`/api/comments/${id}`, { method: 'DELETE', token });
      setComments((prev) => prev.filter((comment) => comment.id !== id));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete feedback');
    } finally {
      setFeedbackActionId(null);
    }
  }

  async function handleClearAllFeedback() {
    if (!token || comments.length === 0) return;
    if (
      !window.confirm(`Clear all ${String(comments.length)} feedback items? This cannot be undone.`)
    ) {
      return;
    }

    setFeedbackActionId('clear-all');
    setActionError(null);

    try {
      await apiFetch('/api/comments', { method: 'DELETE', token });
      setComments([]);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to clear feedback');
    } finally {
      setFeedbackActionId(null);
    }
  }

  async function handleOpenScreenshot(comment: CommentSummary) {
    if (!token || !comment.hasScreenshot) return;
    if (comment.screenshot) {
      setExpandedScreenshot(comment.screenshot);
      return;
    }

    setExpandedLoadingId(comment.id);
    setActionError(null);
    try {
      const res = await apiFetch<{ comment: CommentSummary }>(`/api/comments/${comment.id}`, {
        token,
      });
      const full = res.comment.screenshot;
      if (!full) {
        setActionError('Screenshot not available');
        return;
      }
      setComments((prev) =>
        prev.map((item) =>
          item.id === comment.id ? { ...item, screenshot: full, hasScreenshot: true } : item,
        ),
      );
      setExpandedScreenshot(full);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to load screenshot');
    } finally {
      setExpandedLoadingId(null);
    }
  }

  const feedbackBusy = feedbackActionId !== null;

  const feedbackSection = isCloudEdition() ? (
    <section className="dash-section">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '1rem',
        }}
      >
        <h2 className="dash-section-title" style={{ margin: 0 }}>
          Client feedback
        </h2>
        {comments.length > 0 ? (
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              background: 'var(--accent-soft)',
              color: 'var(--accent)',
              padding: '0.15rem 0.45rem',
              borderRadius: 'var(--radius)',
            }}
          >
            {String(comments.length)}
          </span>
        ) : null}
        {comments.length > 0 ? (
          <button
            type="button"
            disabled={feedbackBusy}
            onClick={() => void handleClearAllFeedback()}
            className="btn btn-ghost btn-danger"
            style={{ marginLeft: 'auto' }}
          >
            {feedbackActionId === 'clear-all' ? 'Clearing…' : 'Clear all'}
          </button>
        ) : null}
      </div>
      {comments.length === 0 ? (
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
          No feedback yet. Share the <strong>Review URL</strong> from the CLI (not only the Public
          URL) — clients leave feedback from the ShipLocal review page.
        </p>
      ) : (
        <ul style={{ listStyle: 'none', display: 'grid', gap: '1rem' }}>
          {comments.map((comment) => (
            <li key={comment.id} className="dash-item">
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                {comment.hasScreenshot ? (
                  <button
                    type="button"
                    onClick={() => void handleOpenScreenshot(comment)}
                    title="View full screenshot"
                    style={{
                      padding: 0,
                      border: 'none',
                      background: 'none',
                      cursor: 'zoom-in',
                      flexShrink: 0,
                    }}
                  >
                    {comment.screenshot ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={comment.screenshot}
                        alt="Feedback screenshot thumbnail"
                        style={{
                          width: 140,
                          height: 96,
                          objectFit: 'contain',
                          background: 'var(--background)',
                          borderRadius: 'var(--radius)',
                          border: '1px solid var(--border)',
                          display: 'block',
                        }}
                      />
                    ) : (
                      <span
                        style={{
                          width: 140,
                          height: 96,
                          display: 'grid',
                          placeItems: 'center',
                          background: 'var(--background)',
                          borderRadius: 'var(--radius)',
                          border: '1px solid var(--border)',
                          color: 'var(--muted)',
                          fontSize: '0.75rem',
                        }}
                      >
                        {expandedLoadingId === comment.id ? 'Loading…' : 'View'}
                      </span>
                    )}
                  </button>
                ) : null}
                <div style={{ flex: 1, minWidth: 200 }}>
                  <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{comment.message}</p>
                  <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
                    {comment.projectName} · {comment.page}
                    {comment.selector ? ` · ${comment.selector}` : ''}
                  </p>
                  <p style={{ color: 'var(--muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    {new Date(comment.createdAt).toLocaleString()}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={feedbackBusy}
                  onClick={() => void handleDeleteFeedback(comment.id)}
                  className="btn btn-ghost btn-danger"
                  style={{ alignSelf: 'start' }}
                >
                  {feedbackActionId === comment.id ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  ) : null;

  const tunnelsSection = (
    <section className="dash-section">
      <h2 className="dash-section-title">Live tunnels</h2>
      {tunnels.length === 0 ? (
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
          No live tunnels. Run <code>shiplocal 3000</code> after logging in via CLI.
        </p>
      ) : (
        <ul style={{ listStyle: 'none', display: 'grid', gap: '1rem' }}>
          {tunnels.map((tunnel) => (
            <li key={tunnel.id} className="dash-item">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  flexWrap: 'wrap',
                }}
              >
                <div>
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
                    {tunnel.projectName}
                    {tunnel.name !== 'web' ? ` · ${tunnel.name}` : ''}
                    {tunnel.passwordProtected ? ' · locked' : ''}
                  </p>
                  <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
                    Port {String(tunnel.port)} · {tunnel.subdomain}
                  </p>
                  <p style={{ color: 'var(--muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    CLI:{' '}
                    <code>
                      shiplocal {String(tunnel.port)} --project {tunnel.projectSlug}
                      {tunnel.name !== 'web' ? ` --name ${tunnel.name}` : ''}
                    </code>
                  </p>
                  {tunnel.publicUrl ? (
                    <a
                      href={tunnel.publicUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: '0.875rem', fontWeight: 600 }}
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
                    className="btn btn-ghost"
                  >
                    Stop
                  </button>
                  <button
                    disabled={actionId === tunnel.id}
                    onClick={() => void handleTunnelAction(tunnel.id, 'restart')}
                    className="btn btn-ghost"
                  >
                    Restart
                  </button>
                  <button
                    disabled={actionId === tunnel.id}
                    onClick={() => void handleTunnelAction(tunnel.id, 'delete')}
                    className="btn btn-ghost btn-danger"
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
    <section className="dash-section">
      <h2 className="dash-section-title">Projects</h2>
      {projects.length === 0 ? (
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
          No projects yet. Run the CLI to create one.
        </p>
      ) : (
        <ul style={{ listStyle: 'none', display: 'grid', gap: '0.75rem' }}>
          {projects.map((project) => (
            <li key={project.id}>
              <Link
                href={`/dashboard/projects/${project.id}`}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  padding: '0.75rem 0',
                  borderTop: '1px solid var(--border)',
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                <span>
                  <span style={{ fontWeight: 600 }}>{project.name}</span>
                  <span style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
                    {' '}
                    · {project.slug}
                  </span>
                </span>
                <span style={{ color: 'var(--muted)', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                  {String(project.onlineCount)}/{String(project.tunnelCount)} online
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {apiToken ? (
        <details style={{ marginTop: '1.25rem' }}>
          <summary style={{ cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}>
            CLI token
          </summary>
          <p style={{ color: 'var(--muted)', fontSize: '0.8125rem', margin: '0.75rem 0' }}>
            Run <code>shiplocal login</code> or set <code>SHIPLOCAL_TOKEN</code>
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
        {feedbackSection}
        <div className="dashboard-focus-secondary">{sidebar}</div>
      </>
    );
  } else {
    content = <div style={{ marginTop: '1.25rem' }}>{sidebar}</div>;
  }

  if (loading || fetching) {
    return (
      <AppShell title="Overview" subtitle="Loading your workspace…">
        <StatsStrip stats={null} loading />
      </AppShell>
    );
  }

  const layoutActions = isCloudEdition() ? (
    <div>
      <p
        style={{
          fontSize: '0.6875rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'var(--muted)',
          marginBottom: '0.375rem',
        }}
      >
        Layout
      </p>
      <div className="layout-toggle" role="radiogroup" aria-label="Dashboard layout">
        {LAYOUT_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            className="layout-option"
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
  ) : null;

  return (
    <AppShell
      title="Overview"
      subtitle="Tunnels, projects, and account activity"
      actions={layoutActions}
    >
      <StatsStrip stats={stats} />

      {actionError ? (
        <p style={{ color: 'var(--danger)', fontSize: '0.875rem', margin: '1rem 0 0' }}>
          {actionError}
        </p>
      ) : null}

      {loadError ? (
        <p style={{ color: 'var(--danger)', fontSize: '0.875rem', margin: '1rem 0 0' }}>
          {loadError}
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
            background: 'rgba(20, 24, 31, 0.82)',
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
            className="btn btn-secondary"
            style={{ position: 'absolute', top: '1rem', right: '1rem' }}
          >
            Close
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
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              cursor: 'default',
            }}
          />
        </div>
      ) : null}
    </AppShell>
  );
}
