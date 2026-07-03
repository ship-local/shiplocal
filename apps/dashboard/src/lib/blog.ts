import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export interface BlogPostMeta {
  slug: string;
  title: string;
  subtitle: string;
  date: string;
  description: string;
  series?: string;
  seriesOrder?: number;
  comingSoon: boolean;
}

export interface BlogPost extends BlogPostMeta {
  content: string;
}

const CONTENT_DIR = join(process.cwd(), 'content/blog');

function parseFrontmatter(raw: string): { meta: Record<string, string>; content: string } {
  if (!raw.startsWith('---\n')) {
    return { meta: {}, content: raw };
  }

  const end = raw.indexOf('\n---\n', 4);
  if (end === -1) {
    return { meta: {}, content: raw };
  }

  const frontmatter = raw.slice(4, end);
  const content = raw.slice(end + 5).trimStart();
  const meta: Record<string, string> = {};

  for (const line of frontmatter.split('\n')) {
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    let value = line.slice(colon + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    meta[key] = value;
  }

  return { meta, content };
}

export function isComingSoonPost(meta: Record<string, string>, content: string): boolean {
  const status = meta.status?.toLowerCase();
  if (status === 'coming_soon' || status === 'coming-soon' || status === 'draft') {
    return true;
  }

  const preview = content.slice(0, 800).toLowerCase();
  return preview.includes('coming soon');
}

function fileToPost(filename: string): BlogPost {
  const slug = filename.replace(/\.md$/, '');
  const raw = readFileSync(join(CONTENT_DIR, filename), 'utf8');
  const { meta, content } = parseFrontmatter(raw);

  return {
    slug,
    title: meta.title ?? slug,
    subtitle: meta.subtitle ?? '',
    date: meta.date ?? '',
    description: meta.description ?? '',
    series: meta.series || undefined,
    seriesOrder: meta.series_order ? Number.parseInt(meta.series_order, 10) : undefined,
    comingSoon: isComingSoonPost(meta, content),
    content,
  };
}

export function getAllPosts(): BlogPostMeta[] {
  const files = readdirSync(CONTENT_DIR).filter((name) => name.endsWith('.md'));

  return files
    .map((filename) => {
      const post = fileToPost(filename);
      return {
        slug: post.slug,
        title: post.title,
        subtitle: post.subtitle,
        date: post.date,
        description: post.description,
        series: post.series,
        seriesOrder: post.seriesOrder,
        comingSoon: post.comingSoon,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getPostBySlug(slug: string): BlogPost | null {
  try {
    return fileToPost(`${slug}.md`);
  } catch {
    return null;
  }
}

export function getSeriesPosts(series: string): BlogPostMeta[] {
  return getAllPosts()
    .filter((post) => post.series === series)
    .sort((a, b) => (a.seriesOrder ?? 0) - (b.seriesOrder ?? 0));
}

export function formatPostDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
