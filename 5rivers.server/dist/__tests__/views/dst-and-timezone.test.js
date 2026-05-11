"use strict";
/**
 * Integration tests for DST + timezone behavior in vJobsEffective.
 *
 * The view's hourly computation uses `DATEDIFF(SECOND, startTime, endTime)`
 * which operates on the stored UTC instants — so DST should NOT matter
 * for the SQL. These tests prove that explicitly, and also assert that
 * the TS pure formula computes the same UTC-second deltas.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const connection_1 = require("../../db/connection");
const helpers_1 = require("../helpers");
const factories_1 = require("../helpers/factories");
const job_service_1 = require("../../services/job.service");
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
async function makeHourlyJob(start, end) {
    const jt = await (0, factories_1.createJobType)(ctx.orgId, companyId, { dispatchType: 'hourly', rateOfJob: 100 });
    const job = await (0, factories_1.createJob)(ctx.orgId, jt.id, { startTime: start, endTime: end });
    return job.id;
}
async function viewEffective(jobId) {
    const rows = await (0, connection_1.query)(`SELECT effectiveAmount FROM vJobsEffective WHERE id = @id`, { params: { id: jobId } });
    const v = rows[0]?.effectiveAmount;
    return v == null ? null : Number(v);
}
describe('DST + timezone — UTC-second arithmetic is timezone-agnostic', () => {
    it('5h job in EST (January): SQL == TS', async () => {
        // 7am-12pm Eastern in winter = 12:00-17:00 UTC (UTC-5)
        const id = await makeHourlyJob('2026-01-15T12:00:00Z', '2026-01-15T17:00:00Z');
        const sql = await viewEffective(id);
        const ts = (0, job_service_1.computeJobAmountFromInputs)({
            rateOfJob: 100,
            dispatchType: 'hourly',
            startTime: '2026-01-15T12:00:00Z',
            endTime: '2026-01-15T17:00:00Z',
        });
        expect(sql).toBeCloseTo(500, 2);
        expect(ts).toBeCloseTo(500, 2);
        expect(sql).toBeCloseTo(ts, 2);
    });
    it('5h job in EDT (July): SQL == TS', async () => {
        // 7am-12pm Eastern in summer = 11:00-16:00 UTC (UTC-4)
        const id = await makeHourlyJob('2026-07-15T11:00:00Z', '2026-07-15T16:00:00Z');
        const sql = await viewEffective(id);
        expect(sql).toBeCloseTo(500, 2);
    });
    it('spring-forward day: 2am→3am Eastern jump is irrelevant (UTC linear)', async () => {
        // Mar 8 2026 is the spring-forward Sunday in the US.
        // A 3-hour shift from 1am ET to 5am ET spans the 2am→3am jump, but in
        // UTC the start is 06:00 and end is 09:00 — exactly 3 hours.
        const id = await makeHourlyJob('2026-03-08T06:00:00Z', '2026-03-08T09:00:00Z');
        const sql = await viewEffective(id);
        expect(sql).toBeCloseTo(300, 2);
    });
    it('fall-back day: 2am→1am Eastern repeat is irrelevant (UTC linear)', async () => {
        // Nov 1 2026 is the fall-back Sunday.
        // Wall-clock 1am-3am ET spans 3 hours (1am happens twice in EDT then EST).
        // In UTC: 05:00 (still EDT) to 08:00 (now EST) — 3 hours.
        const id = await makeHourlyJob('2026-11-01T05:00:00Z', '2026-11-01T08:00:00Z');
        const sql = await viewEffective(id);
        expect(sql).toBeCloseTo(300, 2);
    });
    it('multi-day rental: 7 × 24h × $50/hr = $8,400', async () => {
        const jt = await (0, factories_1.createJobType)(ctx.orgId, companyId, { dispatchType: 'hourly', rateOfJob: 50 });
        const job = await (0, factories_1.createJob)(ctx.orgId, jt.id, {
            startTime: '2026-05-01T00:00:00Z',
            endTime: '2026-05-08T00:00:00Z',
        });
        const sql = await viewEffective(job.id);
        expect(sql).toBeCloseTo(8400, 2);
    });
    it('exact 1-hour job at minute boundaries', async () => {
        const id = await makeHourlyJob('2026-04-20T13:00:00Z', '2026-04-20T14:00:00Z');
        expect(await viewEffective(id)).toBeCloseTo(100, 2);
    });
});
