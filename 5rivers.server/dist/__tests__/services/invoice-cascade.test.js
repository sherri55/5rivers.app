"use strict";
/**
 * Service-layer test for the end-to-end invoice cascade.
 *
 * Walks a single job through every override permutation and asserts
 * `effectiveAmount` on the invoice line tracks the cascade correctly.
 * This is the headline test for "is the invoice line price right?".
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
const jobInvoice_service_1 = require("../../services/jobInvoice.service");
const job_service_1 = require("../../services/job.service");
const helpers_1 = require("../helpers");
const factories_1 = require("../helpers/factories");
let ctx;
let invoiceId;
let jobTypeId;
let jobId;
let dispatcherId;
beforeAll(async () => {
    ctx = await (0, helpers_1.createTestOrgAndUser)();
    const company = await (0, factories_1.createCompany)(ctx.orgId);
    const jt = await (0, factories_1.createJobType)(ctx.orgId, company.id, {
        dispatchType: 'hourly',
        rateOfJob: 100,
    });
    jobTypeId = jt.id;
    const dispatcher = await (0, factories_1.createDispatcher)(ctx.orgId);
    dispatcherId = dispatcher.id;
    const invoice = await (0, factories_1.createInvoice)(ctx.orgId, { dispatcherId });
    invoiceId = invoice.id;
    // One job: 10h × $100 = $1,000 base calculation
    const job = await (0, factories_1.createJob)(ctx.orgId, jobTypeId, {
        dispatcherId,
        startTime: '2026-04-20T12:00:00Z',
        endTime: '2026-04-20T22:00:00Z',
    });
    jobId = job.id;
    await (0, jobInvoice_service_1.addJobToInvoice)(ctx.orgId, invoiceId, jobId, /* amount: */ null);
}, 30_000);
afterAll(async () => {
    await (0, helpers_1.deleteTestData)(ctx.orgId, ctx.userId);
}, 30_000);
async function getLine() {
    const lines = await (0, jobInvoice_service_1.listJobsOnInvoice)(invoiceId, ctx.orgId);
    return lines.find((l) => l.jobId === jobId);
}
describe('Invoice cascade — single job, every override state', () => {
    it('Step 1: both NULL → effectiveAmount = $1,000 (computed)', async () => {
        const line = await getLine();
        expect(Number(line.effectiveAmount)).toBeCloseTo(1000, 2);
        expect(line.amount).toBeNull();
    });
    it('Step 2: change JobType rate to $200 → effectiveAmount = $2,000', async () => {
        // Bypassing updateJobType to avoid any side effects — direct SQL.
        const { query } = await Promise.resolve().then(() => __importStar(require('../../db/connection')));
        await query(`UPDATE JobTypes SET rateOfJob = 200 WHERE id = @id`, { params: { id: jobTypeId } });
        const line = await getLine();
        expect(Number(line.effectiveAmount)).toBeCloseTo(2000, 2);
        expect(line.amount).toBeNull(); // override column untouched
        // Reset for subsequent steps
        await query(`UPDATE JobTypes SET rateOfJob = 100 WHERE id = @id`, { params: { id: jobTypeId } });
    });
    it('Step 3: job override $1,500 → effectiveAmount = $1,500', async () => {
        await (0, job_service_1.updateJob)(ctx.orgId, { id: jobId, amount: 1500 });
        const line = await getLine();
        expect(Number(line.effectiveAmount)).toBeCloseTo(1500, 2);
    });
    it('Step 4: add a line override $1,800 → effectiveAmount = $1,800 (line beats job)', async () => {
        await (0, jobInvoice_service_1.updateJobInvoiceAmount)(ctx.orgId, invoiceId, jobId, 1800);
        const line = await getLine();
        expect(Number(line.effectiveAmount)).toBeCloseTo(1800, 2);
        expect(Number(line.amount)).toBeCloseTo(1800, 2);
    });
    it('Step 5: clear line override (set 0) honors zero', async () => {
        await (0, jobInvoice_service_1.updateJobInvoiceAmount)(ctx.orgId, invoiceId, jobId, 0);
        const line = await getLine();
        expect(Number(line.effectiveAmount)).toBe(0);
    });
    it('Step 6: clear job override → invoice line still has $0 from step 5', async () => {
        await (0, job_service_1.updateJob)(ctx.orgId, { id: jobId, amount: null });
        const line = await getLine();
        // Line override (0) still wins
        expect(Number(line.effectiveAmount)).toBe(0);
    });
});
