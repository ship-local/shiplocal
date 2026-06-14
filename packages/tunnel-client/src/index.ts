export interface TunnelClientOptions {
  serverUrl: string;
  localPort: number;
  token?: string;
}

export interface TunnelClient {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
}

/**
 * WebSocket tunnel client — implemented in Phase 1.
 */
export function createTunnelClient(options: TunnelClientOptions): TunnelClient {
  void options;

  return {
    connect() {
      return Promise.reject(new Error('Tunnel client not implemented yet (Phase 1)'));
    },
    async disconnect() {
      /* no-op until Phase 1 */
    },
    isConnected() {
      return false;
    },
  };
}
