"use strict";
/**
 * Service-layer test: changing a JobType's rateOfJob does NOT touch
 * `Jobs.amount` for any existing job. The displayed/billed amount
 * cascades through vJobsEffective at read time — that's the whole
 * point of the dynamic-calc model.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const connection_1 = require("../../db/connection");
const jobType_service_1 = require("../../services/jobType.service");
const helpers_1 = require("../helpers");
const factories_1 = require("../helpers/factories");
let ctx;
let jobTypeId;
let jobIds = [];
beforeAll(async () => {
    ctx = await (0, helpers_1.createTestOrgAndUser)();
    const company = await (0, factories_1.createCompany)(ctx.orgId);
    const jt = await (0, factories_1.createJobType)(ctx.orgId, company.id, {
        dispatchType: 'load',
        rateOfJob: 50,
    });
    jobTypeId = jt.id;
    // Three jobs of this type, each with `loads = 2` (so calc = 50 × 2 = 100)
    // None of them have an explicit amount override.
    for (let i = 0; i < 3; i++) {
        const job = await (0, factories_1.createJob)(ctx.orgId, jobTypeId, {
            loads: 2,
            jobDate: `2026-04-${20 + i}`,
        });
        jobIds.push(job.id);
    }
}, 30_000);
afterAll(async () => {
    await (0, helpers_1.deleteTestData)(ctx.orgId, ctx.userId);
}, 30_000);
async function readJobAmountsAndEffective() {
    const rows = await (0, connection_1.query)(`SELECT id, amount, effectiveAmount FROM vJobsEffective WHERE jobTypeId = @id ORDER BY jobDate`, { params: { id: jobTypeId } });
    return rows;
}
describe('JobType rate change — no Jobs.amount mutation', () => {
    it('all jobs start with Jobs.amount = NULL and effectiveAmount = $100', async () => {
        const rows = await readJobAmountsAndEffective();
        expect(rows).toHaveLength(3);
        for (const r of rows) {
            expect(r.amount).toBeNull();
            expect(Number(r.effectiveAmount)).toBeCloseTo(100, 2);
        }
    });
    it('updateJobType to rateOfJob=80 → Jobs.amount STILL NULL for all', async () => {
        await (0, jobType_service_1.updateJobType)(ctx.orgId, { id: jobTypeId, rateOfJob: 80 });
        const rows = await readJobAmountsAndEffective();
        for (const r of rows) {
            expect(r.amount).toBeNull();
        }
    });
    it('effectiveAmount cascades to new value (rate=80, loads=2 → $160)', async () => {
        const rows = await readJobAmountsAndEffective();
        for (const r of rows) {
            expect(Number(r.effectiveAmount)).toBeCloseTo(160, 2);
        }
    });
    it('clearing the rate → effectiveAmount becomes NULL (rate pending)', async () => {
        await (0, jobType_service_1.updateJobType)(ctx.orgId, { id: jobTypeId, rateOfJob: null });
        const rows = await readJobAmountsAndEffective();
        for (const r of rows) {
            expect(r.amount).toBeNull();
            expect(r.effectiveAmount == null).toBe(true);
        }
    });
    it('setting rate back → effectiveAmount comes back', async () => {
        await (0, jobType_service_1.updateJobType)(ctx.orgId, { id: jobTypeId, rateOfJob: 75 });
        const rows = await readJobAmountsAndEffective();
        for (const r of rows) {
            expect(r.amount).toBeNull();
            expect(Number(r.effectiveAmount)).toBeCloseTo(150, 2); // 75 × 2
        }
    });
});
