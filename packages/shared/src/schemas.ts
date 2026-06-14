import { z } from 'zod';

export const createCommentSchema = z.object({
  page: z.string().min(1),
  selector: z.string().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  message: z.string().min(1).max(5000),
  screenshot: z.string().url().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;

export const healthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  database: z.enum(['connected', 'disconnected']),
  timestamp: z.string(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
