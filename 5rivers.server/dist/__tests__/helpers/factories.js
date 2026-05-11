"use strict";
/**
 * factories.ts — fast builders for test entities.
 *
 * Each builder accepts an `orgId` and returns the created row. Overrides
 * are merged on top of sensible defaults so most tests stay one line:
 *
 *   const company = await createCompany(orgId);
 *   const jt = await createJobType(orgId, company.id, { rateOfJob: 110, dispatchType: 'hourly' });
 *   const job = await createJob(orgId, jt.id, { startTime: '2026-04-20T12:00:00Z', endTime: '2026-04-20T21:30:00Z' });
 *
 * Every factory uses the production service code under the hood — never
 * raw SQL — so the test exercises the same insert path as live traffic.
 */
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
exports.createCompany = createCompany;
exports.createJobType = createJobType;
exports.createDispatcher = createDispatcher;
exports.createDriver = createDriver;
exports.createJob = createJob;
exports.createInvoice = createInvoice;
exports.addJobToInvoice = addJobToInvoice;
const companyService = __importStar(require("../../services/company.service"));
const jobTypeService = __importStar(require("../../services/jobType.service"));
const jobService = __importStar(require("../../services/job.service"));
const driverService = __importStar(require("../../services/driver.service"));
const dispatcherService = __importStar(require("../../services/dispatcher.service"));
const invoiceService = __importStar(require("../../services/invoice.service"));
const jobInvoiceService = __importStar(require("../../services/jobInvoice.service"));
// ─── Counter for deterministic-but-unique names ─────────────────────────────
let _counter = 0;
const next = () => ++_counter;
// ─── Company ────────────────────────────────────────────────────────────────
async function createCompany(orgId, overrides = {}) {
    return companyService.createCompany(orgId, {
        name: `Test Co ${next()}`,
        ...overrides,
    });
}
// ─── JobType ────────────────────────────────────────────────────────────────
async function createJobType(orgId, companyId, overrides = {}) {
    return jobTypeService.createJobType(orgId, {
        companyId,
        title: `Route ${next()}`,
        dispatchType: 'hourly',
        rateOfJob: 100,
        ...overrides,
    });
}
// ─── Dispatcher ─────────────────────────────────────────────────────────────
async function createDispatcher(orgId, overrides = {}) {
    return dispatcherService.createDispatcher(orgId, {
        name: `Dispatcher ${next()}`,
        commissionPercent: 10,
        ...overrides,
    });
}
// ─── Driver ─────────────────────────────────────────────────────────────────
async function createDriver(orgId, overrides = {}) {
    return driverService.createDriver(orgId, {
        name: `Driver ${next()}`,
        payType: 'PERCENTAGE',
        percentageRate: 25,
        ...overrides,
    });
}
// ─── Job ────────────────────────────────────────────────────────────────────
/**
 * Create a job. Defaults: today's date, no driver/unit, NULL amount
 * (override-only model — read paths derive the amount via vJobsEffective).
 */
async function createJob(orgId, jobTypeId, overrides = {}) {
    return jobService.createJob(orgId, {
        jobTypeId,
        jobDate: overrides.jobDate ?? new Date().toISOString().slice(0, 10),
        sourceType: 'DISPATCHED',
        ...overrides,
    });
}
// ─── Invoice ────────────────────────────────────────────────────────────────
/**
 * Create an invoice. Either dispatcherId or companyId should be supplied
 * (matches the production routing constraint). Defaults to today.
 */
async function createInvoice(orgId, target, overrides = {}) {
    return invoiceService.createInvoice(orgId, {
        invoiceDate: new Date().toISOString().slice(0, 10),
        dispatcherId: target.dispatcherId ?? null,
        companyId: target.companyId ?? null,
        ...overrides,
    });
}
// ─── JobInvoice line ────────────────────────────────────────────────────────
/**
 * Add a job to an invoice. Defaults amount to null (inherit from job's
 * effectiveAmount via the vJobInvoiceEffective view). Pass an explicit
 * number for a line-level override.
 */
async function addJobToInvoice(orgId, invoiceId, jobId, amount = null) {
    return jobInvoiceService.addJobToInvoice(orgId, invoiceId, jobId, amount);
}
