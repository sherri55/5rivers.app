"use strict";
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
/// <reference path="../types/express.d.ts" />
const express_1 = require("express");
const asyncHandler_1 = require("../utils/asyncHandler");
const memberService = __importStar(require("../services/member.service"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const errorHandler_1 = require("../middleware/errorHandler");
const auth_1 = require("../types/auth");
const types_1 = require("../types");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.requireAuth);
router.use((0, auth_middleware_1.requireRole)('OWNER', 'ADMIN'));
router.get('/members', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const orgId = req.user.organizationId;
    const { sortBy, order, filters } = (0, types_1.parseListOptions)(req.query);
    const members = await memberService.listMembers(orgId, { sortBy, order, filters });
    res.json(members);
}));
router.post('/members', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const orgId = req.user.organizationId;
    const body = req.body ?? {};
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const name = typeof body.name === 'string' ? body.name.trim() : undefined;
    const role = body.role;
    if (!email) {
        throw (0, errorHandler_1.badRequest)('email is required');
    }
    if (!role || !auth_1.ROLES.includes(role)) {
        throw (0, errorHandler_1.badRequest)('role must be one of: ' + auth_1.ROLES.join(', '));
    }
    const member = await memberService.addMember(orgId, {
        email,
        password,
        name,
        role,
    });
    res.status(201).json(member);
}));
router.patch('/members/:userId', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const orgId = req.user.organizationId;
    const { userId } = req.params;
    const body = req.body ?? {};
    const role = body.role;
    const name = typeof body.name === 'string' ? body.name.trim() : undefined;
    if (!role && name === undefined) {
        throw (0, errorHandler_1.badRequest)('provide role and/or name to update');
    }
    const input = {};
    if (role !== undefined) {
        if (!auth_1.ROLES.includes(role))
            throw (0, errorHandler_1.badRequest)('invalid role');
        input.role = role;
    }
    if (name !== undefined)
        input.name = name;
    const member = await memberService.updateMember(orgId, userId, input);
    if (!member)
        throw (0, errorHandler_1.notFound)('Member not found');
    res.json(member);
}));
router.delete('/members/:userId', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const orgId = req.user.organizationId;
    const { userId } = req.params;
    const removed = await memberService.removeMember(orgId, userId);
    if (!removed) {
        throw (0, errorHandler_1.notFound)('Member not found');
    }
    res.status(204).send();
}));
exports.default = router;
