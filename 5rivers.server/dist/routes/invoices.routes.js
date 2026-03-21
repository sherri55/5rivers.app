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
const invoiceService = __importStar(require("../services/invoice.service"));
const jobInvoiceService = __importStar(require("../services/jobInvoice.service"));
const types_1 = require("../types");
const auth_middleware_1 = require("../middleware/auth.middleware");
const errorHandler_1 = require("../middleware/errorHandler");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.requireAuth);
router.get('/invoices', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const orgId = req.user.organizationId;
    const pagination = (0, types_1.normalizePagination)({
        page: req.query.page ? parseInt(String(req.query.page), 10) : undefined,
        limit: req.query.limit ? parseInt(String(req.query.limit), 10) : undefined,
    });
    const { sortBy, order, filters } = (0, types_1.parseListOptions)(req.query);
    const result = await invoiceService.listInvoices(orgId, pagination, { sortBy, order, filters });
    res.json(result);
}));
router.get('/invoices/:id/jobs', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const invoice = await invoiceService.getInvoiceById(req.params.id, req.user.organizationId);
    if (!invoice)
        throw (0, errorHandler_1.notFound)('Invoice not found');
    const lines = await jobInvoiceService.listJobsOnInvoice(req.params.id, req.user.organizationId);
    res.json(lines);
}));
router.post('/invoices/:id/jobs', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const body = req.body ?? {};
    if (body.jobId == null || body.amount == null)
        throw (0, errorHandler_1.badRequest)('jobId and amount are required');
    const invoice = await invoiceService.getInvoiceById(req.params.id, req.user.organizationId);
    if (!invoice)
        throw (0, errorHandler_1.notFound)('Invoice not found');
    try {
        const line = await jobInvoiceService.addJobToInvoice(req.user.organizationId, req.params.id, body.jobId, Number(body.amount));
        res.status(201).json(line);
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes('not found'))
            throw (0, errorHandler_1.notFound)(msg);
        if (msg.includes('already on'))
            throw (0, errorHandler_1.badRequest)(msg);
        throw e;
    }
}));
router.patch('/invoices/:id/jobs/:jobId', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const amount = req.body?.amount;
    if (amount == null || Number.isNaN(Number(amount)))
        throw (0, errorHandler_1.badRequest)('amount (number) is required');
    const invoice = await invoiceService.getInvoiceById(req.params.id, req.user.organizationId);
    if (!invoice)
        throw (0, errorHandler_1.notFound)('Invoice not found');
    const line = await jobInvoiceService.updateJobInvoiceAmount(req.user.organizationId, req.params.id, req.params.jobId, Number(amount));
    if (!line)
        throw (0, errorHandler_1.notFound)('Job not found on this invoice');
    res.json(line);
}));
router.delete('/invoices/:id/jobs/:jobId', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const invoice = await invoiceService.getInvoiceById(req.params.id, req.user.organizationId);
    if (!invoice)
        throw (0, errorHandler_1.notFound)('Invoice not found');
    const removed = await jobInvoiceService.removeJobFromInvoice(req.user.organizationId, req.params.id, req.params.jobId);
    if (!removed)
        throw (0, errorHandler_1.notFound)('Job not found on this invoice');
    res.status(204).send();
}));
router.get('/invoices/:id', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const invoice = await invoiceService.getInvoiceById(req.params.id, req.user.organizationId);
    if (!invoice)
        throw (0, errorHandler_1.notFound)('Invoice not found');
    res.json(invoice);
}));
router.post('/invoices', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const body = req.body ?? {};
    if (!body.invoiceNumber || !body.invoiceDate)
        throw (0, errorHandler_1.badRequest)('invoiceNumber and invoiceDate are required');
    if (!body.dispatcherId && !body.companyId)
        throw (0, errorHandler_1.badRequest)('Either dispatcherId or companyId is required');
    const invoice = await invoiceService.createInvoice(req.user.organizationId, body);
    res.status(201).json(invoice);
}));
router.patch('/invoices/:id', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const invoice = await invoiceService.updateInvoice(req.user.organizationId, { ...req.body, id: req.params.id });
    if (!invoice)
        throw (0, errorHandler_1.notFound)('Invoice not found');
    res.json(invoice);
}));
router.delete('/invoices/:id', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const deleted = await invoiceService.deleteInvoice(req.params.id, req.user.organizationId);
    if (!deleted)
        throw (0, errorHandler_1.notFound)('Invoice not found');
    res.status(204).send();
}));
exports.default = router;
