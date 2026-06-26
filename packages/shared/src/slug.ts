export const RESERVED_PROJECT_SLUGS = new Set(['app', 'www', 'api', 'tunnel', 'health', 'overlay']);

export const RESERVED_TARGET_NAMES = new Set(['tunnel', 'health', 'overlay']);

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugifyProjectName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 48);
}

export function normalizeTargetName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 32);
}

export function isValidProjectSlug(slug: string): boolean {
  return (
    slug.length >= 2 &&
    slug.length <= 48 &&
    SLUG_PATTERN.test(slug) &&
    !RESERVED_PROJECT_SLUGS.has(slug)
  );
}

export function isValidTargetName(name: string): boolean {
  return (
    name.length >= 1 &&
    name.length <= 32 &&
    SLUG_PATTERN.test(name) &&
    !RESERVED_TARGET_NAMES.has(name)
  );
}

export function buildProjectSubdomain(projectSlug: string, targetName: string): string {
  if (targetName === 'web') {
    return projectSlug;
  }
  return `${projectSlug}-${targetName}`;
}

export function dedupeSlug(base: string, existing: Set<string>): string {
  let candidate = base;
  let counter = 2;

  while (existing.has(candidate)) {
    const suffix = `-${String(counter)}`;
    candidate = `${base.slice(0, Math.max(1, 48 - suffix.length))}${suffix}`;
    counter += 1;
  }

  existing.add(candidate);
  return candidate;
}
