import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(100).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128),
});

export const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
  apiToken: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  createdAt: string;
  tunnelCount: number;
  onlineCount: number;
}

export interface TunnelSummary {
  id: string;
  projectId: string;
  projectName: string;
  subdomain: string;
  port: number;
  status: 'ONLINE' | 'OFFLINE' | 'EXPIRED';
  publicUrl: string | null;
  createdAt: string;
  expiresAt: string | null;
  isLive: boolean;
  passwordProtected: boolean;
}

export interface CommentSummary {
  id: string;
  tunnelId: string;
  projectId: string;
  projectName: string;
  subdomain: string;
  page: string;
  selector: string | null;
  x: number | null;
  y: number | null;
  message: string;
  screenshot: string | null;
  createdAt: string;
}
