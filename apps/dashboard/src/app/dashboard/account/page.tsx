'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/app-shell';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { authButtonStyle, authInputStyle } from '@/lib/auth-forms';

export default function AccountPage() {
  const { user, token, loading, refreshUser } = useAuth();
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  if (loading || !user || !token) {
    return (
      <AppShell title="Account" subtitle="Loading…">
        <p style={{ color: 'var(--muted)' }}>Loading…</p>
      </AppShell>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user || !token) return;

    setError('');
    setMessage('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setSubmitting(true);

    try {
      const data = await apiFetch<{ message: string }>('/api/auth/change-password', {
        method: 'POST',
        token,
        body: JSON.stringify({
          ...(user.hasPassword ? { currentPassword } : {}),
          newPassword,
        }),
      });
      setMessage(data.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      await refreshUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell
      title="Account"
      subtitle={
        !user.hasPassword
          ? `${user.email} · Signed in with Google (no password set yet)`
          : user.email
      }
    >
      <section className="dash-section" style={{ maxWidth: 480 }}>
        <h2 className="dash-section-title">
          {user.hasPassword ? 'Change password' : 'Set a password'}
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
          {user.hasPassword
            ? 'Use a strong password you do not use elsewhere.'
            : 'Add a password so you can sign in with email as well as Google.'}
        </p>

        <form onSubmit={(e) => void handleSubmit(e)} style={{ display: 'grid', gap: '1rem' }}>
          {user.hasPassword ? (
            <label style={{ display: 'grid', gap: '0.375rem', fontSize: '0.875rem' }}>
              Current password
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                style={authInputStyle}
              />
            </label>
          ) : null}

          <label style={{ display: 'grid', gap: '0.375rem', fontSize: '0.875rem' }}>
            New password
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={authInputStyle}
            />
          </label>

          <label style={{ display: 'grid', gap: '0.375rem', fontSize: '0.875rem' }}>
            Confirm new password
            <input
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={authInputStyle}
            />
          </label>

          {error ? <p style={{ color: 'var(--danger)', fontSize: '0.875rem' }}>{error}</p> : null}
          {message ? (
            <p style={{ color: 'var(--success)', fontSize: '0.875rem' }}>{message}</p>
          ) : null}

          <button type="submit" disabled={submitting} style={authButtonStyle}>
            {submitting ? 'Saving…' : user.hasPassword ? 'Update password' : 'Set password'}
          </button>
        </form>
      </section>
    </AppShell>
  );
}
