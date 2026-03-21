"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const asyncHandler_1 = require("../utils/asyncHandler");
const auth_service_1 = require("../services/auth.service");
const errorHandler_1 = require("../middleware/errorHandler");
const router = (0, express_1.Router)();
router.post('/auth/login', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const body = req.body ?? {};
    const email = body.email;
    const password = body.password;
    const organizationSlug = body.organizationSlug;
    if (!email || !password || !organizationSlug) {
        throw (0, errorHandler_1.badRequest)('email, password, and organizationSlug are required');
    }
    const result = await (0, auth_service_1.login)({ email, password, organizationSlug });
    res.json(result);
}));
exports.default = router;
