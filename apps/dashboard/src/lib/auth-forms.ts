import type { CSSProperties } from 'react';

export const authInputStyle: CSSProperties = {
  padding: '0.65rem 0.75rem',
  borderRadius: 'var(--radius)',
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  color: 'var(--foreground)',
  fontFamily: 'var(--font-sans)',
  fontSize: '0.9375rem',
};

export const authButtonStyle: CSSProperties = {
  padding: '0.7rem 1rem',
  borderRadius: 'var(--radius)',
  border: 'none',
  background: 'var(--accent)',
  color: '#fff',
  fontWeight: 600,
  fontFamily: 'var(--font-sans)',
  cursor: 'pointer',
};

export const authGhostButtonStyle: CSSProperties = {
  ...authButtonStyle,
  background: 'var(--surface)',
  color: 'var(--foreground)',
  border: '1px solid var(--border)',
  boxShadow: 'var(--shadow-soft)',
};
