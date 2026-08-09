import type { AuthUser as SharedAuthUser } from '@shiplocal/shared';

/** Extend shared AuthUser so older shared builds without isAdmin still typecheck. */
export type AuthUser = SharedAuthUser & {
  isAdmin?: boolean;
};

export function isAdminUser(user: AuthUser | null | undefined): boolean {
  return Boolean(user?.isAdmin);
}
