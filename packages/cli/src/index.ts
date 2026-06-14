#!/usr/bin/env node
import { Command } from 'commander';
import { DEFAULT_TUNNEL_PORT } from '@shiplocal/shared';
import { createTunnelClient } from '@shiplocal/tunnel-client';

const program = new Command();

program.name('shiplocal').description('Share localhost with clients in seconds').version('0.0.1');

program
  .argument('[port]', 'Local port to expose', String(DEFAULT_TUNNEL_PORT))
  .description('Start a tunnel to your local server')
  .action(async (portArg: string) => {
    const port = Number.parseInt(portArg, 10);

    if (Number.isNaN(port) || port < 1 || port > 65535) {
      console.error('Error: port must be a number between 1 and 65535');
      process.exit(1);
    }

    const serverUrl = process.env['SHIPLOCAL_API_URL'] ?? 'http://localhost:4000';

    const client = createTunnelClient({
      serverUrl,
      localPort: port,
      token: process.env['SHIPLOCAL_TOKEN'],
      onRegistered: (info) => {
        if (process.stdout.isTTY) {
          console.log('');
          console.log('🚀 ShipLocal running');
          console.log('');
          console.log(`Local:   http://localhost:${String(port)}`);
          console.log(`Public:  ${info.publicUrl}`);
          console.log('');
          console.log('Share this with your client.');
          console.log('Press Ctrl+C to stop.');
        } else {
          console.log(info.publicUrl);
        }
      },
      onReconnecting: (attempt) => {
        console.log(`Reconnecting… (attempt ${String(attempt)})`);
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
      console.error('Failed to connect:', err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program.parse();
