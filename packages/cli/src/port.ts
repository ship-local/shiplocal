import { DEFAULT_TUNNEL_PORT } from '@shiplocal/shared';

export function resolveCommandPort(portArg?: string, optionPort?: string): number {
  const raw = portArg ?? optionPort ?? String(DEFAULT_TUNNEL_PORT);
  const port = Number.parseInt(raw, 10);

  if (Number.isNaN(port) || port < 1 || port > 65535) {
    throw new Error('Port must be a number between 1 and 65535');
  }

  return port;
}
