import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/site-header';
import { formatPostDate, getAllPosts } from '@/lib/blog';
import { siteUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Blog — ShipLocal',
  description: 'Thoughts on localhost sharing, client collaboration, and building developer tools.',
  alternates: {
    canonical: siteUrl('/blog'),
  },
  openGraph: {
    title: 'Blog — ShipLocal',
    description:
      'Thoughts on localhost sharing, client collaboration, and building developer tools.',
    url: siteUrl('/blog'),
    type: 'website',
  },
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <>
      <SiteHeader active="blog" />
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Blog</p>
        <h1
          style={{
            fontSize: 'clamp(1.75rem, 4vw, 2.25rem)',
            fontWeight: 700,
            marginBottom: '0.75rem',
          }}
        >
          Building in public
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '1.0625rem', marginBottom: '2.5rem' }}>
          Problems, engineering ideas, and lessons from shipping ShipLocal.
        </p>

        <ul style={{ listStyle: 'none', display: 'grid', gap: '1.25rem' }}>
          {posts.map((post) => (
            <li key={post.slug}>
              <article
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '0.75rem',
                  padding: '1.5rem',
                }}
              >
                <time
                  dateTime={post.date}
                  style={{
                    color: 'var(--muted)',
                    fontSize: '0.8125rem',
                    display: 'block',
                    marginBottom: '0.5rem',
                  }}
                >
                  {formatPostDate(post.date)}
                  {post.series && post.seriesOrder
                    ? ` · ${post.series} · Part ${post.seriesOrder}`
                    : ''}
                </time>
                <h2
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 600,
                    marginBottom: '0.5rem',
                    lineHeight: 1.35,
                  }}
                >
                  <Link
                    href={`/blog/${post.slug}`}
                    style={{ color: 'var(--foreground)', textDecoration: 'none' }}
                  >
                    {post.title}
                  </Link>
                </h2>
                {post.subtitle ? (
                  <p
                    style={{
                      color: 'var(--muted)',
                      fontSize: '0.9375rem',
                      marginBottom: '0.75rem',
                      fontStyle: 'italic',
                    }}
                  >
                    {post.subtitle}
                  </p>
                ) : null}
                <p
                  style={{
                    color: 'var(--muted)',
                    fontSize: '0.9375rem',
                    marginBottom: '1rem',
                    lineHeight: 1.6,
                  }}
                >
                  {post.description}
                </p>
                <Link href={`/blog/${post.slug}`} style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                  Read article →
                </Link>
              </article>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
