'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { authButtonStyle, authInputStyle } from '@/lib/auth-forms';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);

    try {
      const data = await apiFetch<{ message: string }>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setMessage(data.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={{ maxWidth: 400, margin: '4rem auto', padding: '0 1.5rem' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
        Forgot password
      </h1>
      <p style={{ color: 'var(--muted)', marginBottom: '2rem' }}>
        Enter your email and we&apos;ll send you a link to reset your password.
      </p>

      {message ? (
        <p style={{ color: 'var(--foreground)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          {message}
        </p>
      ) : (
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

          {error ? <p style={{ color: '#ef4444', fontSize: '0.875rem' }}>{error}</p> : null}

          <button type="submit" disabled={submitting} style={authButtonStyle}>
            {submitting ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      )}

      <p style={{ marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--muted)' }}>
        <Link href="/login">Back to sign in</Link>
      </p>
    </main>
  );
}
