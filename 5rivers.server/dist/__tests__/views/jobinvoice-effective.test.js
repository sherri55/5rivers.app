"use strict";
/**
 * Integration tests for the `vJobInvoiceEffective` SQL view.
 *
 * The view cascades: job-line override → job override → calculated.
 * Each test below sets up one combination of (Jobs.amount, JobInvoice.amount)
 * and asserts the view's effectiveAmount.
 *
 * Test data is built once in beforeAll: 1 company, 1 job type
 * (hourly $100/hr), 1 invoice. Individual tests create a fresh job + line
 * pair per case so they don't interfere.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const connection_1 = require("../../db/connection");
const helpers_1 = require("../helpers");
const factories_1 = require("../helpers/factories");
let ctx;
let invoiceId;
let jobTypeId;
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
    const invoice = await (0, factories_1.createInvoice)(ctx.orgId, { dispatcherId: dispatcher.id });
    invoiceId = invoice.id;
}, 30_000);
afterAll(async () => {
    await (0, helpers_1.deleteTestData)(ctx.orgId, ctx.userId);
}, 30_000);
/** Build a fresh 10h-shift job assigned to the invoice's dispatcher,
 *  add it to the invoice, return the job row. */
async function makeBilledJob(jobAmount, lineAmount) {
    const job = await (0, factories_1.createJob)(ctx.orgId, jobTypeId, {
        dispatcherId,
        startTime: '2026-04-20T12:00:00Z',
        endTime: '2026-04-20T22:00:00Z', // 10h → would calc to $1,000
        amount: jobAmount,
    });
    await (0, factories_1.addJobToInvoice)(ctx.orgId, invoiceId, job.id, lineAmount);
    return job;
}
async function getEffective(jobId) {
    const rows = await (0, connection_1.query)(`SELECT effectiveAmount FROM vJobInvoiceEffective WHERE invoiceId = @inv AND jobId = @id`, { params: { inv: invoiceId, id: jobId } });
    const v = rows[0]?.effectiveAmount;
    return v == null ? null : Number(v);
}
describe('vJobInvoiceEffective — two-level cascade', () => {
    it('both NULL → inherits computed value ($1,000)', async () => {
        const job = await makeBilledJob(null, null);
        expect(await getEffective(job.id)).toBeCloseTo(1000, 2);
    });
    it('job override only → uses job override ($800)', async () => {
        const job = await makeBilledJob(800, null);
        expect(await getEffective(job.id)).toBeCloseTo(800, 2);
    });
    it('line override only → uses line override ($950)', async () => {
        const job = await makeBilledJob(null, 950);
        expect(await getEffective(job.id)).toBeCloseTo(950, 2);
    });
    it('both overrides set → line override wins', async () => {
        const job = await makeBilledJob(800, 950);
        expect(await getEffective(job.id)).toBeCloseTo(950, 2);
    });
    it('line override of 0 honored (zero is an explicit value)', async () => {
        const job = await makeBilledJob(800, 0);
        expect(await getEffective(job.id)).toBe(0);
    });
    it('job override of 0 honored when no line override', async () => {
        const job = await makeBilledJob(0, null);
        expect(await getEffective(job.id)).toBe(0);
    });
    it('JobType rate change cascades through both nulls', async () => {
        const job = await makeBilledJob(null, null);
        expect(await getEffective(job.id)).toBeCloseTo(1000, 2);
        await (0, connection_1.query)(`UPDATE JobTypes SET rateOfJob = 250 WHERE id = @id`, { params: { id: jobTypeId } });
        expect(await getEffective(job.id)).toBeCloseTo(2500, 2);
        // Restore for subsequent tests
        await (0, connection_1.query)(`UPDATE JobTypes SET rateOfJob = 100 WHERE id = @id`, { params: { id: jobTypeId } });
    });
    it('rate cleared on JobType → effectiveAmount becomes NULL', async () => {
        const job = await makeBilledJob(null, null);
        await (0, connection_1.query)(`UPDATE JobTypes SET rateOfJob = NULL WHERE id = @id`, { params: { id: jobTypeId } });
        expect(await getEffective(job.id)).toBeNull();
        // Restore
        await (0, connection_1.query)(`UPDATE JobTypes SET rateOfJob = 100 WHERE id = @id`, { params: { id: jobTypeId } });
    });
    it('removing a job from invoice removes it from the view', async () => {
        const job = await makeBilledJob(null, null);
        expect(await getEffective(job.id)).toBeCloseTo(1000, 2);
        await (0, connection_1.query)(`DELETE FROM JobInvoice WHERE jobId = @id`, { params: { id: job.id } });
        expect(await getEffective(job.id)).toBeNull();
    });
    it('counts: vJobInvoiceEffective row count == JobInvoice row count', async () => {
        const [a] = await (0, connection_1.query)(`SELECT COUNT(*) AS n FROM JobInvoice WHERE invoiceId = @inv`, { params: { inv: invoiceId } });
        const [b] = await (0, connection_1.query)(`SELECT COUNT(*) AS n FROM vJobInvoiceEffective WHERE invoiceId = @inv`, { params: { inv: invoiceId } });
        expect(b.n).toBe(a.n);
    });
});
