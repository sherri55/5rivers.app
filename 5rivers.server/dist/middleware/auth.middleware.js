"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.requireRole = requireRole;
const auth_service_1 = require("../services/auth.service");
const errorHandler_1 = require("./errorHandler");
const connection_1 = require("../db/connection");
function getBearerToken(req) {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer '))
        return null;
    return auth.slice(7).trim() || null;
}
/** Require valid JWT; set req.user. Super-admin may send X-Organization-Id to act as that org. */
async function requireAuth(req, _res, next) {
    const token = getBearerToken(req);
    if (!token) {
        next((0, errorHandler_1.unauthorized)('Missing or invalid authorization'));
        return;
    }
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
