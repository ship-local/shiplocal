import { mkdirSync, rmSync } from 'node:fs';
import * as esbuild from 'esbuild';

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist', { recursive: true });

await esbuild.build({
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  external: ['ws', 'commander'],
  sourcemap: true,
});

console.log('Built dist/index.js');
