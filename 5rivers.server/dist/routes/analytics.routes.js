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
const auth_middleware_1 = require("../middleware/auth.middleware");
const analytics = __importStar(require("../services/analytics.service"));
const router = (0, express_1.Router)();
// GET /analytics/dashboard — aggregated dashboard stats
router.get('/analytics/dashboard', auth_middleware_1.requireAuth, async (req, res) => {
    try {
        const orgId = req.user.organizationId;
        const stats = await analytics.getDashboardStats(orgId);
        res.json(stats);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// GET /analytics/revenue/daily?days=30 — revenue by day
router.get('/analytics/revenue/daily', auth_middleware_1.requireAuth, async (req, res) => {
    try {
        const orgId = req.user.organizationId;
        const days = parseInt(req.query.days) || 30;
        const data = await analytics.getRevenueByDay(orgId, days);
        res.json(data);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// GET /analytics/revenue/monthly?months=12 — monthly revenue trend
router.get('/analytics/revenue/monthly', auth_middleware_1.requireAuth, async (req, res) => {
    try {
        const orgId = req.user.organizationId;
        const months = parseInt(req.query.months) || 12;
        const data = await analytics.getMonthlyRevenue(orgId, months);
        res.json(data);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// GET /analytics/revenue/by-company?startDate=&endDate= — revenue by company
router.get('/analytics/revenue/by-company', auth_middleware_1.requireAuth, async (req, res) => {
    try {
        const orgId = req.user.organizationId;
        const { startDate, endDate } = req.query;
        const data = await analytics.getRevenueByCompany(orgId, startDate, endDate);
        res.json(data);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// GET /analytics/revenue/by-driver?startDate=&endDate= — revenue by driver
router.get('/analytics/revenue/by-driver', auth_middleware_1.requireAuth, async (req, res) => {
    try {
        const orgId = req.user.organizationId;
        const { startDate, endDate } = req.query;
        const data = await analytics.getRevenueByDriver(orgId, startDate, endDate);
        res.json(data);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// GET /analytics/revenue/by-dispatcher?startDate=&endDate= — revenue by dispatcher
router.get('/analytics/revenue/by-dispatcher', auth_middleware_1.requireAuth, async (req, res) => {
    try {
        const orgId = req.user.organizationId;
        const { startDate, endDate } = req.query;
        const data = await analytics.getRevenueByDispatcher(orgId, startDate, endDate);
        res.json(data);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// GET /analytics/source-breakdown?startDate=&endDate= — dispatched vs direct
router.get('/analytics/source-breakdown', auth_middleware_1.requireAuth, async (req, res) => {
    try {
        const orgId = req.user.organizationId;
        const { startDate, endDate } = req.query;
        const data = await analytics.getSourceTypeBreakdown(orgId, startDate, endDate);
        res.json(data);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// GET /analytics/payment-status?startDate=&endDate= — paid vs unpaid
router.get('/analytics/payment-status', auth_middleware_1.requireAuth, async (req, res) => {
    try {
        const orgId = req.user.organizationId;
        const { startDate, endDate } = req.query;
        const data = await analytics.getPaymentStatus(orgId, startDate, endDate);
        res.json(data);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// GET /analytics/top-job-types?startDate=&endDate=&limit=10 — top job types
router.get('/analytics/top-job-types', auth_middleware_1.requireAuth, async (req, res) => {
    try {
        const orgId = req.user.organizationId;
        const { startDate, endDate } = req.query;
        const limit = parseInt(req.query.limit) || 10;
        const data = await analytics.getTopJobTypes(orgId, startDate, endDate, limit);
        res.json(data);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// GET /analytics/expenses/by-category?startDate=&endDate= — expense breakdown by category
router.get('/analytics/expenses/by-category', auth_middleware_1.requireAuth, async (req, res) => {
    try {
        const orgId = req.user.organizationId;
        const { startDate, endDate } = req.query;
        const data = await analytics.getExpensesByCategory(orgId, startDate, endDate);
        res.json(data);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// GET /analytics/expenses/monthly?months=24 — monthly expense trend
router.get('/analytics/expenses/monthly', auth_middleware_1.requireAuth, async (req, res) => {
    try {
        const orgId = req.user.organizationId;
        const months = parseInt(req.query.months) || 24;
        const data = await analytics.getMonthlyExpenses(orgId, months);
        res.json(data);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// GET /analytics/profit/monthly?months=12 — monthly profit (revenue - expenses)
router.get('/analytics/profit/monthly', auth_middleware_1.requireAuth, async (req, res) => {
    try {
        const orgId = req.user.organizationId;
        const months = parseInt(req.query.months) || 12;
        const data = await analytics.getMonthlyProfit(orgId, months);
        res.json(data);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
