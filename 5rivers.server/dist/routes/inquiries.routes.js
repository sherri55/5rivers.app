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
const inquiryService = __importStar(require("../services/inquiry.service"));
const types_1 = require("../types");
const auth_middleware_1 = require("../middleware/auth.middleware");
const errorHandler_1 = require("../middleware/errorHandler");
const mailer_1 = require("../utils/mailer");
const router = (0, express_1.Router)();
// ─── PUBLIC: contact form submission ────────────────────────────────────────
//
// No auth required — this is the endpoint the public homepage posts to. Rate
// limiting / spam prevention is intentionally minimal here; revisit if
// abuse becomes an issue.
router.post('/inquiries', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const body = req.body ?? {};
    if (!body.fullName || typeof body.fullName !== 'string' || !body.fullName.trim()) {
        throw (0, errorHandler_1.badRequest)('fullName is required');
    }
    if (!body.email || typeof body.email !== 'string' || !body.email.trim()) {
        throw (0, errorHandler_1.badRequest)('email is required');
    }
    if (!body.serviceType || typeof body.serviceType !== 'string') {
        throw (0, errorHandler_1.badRequest)('serviceType is required');
    }
    const inquiry = await inquiryService.createInquiry({
        fullName: body.fullName.trim(),
        email: body.email.trim(),
        phone: body.phone?.toString().trim() || null,
        serviceType: body.serviceType.trim(),
        projectDetails: body.projectDetails?.toString().trim() || null,
        userAgent: req.get('user-agent') ?? null,
        ipAddress: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || null,
    });
    // Fire-and-forget notification email — don't block the response on SMTP.
    const inquiriesEmail = process.env.INQUIRIES_NOTIFY_EMAIL ?? 'info@5riverstruckinginc.ca';
    void (0, mailer_1.sendMail)({
        to: inquiriesEmail,
        replyTo: inquiry.email,
        subject: `New website inquiry from ${inquiry.fullName} — ${inquiry.serviceType}`,
        text: `A new inquiry has been submitted via the public homepage.

Name:     ${inquiry.fullName}
Email:    ${inquiry.email}
Phone:    ${inquiry.phone ?? '(not provided)'}
Service:  ${inquiry.serviceType}

Project details:
${inquiry.projectDetails ?? '(none)'}

Submitted at: ${inquiry.createdAt.toISOString()}
Inquiry ID:   ${inquiry.id}
`,
    });
    res.status(201).json({
        id: inquiry.id,
        message: 'Thanks — we received your inquiry and will be in touch shortly.',
    });
}));
// ─── AUTH-PROTECTED admin endpoints ─────────────────────────────────────────
//
// Mounted on the same router but gated by requireAuth. Used by the dashboard
// to triage incoming leads.
const protectedRouter = (0, express_1.Router)();
protectedRouter.use(auth_middleware_1.requireAuth);
protectedRouter.get('/inquiries', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const pagination = (0, types_1.normalizePagination)({
        page: req.query.page ? parseInt(String(req.query.page), 10) : undefined,
        limit: req.query.limit ? parseInt(String(req.query.limit), 10) : undefined,
    });
    const status = typeof req.query.status === 'string'
        ? req.query.status
        : undefined;
    const result = await inquiryService.listInquiries(pagination, {
        sortBy: typeof req.query.sortBy === 'string' ? req.query.sortBy : undefined,
        order: req.query.order === 'asc' ? 'asc' : 'desc',
        status,
    });
    res.json(result);
}));
protectedRouter.patch('/inquiries/:id', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const updated = await inquiryService.updateInquiry({
        id: req.params.id,
        status: req.body?.status,
        notes: req.body?.notes,
    });
    if (!updated)
        throw (0, errorHandler_1.notFound)('Inquiry not found');
    res.json(updated);
}));
router.use(protectedRouter);
exports.default = router;
