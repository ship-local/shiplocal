'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { getGoogleAuthUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function RegisterPage() {
  const { register, user, loading } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
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
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await register(email, password, name || undefined);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={{ maxWidth: 400, margin: '4rem auto', padding: '0 1.5rem' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
        Create account
      </h1>
      <p style={{ color: 'var(--muted)', marginBottom: '2rem' }}>
        Start sharing localhost in seconds.
      </p>

      <form onSubmit={(e) => void handleSubmit(e)} style={{ display: 'grid', gap: '1rem' }}>
        <label style={{ display: 'grid', gap: '0.375rem', fontSize: '0.875rem' }}>
          Name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inputStyle}
          />
        </label>

        <label style={{ display: 'grid', gap: '0.375rem', fontSize: '0.875rem' }}>
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />
        </label>

        <label style={{ display: 'grid', gap: '0.375rem', fontSize: '0.875rem' }}>
          Password
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />
        </label>

        {error ? <p style={{ color: '#ef4444', fontSize: '0.875rem' }}>{error}</p> : null}

        <button type="submit" disabled={submitting} style={buttonStyle}>
          {submitting ? 'Creating account…' : 'Create account'}
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
          ...buttonStyle,
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
        Already have an account? <Link href="/login">Sign in</Link>
      </p>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '0.625rem 0.75rem',
  borderRadius: '0.5rem',
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  color: 'var(--foreground)',
};

const buttonStyle: React.CSSProperties = {
  padding: '0.625rem 1rem',
  borderRadius: '0.5rem',
  border: 'none',
  background: 'var(--accent)',
  color: 'white',
  fontWeight: 500,
  cursor: 'pointer',
};
