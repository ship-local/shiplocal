import { z } from 'zod';

export const TUNNEL_WS_PATH = '/tunnel';
export const TUNNEL_PATH_PREFIX = '/t/';

export const HEARTBEAT_INTERVAL_MS = 30_000;
export const HEARTBEAT_TIMEOUT_MS = 90_000;
export const DEFAULT_TUNNEL_EXPIRY_MS = 2 * 60 * 60 * 1000; // 2 hours
export const REQUEST_TIMEOUT_MS = 30_000;
export const MAX_BODY_BYTES = 10 * 1024 * 1024; // 10 MB

const headersSchema = z.record(z.union([z.string(), z.array(z.string())]));

export const registerMessageSchema = z.object({
  type: z.literal('register'),
  localPort: z.number().int().min(1).max(65535),
  token: z.string().optional(),
  projectId: z.string().optional(),
  password: z.string().min(4).max(128).optional(),
});

export const registeredMessageSchema = z.object({
  type: z.literal('registered'),
  tunnelId: z.string(),
  subdomain: z.string(),
  publicUrl: z.string().url(),
  expiresAt: z.string(),
});

export const pingMessageSchema = z.object({ type: z.literal('ping') });
export const pongMessageSchema = z.object({ type: z.literal('pong') });

export const tunnelRequestMessageSchema = z.object({
  type: z.literal('request'),
  id: z.string(),
  method: z.string(),
  path: z.string(),
  query: z.string(),
  headers: headersSchema,
  body: z.string().optional(),
});

export const tunnelResponseMessageSchema = z.object({
  type: z.literal('response'),
  id: z.string(),
  status: z.number().int(),
  headers: headersSchema,
  body: z.string().optional(),
});

export const errorMessageSchema = z.object({
  type: z.literal('error'),
  message: z.string(),
});

export const tunnelMessageSchema = z.discriminatedUnion('type', [
  registerMessageSchema,
  registeredMessageSchema,
  pingMessageSchema,
  pongMessageSchema,
  tunnelRequestMessageSchema,
  tunnelResponseMessageSchema,
  errorMessageSchema,
]);

export type RegisterMessage = z.infer<typeof registerMessageSchema>;
export type RegisteredMessage = z.infer<typeof registeredMessageSchema>;
export type PingMessage = z.infer<typeof pingMessageSchema>;
export type PongMessage = z.infer<typeof pongMessageSchema>;
export type TunnelRequestMessage = z.infer<typeof tunnelRequestMessageSchema>;
export type TunnelResponseMessage = z.infer<typeof tunnelResponseMessageSchema>;
export type ErrorMessage = z.infer<typeof errorMessageSchema>;
export type TunnelMessage = z.infer<typeof tunnelMessageSchema>;

export function parseTunnelMessage(data: unknown): TunnelMessage {
  const parsed: unknown = typeof data === 'string' ? JSON.parse(data) : data;
  return tunnelMessageSchema.parse(parsed);
}

export function encodeBody(buffer: Buffer): string {
  return buffer.toString('base64');
}

export function decodeBody(encoded: string | undefined): Buffer {
  if (!encoded) return Buffer.alloc(0);
  return Buffer.from(encoded, 'base64');
}
