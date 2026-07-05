import { z } from 'zod';

export const TUNNEL_WS_PATH = '/tunnel';
export const TUNNEL_PATH_PREFIX = '/t/';

export const HEARTBEAT_INTERVAL_MS = 30_000;
export const HEARTBEAT_TIMEOUT_MS = 90_000;
export const DEFAULT_TUNNEL_EXPIRY_MS = 2 * 60 * 60 * 1000; // 2 hours
export const REQUEST_TIMEOUT_MS = 120_000;
export const MAX_BODY_BYTES = 50 * 1024 * 1024; // 50 MB

const headersSchema = z.record(z.union([z.string(), z.array(z.string())]));

export const siblingTunnelSchema = z.object({
  name: z.string(),
  publicUrl: z.string().url(),
  port: z.number().int(),
});

export const registerMessageSchema = z.object({
  type: z.literal('register'),
  localPort: z.number().int().min(1).max(65535),
  token: z.string().optional(),
  projectId: z.string().optional(),
  projectSlug: z.string().optional(),
  targetName: z.string().optional(),
  tunnelId: z.string().optional(),
  password: z.string().min(4).max(128).optional(),
  feedbackOverlay: z.boolean().optional(),
});

export const registeredMessageSchema = z.object({
  type: z.literal('registered'),
  tunnelId: z.string(),
  subdomain: z.string(),
  publicUrl: z.string().url(),
  expiresAt: z.string(),
  projectSlug: z.string().optional(),
  targetName: z.string().optional(),
  siblingUrls: z.array(siblingTunnelSchema).optional(),
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
  bodyEncoding: z.literal('binary').optional(),
});

export const tunnelResponseMessageSchema = z.object({
  type: z.literal('response'),
  id: z.string(),
  status: z.number().int(),
  headers: headersSchema,
  body: z.string().optional(),
  bodyEncoding: z.literal('binary').optional(),
});

export const tunnelWebSocketOpenMessageSchema = z.object({
  type: z.literal('ws-open'),
  id: z.string(),
  path: z.string(),
  query: z.string(),
  headers: headersSchema,
});

export const tunnelWebSocketMessageSchema = z.object({
  type: z.literal('ws-message'),
  id: z.string(),
  body: z.string().optional(),
  bodyEncoding: z.literal('binary').optional(),
});

export const tunnelWebSocketCloseMessageSchema = z.object({
  type: z.literal('ws-close'),
  id: z.string(),
  code: z.number().int().optional(),
  reason: z.string().optional(),
});

export const errorMessageSchema = z.object({
  type: z.literal('error'),
  message: z.string(),
});

export const terminatedMessageSchema = z.object({
  type: z.literal('terminated'),
  message: z.string(),
});

export const tunnelMessageSchema = z.discriminatedUnion('type', [
  registerMessageSchema,
  registeredMessageSchema,
  pingMessageSchema,
  pongMessageSchema,
  tunnelRequestMessageSchema,
  tunnelResponseMessageSchema,
  tunnelWebSocketOpenMessageSchema,
  tunnelWebSocketMessageSchema,
  tunnelWebSocketCloseMessageSchema,
  errorMessageSchema,
  terminatedMessageSchema,
]);

export type SiblingTunnel = z.infer<typeof siblingTunnelSchema>;
export type RegisterMessage = z.infer<typeof registerMessageSchema>;
export type RegisteredMessage = z.infer<typeof registeredMessageSchema>;
export type PingMessage = z.infer<typeof pingMessageSchema>;
export type PongMessage = z.infer<typeof pongMessageSchema>;
export type TunnelRequestMessage = z.infer<typeof tunnelRequestMessageSchema>;
export type TunnelResponseMessage = z.infer<typeof tunnelResponseMessageSchema>;
export type TunnelWebSocketOpenMessage = z.infer<typeof tunnelWebSocketOpenMessageSchema>;
export type TunnelWebSocketMessage = z.infer<typeof tunnelWebSocketMessageSchema>;
export type TunnelWebSocketCloseMessage = z.infer<typeof tunnelWebSocketCloseMessageSchema>;
export type ErrorMessage = z.infer<typeof errorMessageSchema>;
export type TerminatedMessage = z.infer<typeof terminatedMessageSchema>;
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
