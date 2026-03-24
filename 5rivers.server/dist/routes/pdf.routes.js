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
const auth_middleware_1 = require("../middleware/auth.middleware");
const types_1 = require("../types");
const pdf_service_1 = require("../services/pdf.service");
const jobService = __importStar(require("../services/job.service"));
const invoiceService = __importStar(require("../services/invoice.service"));
const driverService = __importStar(require("../services/driver.service"));
const dispatcherService = __importStar(require("../services/dispatcher.service"));
const companyService = __importStar(require("../services/company.service"));
const unitService = __importStar(require("../services/unit.service"));
const jobTypeService = __importStar(require("../services/jobType.service"));
const connection_1 = require("../db/connection");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.requireAuth);
// ============================================
// Helpers
// ============================================
function fmtDate(d) {
    if (!d)
        return '';
    const s = String(d).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s))
        return String(d);
    const [y, m, day] = s.split('-').map(Number);
    return new Date(y, m - 1, day).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'America/Toronto' });
}
function fmtCurrency(v) {
    const n = Number(v ?? 0);
    return `$${n.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function sendPdf(res, buffer, filename) {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
}
/** Parse list params for export — use large limit to get all filtered data. */
function exportPagination() {
    return (0, types_1.normalizePagination)({ page: 1, limit: 500 });
}
function buildSubtitle(filters) {
    const parts = [];
    for (const [k, v] of Object.entries(filters)) {
        if (v)
            parts.push(`${k}: ${v}`);
    }
    if (parts.length === 0)
        return `All records · ${new Date().toLocaleDateString('en-CA', { timeZone: 'America/Toronto' })}`;
    return `Filtered by ${parts.join(', ')} · ${new Date().toLocaleDateString('en-CA', { timeZone: 'America/Toronto' })}`;
}
// ============================================
// Invoice PDF (full invoice with jobs + images)
// ============================================
router.get('/invoices/:id/pdf', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { buffer, filename } = await (0, pdf_service_1.generateInvoicePDF)(req.params.id, req.user.organizationId);
    sendPdf(res, buffer, filename);
}));
// ============================================
// List exports — same filters as list endpoints
// ============================================
// --- Jobs ---
router.get('/export/jobs', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const orgId = req.user.organizationId;
    const { sortBy, order, filters } = (0, types_1.parseListOptions)(req.query);
    const result = await jobService.listJobs(orgId, exportPagination(), { sortBy, order, filters });
    // We need lookup maps for driver/dispatcher/jobType names
    const driverResult = await driverService.listDrivers(orgId, (0, types_1.normalizePagination)({ limit: 500 }));
    const dispatcherResult = await dispatcherService.listDispatchers(orgId, (0, types_1.normalizePagination)({ limit: 500 }));
    const jobTypeResult = await jobTypeService.listJobTypes(orgId, (0, types_1.normalizePagination)({ limit: 500 }));
    const companyResult = await companyService.listCompanies(orgId, (0, types_1.normalizePagination)({ limit: 500 }));
    const unitResult = await unitService.listUnits(orgId, (0, types_1.normalizePagination)({ limit: 500 }));
    const driverMap = new Map(driverResult.data.map((d) => [d.id, d.name]));
    const dispatcherMap = new Map(dispatcherResult.data.map((d) => [d.id, d.name]));
    const jobTypeMap = new Map(jobTypeResult.data.map((jt) => [jt.id, jt]));
    const companyMap = new Map(companyResult.data.map((c) => [c.id, c.name]));
    const unitMap = new Map(unitResult.data.map((u) => [u.id, u.name]));
    const columns = [
        { label: 'Date' },
        { label: 'Job Type' },
        { label: 'Company' },
        { label: 'Driver' },
        { label: 'Dispatcher' },
        { label: 'Unit' },
        { label: 'Source' },
        { label: 'Amount', align: 'right' },
        { label: 'Paid', align: 'center' },
    ];
    const rows = result.data.map((j) => {
        const jt = jobTypeMap.get(j.jobTypeId);
        return [
            fmtDate(j.jobDate),
            jt?.title ?? '',
            jt?.companyId ? companyMap.get(jt.companyId) ?? '' : '',
            driverMap.get(j.driverId) ?? '',
            dispatcherMap.get(j.dispatcherId) ?? '',
            unitMap.get(j.unitId) ?? '',
            j.sourceType ?? '',
            fmtCurrency(j.amount),
            j.driverPaid ? 'Yes' : 'No',
        ];
    });
    const buffer = await (0, pdf_service_1.generateListPDF)('Jobs Report', buildSubtitle(filters), columns, rows);
    sendPdf(res, buffer, 'jobs-report.pdf');
}));
// --- Invoices ---
router.get('/export/invoices', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const orgId = req.user.organizationId;
    const { sortBy, order, filters } = (0, types_1.parseListOptions)(req.query);
    const result = await invoiceService.listInvoices(orgId, exportPagination(), { sortBy, order, filters });
    const dispatcherResult = await dispatcherService.listDispatchers(orgId, (0, types_1.normalizePagination)({ limit: 500 }));
    const dispatcherMap = new Map(dispatcherResult.data.map((d) => [d.id, d.name]));
    const columns = [
        { label: 'Invoice #' },
        { label: 'Date' },
        { label: 'Status' },
        { label: 'Dispatcher' },
        { label: 'Billed To' },
        { label: 'Billed Email' },
    ];
    const rows = result.data.map((inv) => [
        inv.invoiceNumber ?? '',
        fmtDate(inv.invoiceDate),
        inv.status ?? '',
        dispatcherMap.get(inv.dispatcherId) ?? '',
        inv.billedTo ?? '',
        inv.billedEmail ?? '',
    ]);
    const buffer = await (0, pdf_service_1.generateListPDF)('Invoices Report', buildSubtitle(filters), columns, rows);
    sendPdf(res, buffer, 'invoices-report.pdf');
}));
// --- Drivers ---
router.get('/export/drivers', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const orgId = req.user.organizationId;
    const { sortBy, order, filters } = (0, types_1.parseListOptions)(req.query);
    const result = await driverService.listDrivers(orgId, exportPagination(), { sortBy, order, filters });
    const columns = [
        { label: 'Name' },
        { label: 'Email' },
        { label: 'Phone' },
        { label: 'Pay Type' },
        { label: 'Description', width: '*' },
    ];
    const rows = result.data.map((d) => [
        d.name ?? '',
        d.email ?? '',
        d.phone ?? '',
        d.payType ?? '',
        d.description ?? '',
    ]);
    const buffer = await (0, pdf_service_1.generateListPDF)('Drivers Report', buildSubtitle(filters), columns, rows, 'landscape');
    sendPdf(res, buffer, 'drivers-report.pdf');
}));
// --- Dispatchers ---
router.get('/export/dispatchers', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const orgId = req.user.organizationId;
    const { sortBy, order, filters } = (0, types_1.parseListOptions)(req.query);
    const result = await dispatcherService.listDispatchers(orgId, exportPagination(), { sortBy, order, filters });
    const columns = [
        { label: 'Name' },
        { label: 'Email' },
        { label: 'Phone' },
        { label: 'Commission %', align: 'right' },
        { label: 'Description', width: '*' },
    ];
    const rows = result.data.map((d) => [
        d.name ?? '',
        d.email ?? '',
        d.phone ?? '',
        d.commissionPercent != null ? `${d.commissionPercent}%` : '',
        d.description ?? '',
    ]);
    const buffer = await (0, pdf_service_1.generateListPDF)('Dispatchers Report', buildSubtitle(filters), columns, rows, 'landscape');
    sendPdf(res, buffer, 'dispatchers-report.pdf');
}));
// --- Companies ---
router.get('/export/companies', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const orgId = req.user.organizationId;
    const { sortBy, order, filters } = (0, types_1.parseListOptions)(req.query);
    const result = await companyService.listCompanies(orgId, exportPagination(), { sortBy, order, filters });
    const columns = [
        { label: 'Name' },
        { label: 'Industry' },
        { label: 'Email' },
        { label: 'Phone' },
        { label: 'Location' },
    ];
    const rows = result.data.map((c) => [
        c.name ?? '',
        c.industry ?? '',
        c.email ?? '',
        c.phone ?? '',
        c.location ?? '',
    ]);
    const buffer = await (0, pdf_service_1.generateListPDF)('Companies Report', buildSubtitle(filters), columns, rows, 'landscape');
    sendPdf(res, buffer, 'companies-report.pdf');
}));
// --- Units ---
router.get('/export/units', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const orgId = req.user.organizationId;
    const { sortBy, order, filters } = (0, types_1.parseListOptions)(req.query);
    const result = await unitService.listUnits(orgId, exportPagination(), { sortBy, order, filters });
    const columns = [
        { label: 'Name' },
        { label: 'Plate #' },
        { label: 'Status' },
        { label: 'Year' },
        { label: 'Make' },
        { label: 'Model' },
        { label: 'VIN' },
        { label: 'Color' },
    ];
    const rows = result.data.map((u) => [
        u.name ?? '',
        u.plateNumber ?? '',
        u.status ?? '',
        u.year != null ? String(u.year) : '',
        u.make ?? '',
        u.model ?? '',
        u.vin ?? '',
        u.color ?? '',
    ]);
    const buffer = await (0, pdf_service_1.generateListPDF)('Units Report', buildSubtitle(filters), columns, rows);
    sendPdf(res, buffer, 'units-report.pdf');
}));
// --- Carriers (no dedicated service — query directly) ---
router.get('/export/carriers', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const orgId = req.user.organizationId;
    const rows = await (0, connection_1.query)(`SELECT name, contactPerson, email, phone FROM Carriers WHERE organizationId = @orgId ORDER BY name`, { params: { orgId } });
    const columns = [
        { label: 'Name' },
        { label: 'Contact Person' },
        { label: 'Email' },
        { label: 'Phone' },
    ];
    const data = (Array.isArray(rows) ? rows : []).map((c) => [
        c.name ?? '',
        c.contactPerson ?? '',
        c.email ?? '',
        c.phone ?? '',
    ]);
    const buffer = await (0, pdf_service_1.generateListPDF)('Carriers Report', `All records · ${new Date().toLocaleDateString('en-CA', { timeZone: 'America/Toronto' })}`, columns, data, 'portrait');
    sendPdf(res, buffer, 'carriers-report.pdf');
}));
exports.default = router;
