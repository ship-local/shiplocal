#!/usr/bin/env node
import { Command } from 'commander';
import { DEFAULT_TUNNEL_PORT } from '@shiplocal/shared';

const program = new Command();

program.name('shiplocal').description('Share localhost with clients in seconds').version('0.0.1');

program
  .argument('[port]', 'Local port to expose', String(DEFAULT_TUNNEL_PORT))
  .description('Start a tunnel to your local server')
  .action((portArg: string) => {
    const port = Number.parseInt(portArg, 10);

    if (Number.isNaN(port) || port < 1 || port > 65535) {
      console.error('Error: port must be a number between 1 and 65535');
      process.exit(1);
    }

    const serverUrl = process.env['SHIPLOCAL_API_URL'] ?? 'http://localhost:4000';

    console.log('ShipLocal CLI v0.0.1');
    console.log(`Local port: ${String(port)}`);
    console.log(`Server: ${serverUrl}`);
    console.log('');
    console.log('Tunnel engine ships in Phase 1.');
  });

program.parse();
