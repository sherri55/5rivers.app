import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { query } from '../db/connection';
import type { AuthUser } from '../types/auth';
import { unauthorized, forbidden } from '../middleware/errorHandler';

const SALT_ROUNDS = config.bcrypt.rounds;

export interface LoginInput {
  email: string;
  password: string;
  organizationSlug: string;
}

export interface LoginResult {
  token: string;
  user: AuthUser;
  expiresIn: string;
}

/** Find user by email and verify membership in org by slug; verify password. Super-admin can use any org slug. */
export async function login(input: LoginInput): Promise<LoginResult> {
  const email = input.email.trim().toLowerCase();
  const slug = input.organizationSlug.trim();
  const rows = await query<Array<{ id: string; email: string; passwordHash: string }>>(
    `SELECT id, email, passwordHash FROM Users WHERE email = @email`,
    { params: { email } }
  );
  if (!Array.isArray(rows) || rows.length === 0) {
    throw unauthorized('Invalid email or password');
  }
  const userRow = rows[0];
  const valid = await bcrypt.compare(input.password, userRow.passwordHash);
  if (!valid) {
    throw unauthorized('Invalid email or password');
  }

  const isSuperAdmin = !!config.superAdminEmail && email === config.superAdminEmail;
  let organizationId: string;
  let role: string;

  if (isSuperAdmin) {
    const orgRows = await query<Array<{ id: string }>>(
      `SELECT id FROM Organizations WHERE slug = @slug`,
      { params: { slug } }
    );
    if (!Array.isArray(orgRows) || orgRows.length === 0) {
      throw forbidden('Organization not found');
    }
    organizationId = orgRows[0].id;
    role = 'OWNER';
  } else {
    const memberRows = await query<Array<{ organizationId: string; role: string }>>(
      `SELECT om.organizationId, om.role
       FROM OrganizationMember om
       INNER JOIN Organizations o ON o.id = om.organizationId
       WHERE om.userId = @userId AND o.slug = @slug`,
      { params: { userId: userRow.id, slug } }
    );
    if (!Array.isArray(memberRows) || memberRows.length === 0) {
      throw forbidden('You do not have access to this organization');
    }
    organizationId = memberRows[0].organizationId;
    role = memberRows[0].role;
  }

  const payload: AuthUser = {
    userId: userRow.id,
    organizationId,
    role,
    email: userRow.email,
    ...(isSuperAdmin && { isSuperAdmin: true }),
  };

  if (config.isProduction && (!config.jwt.secret || config.jwt.secret.includes('change-in-production'))) {
    throw new Error('JWT_SECRET must be set in production');
  }

  const token = jwt.sign(
    payload,
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn } as jwt.SignOptions
  );

  return {
    token,
    user: payload,
    expiresIn: config.jwt.expiresIn,
  };
}

/** Verify JWT and return payload; returns null if invalid. */
export function verifyToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as AuthUser;
    return decoded;
  } catch {
    return null;
  }
}

/** Hash password (for seeding or user creation). */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}
