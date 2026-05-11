"use strict";
/**
 * Regression tests — one per bug fixed during the dynamic-calc sprint.
 *
 * Each test should fail loudly if a future change reintroduces the bug.
 * These are the "guard rails" that prevent re-regression.
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
const connection_1 = require("../../db/connection");
const job_service_1 = require("../../services/job.service");
const jobType_service_1 = require("../../services/jobType.service");
const jobInvoice_service_1 = require("../../services/jobInvoice.service");
const helpers_1 = require("../helpers");
const factories_1 = require("../helpers/factories");
const types_1 = require("../../types");
const timezone_1 = require("../../utils/timezone");
let ctx;
let companyId;
beforeAll(async () => {
    ctx = await (0, helpers_1.createTestOrgAndUser)();
    const company = await (0, factories_1.createCompany)(ctx.orgId);
    companyId = company.id;
}, 30_000);
afterAll(async () => {
    await (0, helpers_1.deleteTestData)(ctx.orgId, ctx.userId);
}, 30_000);
describe('Regression: dynamic-amount sprint bugs', () => {
    // ─── BUG 1 — Apr 20 "Rate Pending" with valid hourly rate ────────────────
    it('1. Hourly job with NULL amount but valid hours+rate → effectiveAmount populated', async () => {
        const jt = await (0, factories_1.createJobType)(ctx.orgId, companyId, { dispatchType: 'hourly', rateOfJob: 110 });
        const job = await (0, job_service_1.createJob)(ctx.orgId, {
            jobDate: '2026-04-20',
            jobTypeId: jt.id,
            startTime: '2026-04-20T12:00:00Z',
            endTime: '2026-04-20T21:30:00Z', // 9.5h × 110 = 1045
            // amount intentionally omitted
        });
        expect(job.amount).toBeNull();
        const [row] = await (0, connection_1.query)(`SELECT effectiveAmount FROM vJobsEffective WHERE id = @id`, { params: { id: job.id } });
        expect(row.effectiveAmount).not.toBeNull();
        expect(Number(row.effectiveAmount)).toBeCloseTo(1045, 2);
    });
    // ─── BUG 2 — load defaults to 1 when loads is NULL ───────────────────────
    it('2. Load dispatch type defaults loads to 1 when NULL — TS formula', () => {
        const result = (0, job_service_1.computeJobAmountFromInputs)({
            rateOfJob: 200,
            dispatchType: 'load',
            loads: null,
        });
        expect(result).toBe(200); // rate × 1
    });
    it('2b. Load dispatch type defaults loads to 1 when NULL — SQL view', async () => {
        const jt = await (0, factories_1.createJobType)(ctx.orgId, companyId, { dispatchType: 'load', rateOfJob: 200 });
        const job = await (0, job_service_1.createJob)(ctx.orgId, { jobDate: '2026-04-21', jobTypeId: jt.id /* no loads */ });
        const [row] = await (0, connection_1.query)(`SELECT effectiveAmount FROM vJobsEffective WHERE id = @id`, { params: { id: job.id } });
        expect(Number(row.effectiveAmount)).toBe(200);
    });
    // ─── BUG 3 — invoice line override snapshot (was storing 0 instead of NULL) ──
    it('3. addJobToInvoice with null amount stores NULL — line inherits from job', async () => {
        const jt = await (0, factories_1.createJobType)(ctx.orgId, companyId, { dispatchType: 'fixed', rateOfJob: 500 });
        const dispatcher = await (0, factories_1.createDispatcher)(ctx.orgId);
        const invoice = await (0, factories_1.createInvoice)(ctx.orgId, { dispatcherId: dispatcher.id });
        const job = await (0, job_service_1.createJob)(ctx.orgId, {
            jobDate: '2026-04-22',
            jobTypeId: jt.id,
            dispatcherId: dispatcher.id,
        });
        await (0, jobInvoice_service_1.addJobToInvoice)(ctx.orgId, invoice.id, job.id, /* amount: */ null);
        const lines = await (0, jobInvoice_service_1.listJobsOnInvoice)(invoice.id, ctx.orgId);
        const line = lines.find((l) => l.jobId === job.id);
        expect(line.amount).toBeNull(); // override is NULL
        expect(Number(line.effectiveAmount)).toBe(500); // inherits the calc
    });
    // ─── BUG 4 — listJobs must project jobTypeRateOfJob (was missing) ────────
    it('4. listJobs projects jobTypeRateOfJob from server JOIN (not lookup map)', async () => {
        const jt = await (0, factories_1.createJobType)(ctx.orgId, companyId, { dispatchType: 'load', rateOfJob: 175 });
        await (0, job_service_1.createJob)(ctx.orgId, { jobDate: '2026-04-23', jobTypeId: jt.id, loads: 2 });
        const result = await (0, job_service_1.listJobs)(ctx.orgId, (0, types_1.normalizePagination)({}));
        const found = result.data.find((j) => j.jobTypeId === jt.id);
        expect(found).toBeDefined();
        expect(Number(found.jobTypeRateOfJob)).toBe(175);
        expect(found.jobTypeDispatchType).toBe('load');
    });
    // ─── BUG 5 — no auto-calc on save (amount: null should stay NULL) ────────
    it('5. createJob({amount: null}) stores NULL — view does the computing', async () => {
        const jt = await (0, factories_1.createJobType)(ctx.orgId, companyId, { dispatchType: 'hourly', rateOfJob: 50 });
        const job = await (0, job_service_1.createJob)(ctx.orgId, {
            jobDate: '2026-04-24',
            jobTypeId: jt.id,
            startTime: '2026-04-24T08:00:00Z',
            endTime: '2026-04-24T10:00:00Z',
            amount: null,
        });
        // Re-fetch directly from Jobs to confirm the column is NULL (not 100).
        const [row] = await (0, connection_1.query)(`SELECT amount FROM Jobs WHERE id = @id`, { params: { id: job.id } });
        expect(row.amount).toBeNull();
    });
    // ─── BUG 6 — no backfill when JobType rate changes ───────────────────────
    it('6. updateJobType({rateOfJob: X}) does not touch Jobs.amount', async () => {
        const jt = await (0, factories_1.createJobType)(ctx.orgId, companyId, { dispatchType: 'fixed', rateOfJob: 100 });
        const job = await (0, job_service_1.createJob)(ctx.orgId, { jobDate: '2026-04-25', jobTypeId: jt.id });
        // Confirm starting state
        let [row] = await (0, connection_1.query)(`SELECT amount FROM Jobs WHERE id = @id`, { params: { id: job.id } });
        expect(row.amount).toBeNull();
        await (0, jobType_service_1.updateJobType)(ctx.orgId, { id: jt.id, rateOfJob: 999 });
        [row] = await (0, connection_1.query)(`SELECT amount FROM Jobs WHERE id = @id`, { params: { id: job.id } });
        expect(row.amount).toBeNull(); // STILL null — no backfill
    });
    // ─── BUG 7 — day-shift bug on bare YYYY-MM-DD ────────────────────────────
    it('7. parseTimeInputToUTC: bare "07:00" + jobDate does not drift the day', () => {
        // April 20 2026 (EDT): 7am ET = 11:00 UTC.
        const utc = (0, timezone_1.parseTimeInputToUTC)('2026-04-20', '07:00');
        expect(utc).not.toBeNull();
        expect(utc.toISOString()).toBe('2026-04-20T11:00:00.000Z');
        // The UTC instant maps back to Eastern April 20 (not April 19 / 21).
    });
    // ─── BUG 8 — outstanding total uses effectiveAmount ──────────────────────
    it('8. totalOutstanding uses effectiveAmount, not raw JobInvoice.amount', async () => {
        const { getDashboardStats } = await Promise.resolve().then(() => __importStar(require('../../services/analytics.service')));
        const stats = await getDashboardStats(ctx.orgId);
        // We've added test data above. The outstanding total should be a finite,
        // non-NaN number — even though most JobInvoice.amount columns are NULL.
        expect(stats.invoices.totalOutstanding).not.toBeNull();
        expect(Number.isFinite(Number(stats.invoices.totalOutstanding))).toBe(true);
        expect(Number(stats.invoices.totalOutstanding)).toBeGreaterThan(0);
    });
    // ─── Bonus — confirm the dispatchType mixed-case fix from this sprint ────
    it('Bonus: mixed-case "Hourly" computes correctly in TS', () => {
        const r = (0, job_service_1.computeJobAmountFromInputs)({
            rateOfJob: 110,
            dispatchType: 'Hourly',
            startTime: '2026-04-20T12:00:00Z',
            endTime: '2026-04-20T21:30:00Z',
        });
        expect(r).toBeCloseTo(1045, 2);
    });
    it('Bonus: amount override survives updateJob that doesn\'t mention amount', async () => {
        const jt = await (0, factories_1.createJobType)(ctx.orgId, companyId, { dispatchType: 'fixed', rateOfJob: 100 });
        const job = await (0, job_service_1.createJob)(ctx.orgId, {
            jobDate: '2026-04-26',
            jobTypeId: jt.id,
            amount: 999,
        });
        await (0, job_service_1.updateJob)(ctx.orgId, { id: job.id, driverPaid: true });
        const [row] = await (0, connection_1.query)(`SELECT amount FROM Jobs WHERE id = @id`, { params: { id: job.id } });
        expect(Number(row.amount)).toBe(999); // preserved
    });
});
