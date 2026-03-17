import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { config } from '../config';

const SALT_ROUNDS = config.security.bcryptRounds;

export interface TokenPayload {
  sub: string;
  username: string;
  iat?: number;
  exp?: number;
}

/**
 * Validate admin credentials. Credentials are read from env.
 */
export async function validateCredentials(
  username: string,
  password: string
): Promise<boolean> {
  const envUsername = process.env.ADMIN_USERNAME || 'admin';
  const envPasswordHash = process.env.ADMIN_PASSWORD_HASH;

  if (envPasswordHash) {
    return (
      username === envUsername && (await bcrypt.compare(password, envPasswordHash))
    );
  }

  const envPassword = process.env.ADMIN_PASSWORD || 'changeme';
  return username === envUsername && password === envPassword;
}

/**
 * Generate JWT for authenticated admin
 */
export function generateToken(username: string): string {
  const secret = config.security.jwtSecret;
  const isProduction = config.server.environment === 'production';
  if (isProduction && (!secret || secret === 'default-secret-change-in-production')) {
    throw new Error('JWT_SECRET must be set in production');
  }

  return jwt.sign(
    { sub: username, username },
    secret,
    { expiresIn: '24h' }
  );
}

/**
 * Verify and decode JWT
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    const secret = config.security.jwtSecret;
    const decoded = jwt.verify(token, secret) as TokenPayload;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Hash password for storing in ADMIN_PASSWORD_HASH env (one-time setup)
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}
