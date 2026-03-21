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
const express_1 = require("express");
const asyncHandler_1 = require("../utils/asyncHandler");
const driverPaymentService = __importStar(require("../services/driverPayment.service"));
const types_1 = require("../types");
const auth_middleware_1 = require("../middleware/auth.middleware");
const errorHandler_1 = require("../middleware/errorHandler");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.requireAuth);
router.get('/driver-payments', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const orgId = req.user.organizationId;
    const driverId = typeof req.query.driverId === 'string' ? req.query.driverId : undefined;
    const pagination = (0, types_1.normalizePagination)({
        page: req.query.page ? parseInt(String(req.query.page), 10) : undefined,
        limit: req.query.limit ? parseInt(String(req.query.limit), 10) : undefined,
    });
    const result = await driverPaymentService.listDriverPayments(orgId, pagination, driverId);
    res.json(result);
}));
router.get('/driver-payments/:id', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const payment = await driverPaymentService.getDriverPaymentById(req.params.id, req.user.organizationId);
    if (!payment)
        throw (0, errorHandler_1.notFound)('Driver payment not found');
    res.json(payment);
}));
router.post('/driver-payments', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const body = req.body ?? {};
    if (body.driverId == null || body.amount == null || body.paidAt == null) {
        throw (0, errorHandler_1.badRequest)('driverId, amount and paidAt are required');
    }
    const payment = await driverPaymentService.createDriverPayment(req.user.organizationId, {
        driverId: body.driverId,
        amount: Number(body.amount),
        paidAt: String(body.paidAt).slice(0, 10),
        paymentMethod: body.paymentMethod ?? 'OTHER',
        reference: body.reference ?? null,
        notes: body.notes ?? null,
    });
    res.status(201).json(payment);
}));
router.patch('/driver-payments/:id', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const body = req.body ?? {};
    const payment = await driverPaymentService.updateDriverPayment(req.params.id, req.user.organizationId, {
        amount: body.amount != null ? Number(body.amount) : undefined,
        paidAt: body.paidAt != null ? String(body.paidAt).slice(0, 10) : undefined,
        paymentMethod: body.paymentMethod,
        reference: body.reference !== undefined ? body.reference : undefined,
        notes: body.notes !== undefined ? body.notes : undefined,
    });
    if (!payment)
        throw (0, errorHandler_1.notFound)('Driver payment not found');
    res.json(payment);
}));
router.delete('/driver-payments/:id', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const deleted = await driverPaymentService.deleteDriverPayment(req.params.id, req.user.organizationId);
    if (!deleted)
        throw (0, errorHandler_1.notFound)('Driver payment not found');
    res.status(204).send();
}));
exports.default = router;
