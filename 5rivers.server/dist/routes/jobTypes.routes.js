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
const jobTypeService = __importStar(require("../services/jobType.service"));
const types_1 = require("../types");
const auth_middleware_1 = require("../middleware/auth.middleware");
const errorHandler_1 = require("../middleware/errorHandler");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.requireAuth);
router.get('/job-types', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const orgId = req.user.organizationId;
    const companyId = typeof req.query.companyId === 'string' ? req.query.companyId : undefined;
    const pagination = (0, types_1.normalizePagination)({
        page: req.query.page ? parseInt(String(req.query.page), 10) : undefined,
        limit: req.query.limit ? parseInt(String(req.query.limit), 10) : undefined,
    });
    const { sortBy, order, filters } = (0, types_1.parseListOptions)(req.query);
    const result = await jobTypeService.listJobTypes(orgId, pagination, companyId, { sortBy, order, filters });
    res.json(result);
}));
router.get('/job-types/:id', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const jobType = await jobTypeService.getJobTypeById(req.params.id, req.user.organizationId);
    if (!jobType)
        throw (0, errorHandler_1.notFound)('Job type not found');
    res.json(jobType);
}));
router.post('/job-types', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const body = req.body ?? {};
    if (!body.companyId)
        throw (0, errorHandler_1.badRequest)('companyId is required');
    if (!body.title)
        throw (0, errorHandler_1.badRequest)('title is required');
    const jobType = await jobTypeService.createJobType(req.user.organizationId, body);
    res.status(201).json(jobType);
}));
router.patch('/job-types/:id', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const jobType = await jobTypeService.updateJobType(req.user.organizationId, { ...req.body, id: req.params.id });
    if (!jobType)
        throw (0, errorHandler_1.notFound)('Job type not found');
    res.json(jobType);
}));
router.delete('/job-types/:id', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const deleted = await jobTypeService.deleteJobType(req.params.id, req.user.organizationId);
    if (!deleted)
        throw (0, errorHandler_1.notFound)('Job type not found');
    res.status(204).send();
}));
exports.default = router;
