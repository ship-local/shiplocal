export type CheckStatus = 'ok' | 'warn' | 'fail';

export interface DoctorCheck {
  name: string;
  status: CheckStatus;
  message: string;
  ms?: number;
}

export function formatMs(ms: number): string {
  if (ms < 1000) return `${String(Math.round(ms))} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${String(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatCompressionRatio(rawBytes: number, encodedBytes: number): string | undefined {
  if (rawBytes <= 0 || encodedBytes <= 0 || encodedBytes >= rawBytes) return undefined;
  const saved = Math.round((1 - encodedBytes / rawBytes) * 100);
  return `${String(saved)}% smaller on wire`;
}

export function findScriptSrcInHtml(html: string): string | undefined {
  const patterns = [
    /<script[^>]+src=["'](\/_next\/static\/chunks\/[^"']+)["']/i,
    /<script[^>]+src=["'](\/_next\/static\/[^"']+\.js)["']/i,
    /<script[^>]+src=["'](\/assets\/[^"']+\.js)["']/i,
    /<script[^>]+src=["']([^"']+\.js)["']/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1] && !match[1].includes('webpack-hmr')) {
      return match[1];
    }
  }

  return undefined;
}

export function findHmrWebSocketPath(html: string): string | undefined {
  if (/\/_next\/webpack-hmr/i.test(html) || /webpack-hmr/i.test(html)) {
    return '/_next/webpack-hmr';
  }

  if (/\/_next\/static\/chunks\/webpack/i.test(html)) {
    return '/_next/webpack-hmr';
  }

  if (/@vite\/client/i.test(html)) {
    return '/@vite/client';
  }

  return undefined;
}

export function toWebSocketOrigin(httpUrl: string): string {
  const url = new URL(httpUrl);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = '';
  url.search = '';
  url.hash = '';
  return url.origin;
}

export function formatDoctorReport(
  apiUrl: string,
  checks: DoctorCheck[],
  metrics: Record<string, string>,
): string {
  const lines = ['ShipLocal Doctor', '================', `API URL: ${apiUrl}`, ''];

  for (const check of checks) {
    const timing = check.ms !== undefined ? ` (${formatMs(check.ms)})` : '';
    const icon = check.status === 'ok' ? 'OK' : check.status === 'warn' ? 'WARN' : 'FAIL';
    lines.push(`${check.name}: ${icon}${timing} — ${check.message}`);
  }

  if (Object.keys(metrics).length > 0) {
    lines.push('');
    lines.push('Metrics');
    lines.push('-------');
    for (const [key, value] of Object.entries(metrics)) {
      lines.push(`${key}: ${value}`);
    }
  }

  const failures = checks.filter((check) => check.status === 'fail').length;
  const warnings = checks.filter((check) => check.status === 'warn').length;

  lines.push('');
  if (failures > 0) {
    lines.push(`Overall: ${String(failures)} failed, ${String(warnings)} warning(s)`);
  } else if (warnings > 0) {
    lines.push(`Overall: healthy with ${String(warnings)} warning(s)`);
  } else {
    lines.push('Overall: healthy');
  }

  return lines.join('\n');
}
