import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

export interface CliConfig {
  apiUrl: string;
  token: string;
}

const CONFIG_DIR = join(homedir(), '.shiplocal');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

export async function loadConfig(): Promise<CliConfig | null> {
  try {
    const raw = await readFile(CONFIG_FILE, 'utf8');
    const parsed = JSON.parse(raw) as CliConfig;
    if (!parsed.apiUrl || !parsed.token) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveConfig(config: CliConfig): Promise<void> {
  await mkdir(CONFIG_DIR, { recursive: true });
  await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
}

export async function clearConfig(): Promise<void> {
  try {
    await writeFile(CONFIG_FILE, '{}', 'utf8');
  } catch {
    /* config may not exist */
  }
}

export function resolveApiUrl(): string {
  return process.env['SHIPLOCAL_API_URL'] ?? 'http://localhost:4000';
}

export async function resolveToken(): Promise<string | undefined> {
  if (process.env['SHIPLOCAL_TOKEN']) return process.env['SHIPLOCAL_TOKEN'];
  const config = await loadConfig();
  return config?.token;
}
