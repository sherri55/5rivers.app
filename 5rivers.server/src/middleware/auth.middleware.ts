import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/auth.service';
import { unauthorized, forbidden } from './errorHandler';
import type { Role, AuthUser } from '../types/auth';
import { query } from '../db/connection';
import { config } from '../config';

function getBearerToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.slice(7).trim() || null;
}

/** Check if the token matches the static agent API key. Returns AuthUser or null. */
function checkAgentApiKey(token: string): AuthUser | null {
  const { apiKey, userId, organizationId, email, role } = config.agent;
  if (!apiKey || token !== apiKey) return null;
  if (!userId || !organizationId) return null;
  return { userId, organizationId, email, role, isSuperAdmin: false };
}

/** Require valid JWT or static API key; set req.user. Super-admin may send X-Organization-Id to act as that org. */
export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = getBearerToken(req);
  if (!token) {
    next(unauthorized('Missing or invalid authorization'));
    return;
  }

  // Try static agent API key first (no expiry)
  const agentUser = checkAgentApiKey(token);
  if (agentUser) {
    req.user = agentUser;
    next();
    return;
  }

  // Fall back to JWT verification
  const user = verifyToken(token);
  if (!user) {
    next(unauthorized('Invalid or expired token'));
    return;
  }
  req.user = user;

  const headerOrgId = req.headers['x-organization-id'] as string | undefined;
  if (user.isSuperAdmin && headerOrgId?.trim()) {
    const rows = await query<Array<{ id: string }>>(
      `SELECT id FROM Organizations WHERE id = @id`,
      { params: { id: headerOrgId.trim() } }
    );
    if (Array.isArray(rows) && rows.length > 0) {
      req.user = { ...user, organizationId: rows[0].id };
    }
    // If org not found, keep original JWT org (no error)
  }

  next();
}

/** Require at least one of the given roles. Use after requireAuth. */
export function requireRole(...allowed: Role[]) {
  const set = new Set(allowed);
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(unauthorized());
      return;
    }
    if (!set.has(req.user.role as Role)) {
      next(forbidden('Insufficient permissions'));
      return;
    }
    next();
  };
}
