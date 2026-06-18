import net from 'node:net';

const LOOPBACK_HOSTS = ['127.0.0.1', '::1'] as const;

function canConnect(host: string, port: number, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host });

    const finish = (open: boolean) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(open);
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => {
      finish(true);
    });
    socket.once('timeout', () => {
      finish(false);
    });
    socket.once('error', () => {
      finish(false);
    });
  });
}

export async function isLocalPortOpen(port: number, timeoutMs = 2000): Promise<boolean> {
  for (const host of LOOPBACK_HOSTS) {
    if (await canConnect(host, port, timeoutMs)) {
      return true;
    }
  }

  return false;
}
