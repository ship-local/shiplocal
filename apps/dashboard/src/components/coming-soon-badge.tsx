interface ComingSoonBadgeProps {
  size?: 'sm' | 'md';
}

export function ComingSoonBadge({ size = 'sm' }: ComingSoonBadgeProps) {
  const isSmall = size === 'sm';

  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: isSmall ? '0.6875rem' : '0.75rem',
        fontWeight: 600,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        color: '#fbbf24',
        background: 'rgba(251, 191, 36, 0.12)',
        border: '1px solid rgba(251, 191, 36, 0.35)',
        borderRadius: '999px',
        padding: isSmall ? '0.2rem 0.5rem' : '0.25rem 0.625rem',
        lineHeight: 1.2,
      }}
    >
      Coming soon
    </span>
  );
}
