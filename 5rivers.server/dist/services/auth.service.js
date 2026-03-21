"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = login;
exports.verifyToken = verifyToken;
exports.hashPassword = hashPassword;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const connection_1 = require("../db/connection");
const errorHandler_1 = require("../middleware/errorHandler");
const SALT_ROUNDS = config_1.config.bcrypt.rounds;
/** Find user by email and verify membership in org by slug; verify password. Super-admin can use any org slug. */
async function login(input) {
    const email = input.email.trim().toLowerCase();
    const slug = input.organizationSlug.trim();
    const rows = await (0, connection_1.query)(`SELECT id, email, passwordHash FROM Users WHERE email = @email`, { params: { email } });
    if (!Array.isArray(rows) || rows.length === 0) {
        throw (0, errorHandler_1.unauthorized)('Invalid email or password');
    }
    const userRow = rows[0];
    const valid = await bcrypt_1.default.compare(input.password, userRow.passwordHash);
    if (!valid) {
        throw (0, errorHandler_1.unauthorized)('Invalid email or password');
    }
    const isSuperAdmin = !!config_1.config.superAdminEmail && email === config_1.config.superAdminEmail;
    let organizationId;
    let role;
    if (isSuperAdmin) {
        const orgRows = await (0, connection_1.query)(`SELECT id FROM Organizations WHERE slug = @slug`, { params: { slug } });
        if (!Array.isArray(orgRows) || orgRows.length === 0) {
            throw (0, errorHandler_1.forbidden)('Organization not found');
        }
        organizationId = orgRows[0].id;
        role = 'OWNER';
    }
    else {
        const memberRows = await (0, connection_1.query)(`SELECT om.organizationId, om.role
       FROM OrganizationMember om
       INNER JOIN Organizations o ON o.id = om.organizationId
       WHERE om.userId = @userId AND o.slug = @slug`, { params: { userId: userRow.id, slug } });
        if (!Array.isArray(memberRows) || memberRows.length === 0) {
            throw (0, errorHandler_1.forbidden)('You do not have access to this organization');
        }
        organizationId = memberRows[0].organizationId;
        role = memberRows[0].role;
    }
    const payload = {
        userId: userRow.id,
        organizationId,
        role,
        email: userRow.email,
        ...(isSuperAdmin && { isSuperAdmin: true }),
    };
    if (config_1.config.isProduction && (!config_1.config.jwt.secret || config_1.config.jwt.secret.includes('change-in-production'))) {
        throw new Error('JWT_SECRET must be set in production');
    }
    const token = jsonwebtoken_1.default.sign(payload, config_1.config.jwt.secret, { expiresIn: config_1.config.jwt.expiresIn });
    return {
        token,
        user: payload,
        expiresIn: config_1.config.jwt.expiresIn,
    };
}
/** Verify JWT and return payload; returns null if invalid. */
function verifyToken(token) {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwt.secret);
        return decoded;
    }
    catch {
        return null;
    }
}
/** Hash password (for seeding or user creation). */
async function hashPassword(password) {
    return bcrypt_1.default.hash(password, SALT_ROUNDS);
}
