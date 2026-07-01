import type { CSSProperties } from 'react';

export const authInputStyle: CSSProperties = {
  padding: '0.625rem 0.75rem',
  borderRadius: '0.5rem',
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  color: 'var(--foreground)',
};

export const authButtonStyle: CSSProperties = {
  padding: '0.625rem 1rem',
  borderRadius: '0.5rem',
  border: 'none',
  background: 'var(--accent)',
  color: 'white',
  fontWeight: 500,
  cursor: 'pointer',
};

export const authGhostButtonStyle: CSSProperties = {
  ...authButtonStyle,
  background: 'var(--surface)',
  color: 'var(--foreground)',
  border: '1px solid var(--border)',
};
