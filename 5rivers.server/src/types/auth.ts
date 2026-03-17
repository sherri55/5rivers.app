/** Set on req.user after JWT auth. All API calls are scoped to organizationId (or X-Organization-Id for super-admin). */
export interface AuthUser {
  userId: string;
  organizationId: string;
  role: string;
  email: string;
  /** When true, client may send X-Organization-Id header to act as that org. */
  isSuperAdmin?: boolean;
}

export const ROLES = ['OWNER', 'ADMIN', 'DISPATCHER', 'MEMBER', 'VIEWER'] as const;
export type Role = (typeof ROLES)[number];
