#!/usr/bin/env node
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { Command } from 'commander';
import { DEFAULT_TUNNEL_PORT, normalizeTargetName } from '@shiplocal/shared';
import { createTunnelClient } from '@shiplocal/tunnel-client';
import {
  clearConfig,
  getSavedTunnelId,
  resolveApiUrlAsync,
  resolveToken,
  saveConfig,
  updateTunnelConfig,
} from './config.js';
import { postJson } from './api.js';
import { isLocalPortOpen } from './local-port.js';

const program = new Command();

program.name('shiplocal').description('Share localhost with clients in seconds').version('0.1.6');

program
  .command('login')
  .description('Authenticate with ShipLocal Cloud')
  .action(async () => {
    const rl = createInterface({ input, output });
    const apiUrl = await resolveApiUrlAsync();

    try {
      const email = await rl.question('Email: ');
      const password = await rl.question('Password: ');

      const { response, data: rawData } = await postJson(
        '/api/auth/login',
        { email, password },
        apiUrl,
      );
      const data = rawData as { apiToken?: string; error?: string };

      if (!response.ok || !data.apiToken) {
        console.error(`Login failed: ${data.error ?? 'Unknown error'}`);
        process.exit(1);
      }

      await saveConfig({ apiUrl, token: data.apiToken });
      console.log('Logged in successfully.');
      console.log(`Credentials saved to ~/.shiplocal/config.json`);
    } catch (err) {
      console.error(err instanceof Error ? err.message : 'Login failed');
      process.exit(1);
    } finally {
      rl.close();
    }
  });

program
  .command('logout')
  .description('Remove saved credentials')
  .action(async () => {
    await clearConfig();
    console.log('Logged out.');
  });

program
  .argument('[port]', 'Local port to expose', String(DEFAULT_TUNNEL_PORT))
  .option('-p, --password <password>', 'Require a password to open the public URL')
  .option('--project <slug>', 'Project slug for coordinated multi-target URLs')
  .option('--name <target>', 'Target name within project (default: web)', 'web')
  .option('--rewrite-env', 'Suggest or apply .env URL rewrites for tunnel URLs')
  .description('Start a tunnel to your local server')
  .action(
    async (
      portArg: string,
      options: { password?: string; project?: string; name: string; rewriteEnv?: boolean },
    ) => {
      const port = Number.parseInt(portArg, 10);

      if (Number.isNaN(port) || port < 1 || port > 65535) {
        console.error('Error: port must be a number between 1 and 65535');
        process.exit(1);
      }

      const serverUrl = await resolveApiUrlAsync();
      const token = await resolveToken();

      if (!token) {
        console.error('Not authenticated. Run `shiplocal login` first.');
        process.exit(1);
      }

      if (!token.startsWith('sl_')) {
        console.error('Invalid saved token. Run `shiplocal login` again.');
        process.exit(1);
      }

      const projectSlug = options.project?.toLowerCase();
      const targetName = normalizeTargetName(options.name);
      const savedTunnelId =
        projectSlug !== undefined ? await getSavedTunnelId(projectSlug, targetName) : undefined;

      const portOpen = await isLocalPortOpen(port);
      if (!portOpen) {
        console.warn('');
        console.warn(`Warning: nothing is listening on http://localhost:${String(port)}`);
        console.warn('Start your local app first, or pass the port it uses.');
        console.warn('Example: pnpm tunnel 3001  (dashboard in this repo runs on 3001)');
        console.warn('');
      }

      let printed = false;

      const client = createTunnelClient({
        serverUrl,
        localPort: port,
        token,
        password: options.password,
        projectSlug,
        targetName: projectSlug ? targetName : undefined,
        tunnelId: savedTunnelId,
        onRegistered: (info) => {
          if (info.projectSlug && info.targetName) {
            void updateTunnelConfig(
              info.projectSlug,
              info.targetName,
              info.tunnelId,
              info.publicUrl,
            );
          }

          if (!printed) {
            console.log('');
            console.log('🚀 ShipLocal running');
            console.log('');
            console.log(`Local:   http://localhost:${String(port)}`);
            console.log(`Public:  ${info.publicUrl}`);
            if (info.projectSlug) {
              console.log(`Project: ${info.projectSlug} (${info.targetName ?? targetName})`);
            }
            if (info.siblingUrls && info.siblingUrls.length > 0) {
              console.log('');
              console.log('Other targets in this project:');
              for (const sibling of info.siblingUrls) {
                console.log(
                  `  ${sibling.name}: ${sibling.publicUrl} (port ${String(sibling.port)})`,
                );
              }
            }
            if (options.password) {
              console.log(`Password: ${options.password} (share with your client)`);
            }
            console.log('');
            console.log('Share this with your client.');
            console.log('Press Ctrl+C to stop.');
            printed = true;

            if (options.rewriteEnv) {
              void import('./env-rewrite.js').then(({ runEnvRewrite }) =>
                runEnvRewrite({
                  port,
                  publicUrl: info.publicUrl,
                  siblingUrls: info.siblingUrls ?? [],
                  write: true,
                }),
              );
            } else if (projectSlug) {
              void import('./env-rewrite.js').then(({ runEnvRewrite }) =>
                runEnvRewrite({
                  port,
                  publicUrl: info.publicUrl,
                  siblingUrls: info.siblingUrls ?? [],
                  write: false,
                }),
              );
            }
          } else {
            console.log(`Reconnected: ${info.publicUrl}`);
          }
        },
        onReconnecting: (attempt) => {
          console.log(`Reconnecting… (attempt ${String(attempt)})`);
        },
        onTerminated: (message) => {
          console.log('');
          console.log(message);
          console.log('Run shiplocal again to start a new tunnel.');
          console.log('');
        },
      });

      const shutdown = () => {
        void client.disconnect().then(() => {
          process.exit(0);
        });
      };

      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);

      try {
        await client.connect();
      } catch (err) {
        const apiUrl = await resolveApiUrlAsync();
        const message =
          err instanceof Error && err.message.includes('ECONNREFUSED')
            ? [
                `Cannot reach ShipLocal server at ${apiUrl}.`,
                '',
                'Start the API server first:',
                '  pnpm dev',
              ].join('\n')
            : err instanceof Error
              ? err.message
              : String(err);
        console.error(message);
        process.exit(1);
      }
    },
  );

program.parse();
