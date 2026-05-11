"use strict";
/**
 * Unit tests for auth primitives in `src/services/auth.service.ts`.
 * Exercises:
 *   • hashPassword — bcrypt round-trip, salt randomization, length sanity
 *   • verifyToken  — JWT round-trip via the production secret
 *
 * Login flow (DB-touching) is covered in api.test.ts and the dedicated
 * org-isolation tests; this file only validates the cryptographic primitives.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const bcrypt = __importStar(require("bcrypt"));
const jwt = __importStar(require("jsonwebtoken"));
const auth_service_1 = require("../../services/auth.service");
const config_1 = require("../../config");
describe('hashPassword', () => {
    it('produces a bcrypt-shaped hash', async () => {
        const hash = await (0, auth_service_1.hashPassword)('Hunter2!');
        // bcrypt hashes are 60 chars and start with $2a$ / $2b$ / $2y$
        expect(hash).toMatch(/^\$2[aby]\$/);
        expect(hash.length).toBe(60);
    });
    it('verifies the correct password', async () => {
        const hash = await (0, auth_service_1.hashPassword)('Hunter2!');
        expect(await bcrypt.compare('Hunter2!', hash)).toBe(true);
    });
    it('rejects an incorrect password', async () => {
        const hash = await (0, auth_service_1.hashPassword)('Hunter2!');
        expect(await bcrypt.compare('hunter2!', hash)).toBe(false);
        expect(await bcrypt.compare('Hunter2', hash)).toBe(false);
        expect(await bcrypt.compare('', hash)).toBe(false);
    });
    it('produces different hashes for the same password (salt randomized)', async () => {
        const a = await (0, auth_service_1.hashPassword)('SamePassword!');
        const b = await (0, auth_service_1.hashPassword)('SamePassword!');
        expect(a).not.toBe(b);
        // But both still verify
        expect(await bcrypt.compare('SamePassword!', a)).toBe(true);
        expect(await bcrypt.compare('SamePassword!', b)).toBe(true);
    });
    it('handles unicode and long passwords without crashing', async () => {
        const unicode = '🔐パスワード!';
        const long = 'a'.repeat(72); // bcrypt's max input length
        expect(await bcrypt.compare(unicode, await (0, auth_service_1.hashPassword)(unicode))).toBe(true);
        expect(await bcrypt.compare(long, await (0, auth_service_1.hashPassword)(long))).toBe(true);
    });
});
describe('verifyToken', () => {
    // A minimal AuthUser-shaped payload. The login() function adds more
    // fields; verifyToken's contract is just "round-trip the JWT body".
    const payload = { userId: 'u1', email: 'a@b.com', organizationId: 'o1', role: 'OWNER' };
    it('round-trips a freshly signed token', () => {
        const token = jwt.sign(payload, config_1.config.jwt.secret, { expiresIn: '1h' });
        const decoded = (0, auth_service_1.verifyToken)(token);
        expect(decoded).not.toBeNull();
        expect(decoded.userId).toBe('u1');
        expect(decoded.email).toBe('a@b.com');
        expect(decoded.organizationId).toBe('o1');
    });
    it('returns null for a tampered token', () => {
        const token = jwt.sign(payload, config_1.config.jwt.secret, { expiresIn: '1h' });
        // Flip the last character — invalidates the signature.
        const tampered = token.slice(0, -1) + (token.slice(-1) === 'a' ? 'b' : 'a');
        expect((0, auth_service_1.verifyToken)(tampered)).toBeNull();
    });
    it('returns null for a token signed with a different secret', () => {
        const token = jwt.sign(payload, 'wrong-secret-completely-different', { expiresIn: '1h' });
        expect((0, auth_service_1.verifyToken)(token)).toBeNull();
    });
    it('returns null for garbage input', () => {
        expect((0, auth_service_1.verifyToken)('not-a-token')).toBeNull();
        expect((0, auth_service_1.verifyToken)('')).toBeNull();
        expect((0, auth_service_1.verifyToken)('aaa.bbb.ccc')).toBeNull();
    });
    it('returns null for an expired token', () => {
        // Sign with a 1ms expiry; verify after a small delay.
        const token = jwt.sign(payload, config_1.config.jwt.secret, { expiresIn: '1ms' });
        // Wait synchronously: shift event-loop time forward via setImmediate.
        return new Promise((resolve) => {
            setTimeout(() => {
                expect((0, auth_service_1.verifyToken)(token)).toBeNull();
                resolve();
            }, 50);
        });
    });
});
