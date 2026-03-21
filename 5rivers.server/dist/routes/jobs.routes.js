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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const multer_1 = __importDefault(require("multer"));
const express_1 = require("express");
const asyncHandler_1 = require("../utils/asyncHandler");
const jobService = __importStar(require("../services/job.service"));
const imageService = __importStar(require("../services/image.service"));
const jobDriverPayService = __importStar(require("../services/jobDriverPay.service"));
const types_1 = require("../types");
const auth_middleware_1 = require("../middleware/auth.middleware");
const errorHandler_1 = require("../middleware/errorHandler");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.requireAuth);
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});
router.get('/jobs', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const orgId = req.user.organizationId;
    const pagination = (0, types_1.normalizePagination)({
        page: req.query.page ? parseInt(String(req.query.page), 10) : undefined,
        limit: req.query.limit ? parseInt(String(req.query.limit), 10) : undefined,
    });
    const { sortBy, order, filters } = (0, types_1.parseListOptions)(req.query);
    const result = await jobService.listJobs(orgId, pagination, { sortBy, order, filters });
    res.json(result);
}));
router.get('/jobs/:id/images', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const job = await jobService.getJobById(req.params.id, req.user.organizationId);
    if (!job)
        throw (0, errorHandler_1.notFound)('Job not found');
    const list = await imageService.listImagesByJob(req.params.id, req.user.organizationId);
    res.json(list);
}));
router.post('/jobs/:id/images', upload.single('file'), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const file = req.file;
    if (!file || !file.buffer)
        throw (0, errorHandler_1.badRequest)('file is required (multipart/form-data field: file)');
    const job = await jobService.getJobById(req.params.id, req.user.organizationId);
    if (!job)
        throw (0, errorHandler_1.notFound)('Job not found');
    const meta = await imageService.createImage(req.user.organizationId, req.params.id, file.buffer, file.mimetype || 'application/octet-stream', file.originalname || null);
    res.status(201).json(meta);
}));
router.get('/jobs/:id/images/:imageId', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const job = await jobService.getJobById(req.params.id, req.user.organizationId);
    if (!job)
        throw (0, errorHandler_1.notFound)('Job not found');
    const image = await imageService.getImageById(req.params.imageId, req.params.id, req.user.organizationId);
    if (!image)
        throw (0, errorHandler_1.notFound)('Image not found');
    res.setHeader('Content-Type', image.contentType);
    if (image.fileName)
        res.setHeader('Content-Disposition', `inline; filename="${image.fileName}"`);
    res.send(image.content);
}));
router.delete('/jobs/:id/images/:imageId', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const job = await jobService.getJobById(req.params.id, req.user.organizationId);
    if (!job)
        throw (0, errorHandler_1.notFound)('Job not found');
    const removed = await imageService.deleteImage(req.params.imageId, req.params.id, req.user.organizationId);
    if (!removed)
        throw (0, errorHandler_1.notFound)('Image not found');
    res.status(204).send();
}));
router.get('/jobs/:id/driver-pay', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const job = await jobService.getJobById(req.params.id, req.user.organizationId);
    if (!job)
        throw (0, errorHandler_1.notFound)('Job not found');
    const row = await jobDriverPayService.getJobDriverPay(req.params.id, req.user.organizationId);
    if (!row)
        throw (0, errorHandler_1.notFound)('Job driver pay not found');
    res.json(row);
}));
router.put('/jobs/:id/driver-pay', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const body = req.body ?? {};
    if (body.driverId == null || body.amount == null)
        throw (0, errorHandler_1.badRequest)('driverId and amount are required');
    try {
        const row = await jobDriverPayService.setJobDriverPay(req.user.organizationId, req.params.id, body.driverId, Number(body.amount));
        res.json(row);
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes('not found'))
            throw (0, errorHandler_1.notFound)(msg);
        throw e;
    }
}));
router.patch('/jobs/:id/driver-pay', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const body = req.body ?? {};
    if (body.paymentId == null)
        throw (0, errorHandler_1.badRequest)('paymentId is required to mark as paid');
    const job = await jobService.getJobById(req.params.id, req.user.organizationId);
    if (!job)
        throw (0, errorHandler_1.notFound)('Job not found');
    const row = await jobDriverPayService.markJobDriverPayPaid(req.user.organizationId, req.params.id, body.paymentId);
    if (!row)
        throw (0, errorHandler_1.notFound)('Job driver pay not found or payment invalid');
    res.json(row);
}));
router.delete('/jobs/:id/driver-pay', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const job = await jobService.getJobById(req.params.id, req.user.organizationId);
    if (!job)
        throw (0, errorHandler_1.notFound)('Job not found');
    const removed = await jobDriverPayService.clearJobDriverPay(req.params.id, req.user.organizationId);
    if (!removed)
        return res.status(204).send();
    res.status(204).send();
}));
router.get('/jobs/:id', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const job = await jobService.getJobById(req.params.id, req.user.organizationId);
    if (!job)
        throw (0, errorHandler_1.notFound)('Job not found');
    res.json(job);
}));
router.post('/jobs', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const body = req.body ?? {};
    if (!body.jobDate || !body.jobTypeId)
        throw (0, errorHandler_1.badRequest)('jobDate and jobTypeId are required');
    const job = await jobService.createJob(req.user.organizationId, body);
    res.status(201).json(job);
}));
router.patch('/jobs/:id', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const job = await jobService.updateJob(req.user.organizationId, { ...req.body, id: req.params.id });
    if (!job)
        throw (0, errorHandler_1.notFound)('Job not found');
    res.json(job);
}));
router.delete('/jobs/:id', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const deleted = await jobService.deleteJob(req.params.id, req.user.organizationId);
    if (!deleted)
        throw (0, errorHandler_1.notFound)('Job not found');
    res.status(204).send();
}));
exports.default = router;
