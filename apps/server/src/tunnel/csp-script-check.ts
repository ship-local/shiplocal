const CSP_HEADER_NAMES = new Set([
  'content-security-policy',
  'content-security-policy-report-only',
]);

const META_CSP_RE =
  /<meta\b[^>]*\bhttp-equiv\s*=\s*["']Content-Security-Policy(?:-Report-Only)?["'][^>]*>/gi;

function headerValues(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

export function collectCspPoliciesFromHeaders(
  headers: Record<string, string | string[] | undefined>,
): string[] {
  const policies: string[] = [];

  for (const [key, value] of Object.entries(headers)) {
    if (!CSP_HEADER_NAMES.has(key.toLowerCase())) continue;
    for (const policy of headerValues(value)) {
      if (policy.trim()) policies.push(policy.trim());
    }
  }

  return policies;
}

function readMetaAttribute(tag: string, name: string): string | undefined {
  const re = new RegExp(`\\b${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, 'i');
  const match = tag.match(re);
  return match?.[2];
}

export function extractCspFromHtmlMeta(html: string): string[] {
  const policies: string[] = [];
  const tags = html.match(META_CSP_RE) ?? [];

  for (const tag of tags) {
    const content = readMetaAttribute(tag, 'content');
    if (content?.trim()) policies.push(content.trim());
  }

  return policies;
}

export function collectCspPolicies(
  headers: Record<string, string | string[] | undefined>,
  html: string,
): string[] {
  return [...collectCspPoliciesFromHeaders(headers), ...extractCspFromHtmlMeta(html)];
}

function parseDirectives(policy: string): Map<string, string[]> {
  const directives = new Map<string, string[]>();

  for (const part of policy.split(';')) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const space = trimmed.search(/\s/);
    const name = (space === -1 ? trimmed : trimmed.slice(0, space)).trim().toLowerCase();
    const value = space === -1 ? '' : trimmed.slice(space).trim();
    const sources = value.split(/\s+/).filter(Boolean);
    directives.set(name, sources);
  }

  return directives;
}

function getScriptSources(directives: Map<string, string[]>): string[] | null {
  if (directives.has('script-src-elem')) return directives.get('script-src-elem') ?? null;
  if (directives.has('script-src')) return directives.get('script-src') ?? null;
  if (directives.has('default-src')) return directives.get('default-src') ?? null;
  return null;
}

function normalizeOrigin(origin: string): string {
  try {
    return new URL(origin).origin;
  } catch {
    return origin;
  }
}

function sourceMatchesScriptUrl(
  source: string,
  scriptUrl: URL,
  documentOrigin: string | undefined,
): boolean {
  if (source === '*') return true;
  if (source === "'none'") return false;

  if (source === "'self'") {
    if (!documentOrigin) return false;
    return normalizeOrigin(documentOrigin) === scriptUrl.origin;
  }

  if (source === "'unsafe-inline'" || source === "'unsafe-eval'") return false;

  if (source.startsWith("'") && source.endsWith("'")) {
    return false;
  }

  if (source === 'https:') return scriptUrl.protocol === 'https:';
  if (source === 'http:') return scriptUrl.protocol === 'http:';
  if (source === 'data:') return scriptUrl.protocol === 'data:';
  if (source === 'blob:') return scriptUrl.protocol === 'blob:';

  try {
    const allowed = new URL(source, scriptUrl.origin);
    if (allowed.origin !== scriptUrl.origin) {
      return scriptUrl.href.startsWith(`${allowed.origin}/`) || scriptUrl.origin === allowed.origin;
    }

    const allowedPath = allowed.pathname === '/' ? '' : allowed.pathname;
    return scriptUrl.pathname.startsWith(allowedPath || '/');
  } catch {
    return false;
  }
}

function sourceListAllows(
  sources: string[],
  scriptUrl: URL,
  documentOrigin: string | undefined,
): boolean {
  if (sources.includes("'none'")) return false;

  if (sources.includes("'strict-dynamic'")) {
    return false;
  }

  return sources.some((source) => sourceMatchesScriptUrl(source, scriptUrl, documentOrigin));
}

export function wouldCspAllowExternalScript(
  scriptUrl: string,
  policies: string[],
  documentOrigin?: string,
): boolean {
  if (policies.length === 0) return true;

  let script: URL;
  try {
    script = new URL(scriptUrl);
  } catch {
    return false;
  }

  for (const policy of policies) {
    const sources = getScriptSources(parseDirectives(policy));
    if (sources === null) continue;
    if (!sourceListAllows(sources, script, documentOrigin)) return false;
  }

  return true;
}
