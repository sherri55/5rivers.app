/**
 * Unit tests for auth primitives in `src/services/auth.service.ts`.
 * Exercises:
 *   • hashPassword — bcrypt round-trip, salt randomization, length sanity
 *   • verifyToken  — JWT round-trip via the production secret
 *
 * Login flow (DB-touching) is covered in api.test.ts and the dedicated
 * org-isolation tests; this file only validates the cryptographic primitives.
 */

import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { hashPassword, verifyToken } from '../../services/auth.service';
import { config } from '../../config';

describe('hashPassword', () => {
  it('produces a bcrypt-shaped hash', async () => {
    const hash = await hashPassword('Hunter2!');
    // bcrypt hashes are 60 chars and start with $2a$ / $2b$ / $2y$
    expect(hash).toMatch(/^\$2[aby]\$/);
    expect(hash.length).toBe(60);
  });

  it('verifies the correct password', async () => {
    const hash = await hashPassword('Hunter2!');
    expect(await bcrypt.compare('Hunter2!', hash)).toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('Hunter2!');
    expect(await bcrypt.compare('hunter2!', hash)).toBe(false);
    expect(await bcrypt.compare('Hunter2', hash)).toBe(false);
    expect(await bcrypt.compare('', hash)).toBe(false);
  });

  it('produces different hashes for the same password (salt randomized)', async () => {
    const a = await hashPassword('SamePassword!');
    const b = await hashPassword('SamePassword!');
    expect(a).not.toBe(b);
    // But both still verify
    expect(await bcrypt.compare('SamePassword!', a)).toBe(true);
    expect(await bcrypt.compare('SamePassword!', b)).toBe(true);
  });

  it('handles unicode and long passwords without crashing', async () => {
    const unicode = '🔐パスワード!';
    const long = 'a'.repeat(72); // bcrypt's max input length
    expect(await bcrypt.compare(unicode, await hashPassword(unicode))).toBe(true);
    expect(await bcrypt.compare(long, await hashPassword(long))).toBe(true);
  });
});

describe('verifyToken', () => {
  // A minimal AuthUser-shaped payload. The login() function adds more
  // fields; verifyToken's contract is just "round-trip the JWT body".
  const payload = { userId: 'u1', email: 'a@b.com', organizationId: 'o1', role: 'OWNER' as const };

  it('round-trips a freshly signed token', () => {
    const token = jwt.sign(payload, config.jwt.secret, { expiresIn: '1h' } as jwt.SignOptions);
    const decoded = verifyToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded!.userId).toBe('u1');
    expect(decoded!.email).toBe('a@b.com');
    expect(decoded!.organizationId).toBe('o1');
  });

  it('returns null for a tampered token', () => {
    const token = jwt.sign(payload, config.jwt.secret, { expiresIn: '1h' } as jwt.SignOptions);
    // Flip the last character — invalidates the signature.
    const tampered = token.slice(0, -1) + (token.slice(-1) === 'a' ? 'b' : 'a');
    expect(verifyToken(tampered)).toBeNull();
  });

  it('returns null for a token signed with a different secret', () => {
    const token = jwt.sign(payload, 'wrong-secret-completely-different', { expiresIn: '1h' } as jwt.SignOptions);
    expect(verifyToken(token)).toBeNull();
  });

  it('returns null for garbage input', () => {
    expect(verifyToken('not-a-token')).toBeNull();
    expect(verifyToken('')).toBeNull();
    expect(verifyToken('aaa.bbb.ccc')).toBeNull();
  });

  it('returns null for an expired token', () => {
    // Sign with a 1ms expiry; verify after a small delay.
    const token = jwt.sign(payload, config.jwt.secret, { expiresIn: '1ms' } as jwt.SignOptions);
    // Wait synchronously: shift event-loop time forward via setImmediate.
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(verifyToken(token)).toBeNull();
        resolve();
      }, 50);
    });
  });
});
