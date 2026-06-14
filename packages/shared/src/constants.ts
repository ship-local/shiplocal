export const TUNNEL_STATUS = {
  ONLINE: 'ONLINE',
  OFFLINE: 'OFFLINE',
  EXPIRED: 'EXPIRED',
} as const;

export type TunnelStatus = (typeof TUNNEL_STATUS)[keyof typeof TUNNEL_STATUS];

export const DEFAULT_TUNNEL_PORT = 3000;
export const DEFAULT_SERVER_PORT = 4000;
export const DEFAULT_DASHBOARD_PORT = 3001;
export const DEFAULT_TUNNEL_DOMAIN = 'localhost';
export const DEFAULT_TUNNEL_EXPIRY_HOURS = 2;
