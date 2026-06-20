import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export interface BlogPostMeta {
  slug: string;
  title: string;
  subtitle: string;
  date: string;
  description: string;
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
    const value = line.slice(colon + 1).trim();
    meta[key] = value;
  }

  return { meta, content };
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

export function formatPostDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
