"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const errorHandler_1 = require("../middleware/errorHandler");
const connection_1 = require("../db/connection");
const router = (0, express_1.Router)();
/** List all organizations (id, name, slug). Super-admin only. */
router.get('/organizations', auth_middleware_1.requireAuth, async (req, res, next) => {
    if (!req.user?.isSuperAdmin) {
        next((0, errorHandler_1.forbidden)('Super-admin only'));
        return;
    }
    try {
        const rows = await (0, connection_1.query)(`SELECT id, name, slug FROM Organizations ORDER BY name`);
        res.json(Array.isArray(rows) ? rows : []);
    }
    catch (e) {
        next(e);
    }
});
exports.default = router;
