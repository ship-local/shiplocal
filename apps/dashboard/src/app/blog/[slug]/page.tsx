import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BlogMarkdown } from '@/components/blog-markdown';
import { SiteHeader } from '@/components/site-header';
import { formatPostDate, getAllPosts, getPostBySlug } from '@/lib/blog';

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    return { title: 'Post not found — ShipLocal' };
  }

  return {
    title: `${post.title} — ShipLocal Blog`,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      publishedTime: post.date,
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return (
    <>
      <SiteHeader active="blog" />
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>
        <Link
          href="/blog"
          style={{
            color: 'var(--muted)',
            fontSize: '0.875rem',
            display: 'inline-block',
            marginBottom: '1.5rem',
          }}
        >
          ← Back to blog
        </Link>

        <article>
          <header style={{ marginBottom: '2.5rem' }}>
            <time
              dateTime={post.date}
              style={{
                color: 'var(--muted)',
                fontSize: '0.8125rem',
                display: 'block',
                marginBottom: '0.75rem',
              }}
            >
              {formatPostDate(post.date)}
            </time>
            <h1
              style={{
                fontSize: 'clamp(1.75rem, 4vw, 2.375rem)',
                fontWeight: 700,
                lineHeight: 1.25,
                marginBottom: '0.75rem',
              }}
            >
              {post.title}
            </h1>
            {post.subtitle ? (
              <p
                style={{
                  color: 'var(--muted)',
                  fontSize: '1.125rem',
                  fontStyle: 'italic',
                  lineHeight: 1.5,
                }}
              >
                {post.subtitle}
              </p>
            ) : null}
          </header>

          <div className="blog-content">
            <BlogMarkdown content={post.content} />
          </div>
        </article>
      </main>
    </>
  );
}
