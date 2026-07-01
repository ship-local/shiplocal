'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useEffect, useState } from 'react';
import { getGoogleAuthUrl } from '@/lib/api';
import { authButtonStyle, authInputStyle } from '@/lib/auth-forms';
import { useAuth } from '@/lib/auth-context';

function LoginForm() {
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetSuccess = searchParams.get('reset') === '1';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [loading, user, router]);

  if (loading || user) {
    return (
      <main style={{ maxWidth: 400, margin: '4rem auto', padding: '0 1.5rem' }}>
        <p style={{ color: 'var(--muted)' }}>Loading…</p>
      </main>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={{ maxWidth: 400, margin: '4rem auto', padding: '0 1.5rem' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>Sign in</h1>
      <p style={{ color: 'var(--muted)', marginBottom: '2rem' }}>
        Manage your tunnels and share localhost with clients.
      </p>

      {resetSuccess ? (
        <p style={{ color: '#22c55e', fontSize: '0.875rem', marginBottom: '1rem' }}>
          Password updated. Sign in with your new password.
        </p>
      ) : null}

      <form onSubmit={(e) => void handleSubmit(e)} style={{ display: 'grid', gap: '1rem' }}>
        <label style={{ display: 'grid', gap: '0.375rem', fontSize: '0.875rem' }}>
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={authInputStyle}
          />
        </label>

        <label style={{ display: 'grid', gap: '0.375rem', fontSize: '0.875rem' }}>
          Password
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={authInputStyle}
          />
        </label>

        <p style={{ fontSize: '0.8125rem', textAlign: 'right', marginTop: '-0.5rem' }}>
          <Link href="/forgot-password" style={{ color: 'var(--muted)' }}>
            Forgot password?
          </Link>
        </p>

        {error ? <p style={{ color: '#ef4444', fontSize: '0.875rem' }}>{error}</p> : null}

        <button type="submit" disabled={submitting} style={authButtonStyle}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <div
        style={{
          margin: '1.5rem 0',
          textAlign: 'center',
          color: 'var(--muted)',
          fontSize: '0.875rem',
        }}
      >
        or
      </div>

      <a
        href={getGoogleAuthUrl()}
        style={{
          ...authButtonStyle,
          display: 'block',
          textAlign: 'center',
          background: 'var(--surface)',
          color: 'var(--foreground)',
          border: '1px solid var(--border)',
        }}
      >
        Continue with Google
      </a>

      <p style={{ marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--muted)' }}>
        No account? <Link href="/register">Create one</Link>
      </p>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main style={{ maxWidth: 400, margin: '4rem auto', padding: '0 1.5rem' }}>
          <p style={{ color: 'var(--muted)' }}>Loading…</p>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
