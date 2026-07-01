'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { authButtonStyle, authInputStyle } from '@/lib/auth-forms';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Missing reset token. Request a new link from the forgot password page.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);

    try {
      await apiFetch('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });
      router.push('/login?reset=1');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
        Reset password
      </h1>
      <p style={{ color: 'var(--muted)', marginBottom: '2rem' }}>
        Choose a new password for your account.
      </p>

      <form onSubmit={(e) => void handleSubmit(e)} style={{ display: 'grid', gap: '1rem' }}>
        <label style={{ display: 'grid', gap: '0.375rem', fontSize: '0.875rem' }}>
          New password
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={authInputStyle}
          />
        </label>

        <label style={{ display: 'grid', gap: '0.375rem', fontSize: '0.875rem' }}>
          Confirm password
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

        <button type="submit" disabled={submitting} style={authButtonStyle}>
          {submitting ? 'Updating…' : 'Update password'}
        </button>
      </form>

      <p style={{ marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--muted)' }}>
        <Link href="/forgot-password">Request a new link</Link>
        {' · '}
        <Link href="/login">Back to sign in</Link>
      </p>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <main style={{ maxWidth: 400, margin: '4rem auto', padding: '0 1.5rem' }}>
      <Suspense fallback={<p style={{ color: 'var(--muted)' }}>Loading…</p>}>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
