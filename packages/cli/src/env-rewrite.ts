import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { SiblingTunnel } from '@shiplocal/shared';

const ENV_FILES = ['.env', '.env.local', '.env.development'];

const ENV_KEY_PATTERN = /^(NEXT_PUBLIC_|VITE_|REACT_APP_|PUBLIC_|API_|BACKEND_|FRONTEND_)/;

export interface EnvRewriteOptions {
  port: number;
  publicUrl: string;
  siblingUrls: SiblingTunnel[];
  write: boolean;
}

interface EnvReplacement {
  file: string;
  key: string;
  from: string;
  to: string;
}

function localhostPattern(port: number): RegExp {
  return new RegExp(`https?://(?:127\\.0\\.0\\.1|localhost):${String(port)}(?:/|$)`, 'i');
}

function findReplacements(
  file: string,
  content: string,
  port: number,
  publicUrl: string,
  siblingUrls: SiblingTunnel[],
): EnvReplacement[] {
  const replacements: EnvReplacement[] = [];
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed
      .slice(eqIndex + 1)
      .trim()
      .replace(/^["']|["']$/g, '');

    if (!ENV_KEY_PATTERN.test(key)) continue;

    if (localhostPattern(port).test(value)) {
      replacements.push({ file, key, from: value, to: publicUrl });
      continue;
    }

    for (const sibling of siblingUrls) {
      if (localhostPattern(sibling.port).test(value)) {
        replacements.push({ file, key, from: value, to: sibling.publicUrl });
        break;
      }
    }
  }

  return replacements;
}

function applyReplacements(content: string, replacements: EnvReplacement[]): string {
  let updated = content;

  for (const replacement of replacements) {
    const pattern = new RegExp(
      `^(${replacement.key}\\s*=\\s*["']?)${replacement.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(["']?)`,
      'm',
    );
    updated = updated.replace(pattern, `$1${replacement.to}$2`);
  }

  return updated;
}

export async function runEnvRewrite(options: EnvRewriteOptions): Promise<void> {
  const allReplacements: EnvReplacement[] = [];

  for (const fileName of ENV_FILES) {
    const filePath = join(process.cwd(), fileName);
    try {
      const content = await readFile(filePath, 'utf8');
      allReplacements.push(
        ...findReplacements(
          fileName,
          content,
          options.port,
          options.publicUrl,
          options.siblingUrls,
        ),
      );
    } catch {
      // file may not exist
    }
  }

  if (allReplacements.length === 0) {
    if (options.write) {
      console.log('No matching localhost env vars found to rewrite.');
    }
    return;
  }

  console.log('');
  console.log(options.write ? 'Applying .env updates:' : 'Suggested .env updates:');

  for (const replacement of allReplacements) {
    console.log(`  ${replacement.file}: ${replacement.key}`);
    console.log(`    ${replacement.from}`);
    console.log(`    → ${replacement.to}`);
  }

  if (!options.write) {
    console.log('');
    console.log('Run with --rewrite-env to apply these changes.');
    return;
  }

  const byFile = new Map<string, EnvReplacement[]>();
  for (const replacement of allReplacements) {
    const list = byFile.get(replacement.file) ?? [];
    list.push(replacement);
    byFile.set(replacement.file, list);
  }

  for (const [fileName, replacements] of byFile) {
    const filePath = join(process.cwd(), fileName);
    const content = await readFile(filePath, 'utf8');
    const backupPath = `${filePath}.shiplocal.bak`;
    await copyFile(filePath, backupPath);
    const updated = applyReplacements(content, replacements);
    await writeFile(filePath, updated, 'utf8');
    console.log(`  Updated ${fileName} (backup: ${fileName}.shiplocal.bak)`);
  }

  console.log('');
}
