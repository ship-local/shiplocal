import { WebSocket } from 'ws';
import { TUNNEL_WS_PATH } from '@shiplocal/shared';
import { createTunnelClient } from '@shiplocal/tunnel-client';
import { getJson, timedFetch } from './api.js';
import { resolveApiUrlAsync, resolveToken } from './config.js';
import {
  type DoctorCheck,
  findHmrWebSocketPath,
  findScriptSrcInHtml,
  formatBytes,
  formatCompressionRatio,
  formatDoctorReport,
  formatMs,
  toWebSocketOrigin,
} from './doctor-helpers.js';
import { isLocalPortOpen } from './local-port.js';

export interface DoctorOptions {
  port?: number;
  json?: boolean;
}

export interface DoctorResult {
  apiUrl: string;
  checks: DoctorCheck[];
  metrics: Record<string, string>;
  exitCode: number;
}

function toTunnelWebSocketUrl(serverUrl: string): string {
  const url = new URL(serverUrl);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = TUNNEL_WS_PATH;
  url.search = '';
  url.hash = '';
  return url.toString();
}

async function measureWebSocketHandshake(serverUrl: string): Promise<number> {
  const wsUrl = toTunnelWebSocketUrl(serverUrl);
  const started = performance.now();

  return new Promise((resolve, reject) => {
    const socket = new WebSocket(wsUrl, { maxPayload: 64 * 1024 * 1024 });
    const timer = setTimeout(() => {
      socket.terminate();
      reject(new Error('WebSocket handshake timed out'));
    }, 10_000);

    socket.once('open', () => {
      clearTimeout(timer);
      const ms = performance.now() - started;
      socket.close();
      resolve(ms);
    });

    socket.once('error', (err: Error) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

async function fetchTransfer(
  url: string,
  init?: RequestInit,
): Promise<{ ms: number; bytes: number; body: Buffer; encoding?: string }> {
  const { response, ms } = await timedFetch(url, init);
  const body = Buffer.from(await response.arrayBuffer());

  if (!response.ok) {
    throw new Error(`HTTP ${String(response.status)} for ${url}`);
  }

  return {
    ms,
    bytes: body.length,
    body,
    encoding: response.headers.get('content-encoding') ?? undefined,
  };
}

async function probeHmrWebSocket(publicUrl: string, html: string): Promise<DoctorCheck> {
  const path = findHmrWebSocketPath(html);
  if (!path) {
    return {
      name: 'HMR WebSocket',
      status: 'warn',
      message: 'No dev bundler HMR marker found (production build or static app)',
    };
  }

  const wsUrl = `${toWebSocketOrigin(publicUrl)}${path}`;
  const started = performance.now();

  return new Promise((resolve) => {
    const socket = new WebSocket(wsUrl, { maxPayload: 64 * 1024 * 1024 });
    const timer = setTimeout(() => {
      socket.terminate();
      resolve({
        name: 'HMR WebSocket',
        status: 'fail',
        message: `Timed out connecting to ${path}`,
      });
    }, 8_000);

    socket.once('open', () => {
      clearTimeout(timer);
      socket.close();
      resolve({
        name: 'HMR WebSocket',
        status: 'ok',
        message: `Connected to ${path}`,
        ms: performance.now() - started,
      });
    });

    socket.once('error', () => {
      clearTimeout(timer);
      resolve({
        name: 'HMR WebSocket',
        status: 'fail',
        message: `Could not connect to ${path}`,
        ms: performance.now() - started,
      });
    });
  });
}

async function benchmarkThroughTunnel(
  serverUrl: string,
  token: string,
  port: number,
  checks: DoctorCheck[],
  metrics: Record<string, string>,
): Promise<void> {
  const started = performance.now();
  let publicUrl = '';

  const client = createTunnelClient({
    serverUrl,
    localPort: port,
    token,
    onRegistered: (info) => {
      publicUrl = info.publicUrl;
    },
  });

  try {
    await client.connect();
    if (!publicUrl) {
      checks.push({
        name: 'Tunnel benchmark',
        status: 'fail',
        message: 'Could not register a temporary tunnel',
      });
      return;
    }

    metrics['Tunnel registration'] = formatMs(performance.now() - started);

    const localHtml = await fetchTransfer(`http://127.0.0.1:${String(port)}/`);
    metrics['Local HTML'] = `${formatMs(localHtml.ms)}, ${formatBytes(localHtml.bytes)}`;

    const tunnelHtml = await fetchTransfer(publicUrl);
    const html = tunnelHtml.body.toString('utf8');
    metrics['Tunnel HTML'] = `${formatMs(tunnelHtml.ms)}, ${formatBytes(tunnelHtml.bytes)}`;

    const slowdown =
      localHtml.ms > 0 ? Math.round((tunnelHtml.ms / localHtml.ms) * 10) / 10 : undefined;
    if (slowdown !== undefined) {
      metrics['HTML slowdown vs local'] = `${String(slowdown)}x`;
    }

    const scriptPath = findScriptSrcInHtml(html);
    if (scriptPath) {
      const localScriptUrl = new URL(scriptPath, `http://127.0.0.1:${String(port)}`).href;
      const tunnelScriptUrl = new URL(scriptPath, publicUrl).href;

      const localJs = await fetchTransfer(localScriptUrl);
      const tunnelJs = await fetchTransfer(tunnelScriptUrl);

      metrics['Local JS sample'] = `${formatMs(localJs.ms)}, ${formatBytes(localJs.bytes)}`;
      const tunnelJsLabel = tunnelJs.encoding
        ? `${formatMs(tunnelJs.ms)}, ${formatBytes(tunnelJs.bytes)} (${tunnelJs.encoding})`
        : `${formatMs(tunnelJs.ms)}, ${formatBytes(tunnelJs.bytes)}`;
      metrics['Tunnel JS sample'] = tunnelJsLabel;

      const compression = formatCompressionRatio(localJs.bytes, tunnelJs.bytes);
      if (compression) {
        metrics['JS wire savings'] = compression;
      }

      const jsSlowdown =
        localJs.ms > 0 ? Math.round((tunnelJs.ms / localJs.ms) * 10) / 10 : undefined;
      if (jsSlowdown !== undefined) {
        metrics['JS slowdown vs local'] = `${String(jsSlowdown)}x`;
      }

      if (tunnelJs.ms > 3000) {
        checks.push({
          name: 'JS transfer',
          status: 'warn',
          message: `Sample JS took ${formatMs(tunnelJs.ms)} through the tunnel`,
          ms: tunnelJs.ms,
        });
      } else {
        checks.push({
          name: 'JS transfer',
          status: 'ok',
          message: `Sample JS transferred in ${formatMs(tunnelJs.ms)}`,
          ms: tunnelJs.ms,
        });
      }
    } else {
      checks.push({
        name: 'JS transfer',
        status: 'warn',
        message: 'No external script tag found to benchmark',
      });
    }

    checks.push(await probeHmrWebSocket(publicUrl, html));
  } catch (err) {
    checks.push({
      name: 'Tunnel benchmark',
      status: 'fail',
      message: err instanceof Error ? err.message : 'Benchmark failed',
    });
  } finally {
    await client.disconnect();
  }
}

export async function runDoctor(options: DoctorOptions = {}): Promise<DoctorResult> {
  const apiUrl = await resolveApiUrlAsync();
  const token = await resolveToken();
  const port = options.port ?? 3000;
  const checks: DoctorCheck[] = [];
  const metrics: Record<string, string> = { 'Benchmark port': String(port) };

  if (!token) {
    checks.push({
      name: 'Auth',
      status: 'fail',
      message: 'Not logged in — run `shiplocal login`',
    });
  } else if (!token.startsWith('sl_')) {
    checks.push({
      name: 'Auth',
      status: 'fail',
      message: 'Invalid saved token — run `shiplocal login` again',
    });
  }

  try {
    const { response, ms } = await timedFetch(`${apiUrl}/health`);
    const body = (await response.json().catch(() => ({}))) as {
      status?: string;
      database?: string;
    };

    if (response.ok && body.status === 'ok') {
      checks.push({
        name: 'API health',
        status: 'ok',
        message: 'Server reachable',
        ms,
      });
    } else {
      checks.push({
        name: 'API health',
        status: body.status === 'degraded' ? 'warn' : 'fail',
        message:
          body.database === 'disconnected' ? 'Server up but database disconnected' : 'Unhealthy',
        ms,
      });
    }
  } catch (err) {
    checks.push({
      name: 'API health',
      status: 'fail',
      message: err instanceof Error ? err.message : 'Server unreachable',
    });
  }

  if (token?.startsWith('sl_')) {
    try {
      const { response, ms } = await getJson('/api/tunnels', { apiUrl, token });
      if (response.ok) {
        checks.push({
          name: 'Auth',
          status: 'ok',
          message: 'API token valid',
          ms,
        });
      } else {
        checks.push({
          name: 'Auth',
          status: 'fail',
          message: `API token rejected (HTTP ${String(response.status)})`,
          ms,
        });
      }
    } catch (err) {
      checks.push({
        name: 'Auth',
        status: 'fail',
        message: err instanceof Error ? err.message : 'Auth check failed',
      });
    }
  }

  try {
    const wsMs = await measureWebSocketHandshake(apiUrl);
    checks.push({
      name: 'WebSocket handshake',
      status: 'ok',
      message: 'Tunnel socket reachable',
      ms: wsMs,
    });
    metrics['WebSocket RTT'] = formatMs(wsMs);
  } catch (err) {
    checks.push({
      name: 'WebSocket handshake',
      status: 'fail',
      message: err instanceof Error ? err.message : 'WebSocket unreachable',
    });
  }

  const portOpen = await isLocalPortOpen(port);
  if (portOpen) {
    checks.push({
      name: `Local port ${String(port)}`,
      status: 'ok',
      message: 'App is listening',
    });
  } else {
    checks.push({
      name: `Local port ${String(port)}`,
      status: 'warn',
      message: 'Nothing listening — start your app to benchmark tunnel transfer',
    });
  }

  if (portOpen && token?.startsWith('sl_')) {
    await benchmarkThroughTunnel(apiUrl, token, port, checks, metrics);
  }

  const exitCode = checks.some((check) => check.status === 'fail') ? 1 : 0;

  return { apiUrl, checks, metrics, exitCode };
}

export function printDoctorResult(result: DoctorResult, json: boolean): void {
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(formatDoctorReport(result.apiUrl, result.checks, result.metrics));
}
