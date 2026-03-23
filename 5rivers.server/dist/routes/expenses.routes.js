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
const service = __importStar(require("../services/expense.service"));
const types_1 = require("../types");
const auth_middleware_1 = require("../middleware/auth.middleware");
const errorHandler_1 = require("../middleware/errorHandler");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.requireAuth);
router.get('/expenses', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const orgId = req.user.organizationId;
    const pagination = (0, types_1.normalizePagination)({
        page: req.query.page ? parseInt(String(req.query.page), 10) : undefined,
        limit: req.query.limit ? parseInt(String(req.query.limit), 10) : undefined,
    });
    const { sortBy, order, filters } = (0, types_1.parseListOptions)(req.query);
    const result = await service.listExpenses(orgId, pagination, { sortBy, order, filters });
    res.json(result);
}));
router.get('/expenses/:id', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const expense = await service.getExpenseById(req.params.id, req.user.organizationId);
    if (!expense)
        throw (0, errorHandler_1.notFound)('Expense not found');
    res.json(expense);
}));
router.post('/expenses', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const body = req.body ?? {};
    if (!body.description)
        throw (0, errorHandler_1.badRequest)('description is required');
    if (body.amount == null)
        throw (0, errorHandler_1.badRequest)('amount is required');
    if (!body.expenseDate)
        throw (0, errorHandler_1.badRequest)('expenseDate is required');
    const expense = await service.createExpense(req.user.organizationId, body);
    res.status(201).json(expense);
}));
router.patch('/expenses/:id', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const expense = await service.updateExpense(req.user.organizationId, { ...req.body, id: req.params.id });
    if (!expense)
        throw (0, errorHandler_1.notFound)('Expense not found');
    res.json(expense);
}));
router.delete('/expenses/:id', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const deleted = await service.deleteExpense(req.params.id, req.user.organizationId);
    if (!deleted)
        throw (0, errorHandler_1.notFound)('Expense not found');
    res.status(204).send();
}));
exports.default = router;
