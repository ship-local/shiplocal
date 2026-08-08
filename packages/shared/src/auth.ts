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

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128).optional(),
  newPassword: z.string().min(8).max(128),
});

export const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(2).max(48).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  hasPassword: boolean;
  isAdmin: boolean;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
  apiToken: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  tunnelCount: number;
  onlineCount: number;
}

export interface TunnelSummary {
  id: string;
  projectId: string;
  projectName: string;
  projectSlug: string;
  name: string;
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
  /** Present when list omits the base64 body to keep payloads small. */
  hasScreenshot: boolean;
  /** Full data URL — only on detail endpoints; list responses keep this null. */
  screenshot: string | null;
  createdAt: string;
}

/** Authenticated account metrics from GET /api/stats (read-only aggregates). */
export interface AccountStats {
  projects: number;
  linksGenerated: number;
  linksLast7Days: number;
  linksLast30Days: number;
  onlineNow: number;
  npm: {
    package: string;
    downloadsLastWeek: number | null;
    downloadsLastMonth: number | null;
    fetchedAt: string | null;
  };
}

/** Platform metrics from GET /api/admin/stats (admin only). */
export interface AdminPlatformStats {
  users: {
    total: number;
    last7Days: number;
    last30Days: number;
  };
  projects: {
    total: number;
    last7Days: number;
    last30Days: number;
  };
  links: {
    total: number;
    last7Days: number;
    last30Days: number;
    onlineNow: number;
  };
  activeAccounts: {
    last7Days: number;
    last30Days: number;
  };
  npm: {
    package: string;
    downloadsLastWeek: number | null;
    downloadsLastMonth: number | null;
    fetchedAt: string | null;
  };
  recentUsers: Array<{
    id: string;
    email: string;
    name: string | null;
    createdAt: string;
  }>;
}
