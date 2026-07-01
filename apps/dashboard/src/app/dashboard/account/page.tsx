'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { authButtonStyle, authInputStyle } from '@/lib/auth-forms';

export default function AccountPage() {
  const { user, token, loading, logout, refreshUser } = useAuth();
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
      <main style={{ maxWidth: 480, margin: '3rem auto', padding: '0 1.5rem' }}>
        <p style={{ color: 'var(--muted)' }}>Loading…</p>
      </main>
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
    <main style={{ maxWidth: 480, margin: '3rem auto', padding: '0 1.5rem 4rem' }}>
      <Link href="/dashboard" style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
        ← Back to dashboard
      </Link>

      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '1rem 0 0.5rem' }}>Account</h1>
      <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '2rem' }}>
        {user.email}
        {!user.hasPassword ? ' · Signed in with Google (no password set yet)' : ''}
      </p>

      <section
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '0.75rem',
          padding: '1.5rem',
        }}
      >
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
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

          {error ? <p style={{ color: '#ef4444', fontSize: '0.875rem' }}>{error}</p> : null}
          {message ? <p style={{ color: '#22c55e', fontSize: '0.875rem' }}>{message}</p> : null}

          <button type="submit" disabled={submitting} style={authButtonStyle}>
            {submitting ? 'Saving…' : user.hasPassword ? 'Update password' : 'Set password'}
          </button>
        </form>
      </section>

      <button
        type="button"
        onClick={() => {
          logout();
          router.push('/login');
        }}
        style={{
          marginTop: '2rem',
          background: 'none',
          border: 'none',
          color: 'var(--muted)',
          fontSize: '0.875rem',
          cursor: 'pointer',
          padding: 0,
        }}
      >
        Sign out
      </button>
    </main>
  );
}
