'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';

function CallbackHandler() {
  const searchParams = useSearchParams();
  const { setSession } = useAuth();
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setError('Missing authentication token');
      return;
    }

    void setSession(token)
      .then(() => {
        router.replace('/dashboard');
      })
      .catch(() => {
        setError('Failed to complete sign in');
      });
  }, [searchParams, setSession, router]);

  if (error) {
    return <p style={{ color: '#ef4444' }}>{error}</p>;
  }

  return <p style={{ color: 'var(--muted)' }}>Completing sign in…</p>;
}

export default function AuthCallbackPage() {
  return (
    <main style={{ maxWidth: 400, margin: '6rem auto', padding: '0 1.5rem', textAlign: 'center' }}>
      <Suspense fallback={<p style={{ color: 'var(--muted)' }}>Loading…</p>}>
        <CallbackHandler />
      </Suspense>
    </main>
  );
}
