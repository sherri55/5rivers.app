"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.requireRole = requireRole;
const auth_service_1 = require("../services/auth.service");
const errorHandler_1 = require("./errorHandler");
const connection_1 = require("../db/connection");
const config_1 = require("../config");
function getBearerToken(req) {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer '))
        return null;
    return auth.slice(7).trim() || null;
}
/** Check if the token matches the static agent API key. Returns AuthUser or null. */
function checkAgentApiKey(token) {
    const { apiKey, userId, organizationId, email, role } = config_1.config.agent;
    if (!apiKey || token !== apiKey)
        return null;
    if (!userId || !organizationId)
        return null;
    return { userId, organizationId, email, role, isSuperAdmin: false };
}
/** Require valid JWT or static API key; set req.user. Super-admin may send X-Organization-Id to act as that org. */
async function requireAuth(req, _res, next) {
    const token = getBearerToken(req);
    if (!token) {
        next((0, errorHandler_1.unauthorized)('Missing or invalid authorization'));
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
    const user = (0, auth_service_1.verifyToken)(token);
    if (!user) {
        next((0, errorHandler_1.unauthorized)('Invalid or expired token'));
        return;
    }
    req.user = user;
    const headerOrgId = req.headers['x-organization-id'];
    if (user.isSuperAdmin && headerOrgId?.trim()) {
        const rows = await (0, connection_1.query)(`SELECT id FROM Organizations WHERE id = @id`, { params: { id: headerOrgId.trim() } });
        if (Array.isArray(rows) && rows.length > 0) {
            req.user = { ...user, organizationId: rows[0].id };
        }
        // If org not found, keep original JWT org (no error)
    }
    next();
}
/** Require at least one of the given roles. Use after requireAuth. */
function requireRole(...allowed) {
    const set = new Set(allowed);
    return (req, _res, next) => {
        if (!req.user) {
            next((0, errorHandler_1.unauthorized)());
            return;
        }
        if (!set.has(req.user.role)) {
            next((0, errorHandler_1.forbidden)('Insufficient permissions'));
            return;
        }
        next();
    };
}
