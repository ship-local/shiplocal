export default function DashboardPage() {
  return (
    <main
      style={{
        maxWidth: 960,
        margin: '0 auto',
        padding: '3rem 1.5rem',
      }}
    >
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>Dashboard</h1>
      <p style={{ color: 'var(--muted)', marginBottom: '2rem' }}>
        Projects and tunnel management arrive in Phase 2.
      </p>

      <section
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '0.75rem',
          padding: '1.5rem',
        }}
      >
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Projects</h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>No projects yet.</p>
      </section>
    </main>
  );
}
