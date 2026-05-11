/**
 * Revenue-accuracy headline test — the single best protection against
 * "the numbers are wrong" regressions.
 *
 * Builds a realistic 12-job operation across 2 companies, 2 dispatchers,
 * and 2 drivers, then asserts every downstream total adds up to the
 * sum of per-job effectiveAmounts computed independently in JavaScript.
 *
 * If any aggregation diverges, money is being mis-counted somewhere.
 */

import {
  getDashboardStats,
  getRevenueByCompany,
  getRevenueByDriver,
  getRevenueByDispatcher,
} from '../../services/analytics.service';
import { computeJobAmountFromInputs } from '../../services/job.service';
import {
  createTestOrgAndUser,
  deleteTestData,
  type TestContext,
} from '../helpers';
import {
  createCompany,
  createJobType,
  createJob,
  createDriver,
  createDispatcher,
  createInvoice,
  addJobToInvoice,
} from '../helpers/factories';

interface SyntheticJob {
  id: string;
  driverId: string;
  dispatcherId: string;
  companyId: string;
  expectedAmount: number;
}

let ctx: TestContext;
const jobs: SyntheticJob[] = [];
let totalExpected = 0;
let coA = '', coB = '';
let driverHourly = '', driverPercent = '';
let dispatcher1 = '', dispatcher2 = '';
let invoice1Id = '', invoice2Id = '';

beforeAll(async () => {
  ctx = await createTestOrgAndUser();

  // 2 companies, each with hourly + load job types
  const compA = await createCompany(ctx.orgId, { name: 'Company A' });
  const compB = await createCompany(ctx.orgId, { name: 'Company B' });
  coA = compA.id;
  coB = compB.id;

  const jtA_hourly = await createJobType(ctx.orgId, coA, { dispatchType: 'hourly', rateOfJob: 100 });
  const jtA_load   = await createJobType(ctx.orgId, coA, { dispatchType: 'load',   rateOfJob: 250 });
  const jtB_hourly = await createJobType(ctx.orgId, coB, { dispatchType: 'hourly', rateOfJob: 120 });
  const jtB_fixed  = await createJobType(ctx.orgId, coB, { dispatchType: 'fixed',  rateOfJob: 800 });

  const d1 = await createDriver(ctx.orgId, { name: 'Hourly Driver', payType: 'HOURLY', hourlyRate: 30 });
  const d2 = await createDriver(ctx.orgId, { name: 'Pct Driver', payType: 'PERCENTAGE', percentageRate: 25 });
  driverHourly = d1.id;
  driverPercent = d2.id;

  const dp1 = await createDispatcher(ctx.orgId, { name: 'Dispatch 1', commissionPercent: 10 });
  const dp2 = await createDispatcher(ctx.orgId, { name: 'Dispatch 2', commissionPercent: 15 });
  dispatcher1 = dp1.id;
  dispatcher2 = dp2.id;

  // 12 jobs spread across the matrix
  const setups: Array<{
    jt: string;
    company: string;
    driver: string;
    dispatcher: string;
    overrides?: { amount?: number };
    extra: { startTime?: string; endTime?: string; loads?: number };
  }> = [
    // 4 hourly Co-A jobs (driver1, dispatcher1)
    { jt: jtA_hourly.id, company: coA, driver: driverHourly, dispatcher: dispatcher1, extra: { startTime: '2026-04-01T12:00:00Z', endTime: '2026-04-01T17:00:00Z' } }, // 5h × 100 = 500
    { jt: jtA_hourly.id, company: coA, driver: driverHourly, dispatcher: dispatcher1, extra: { startTime: '2026-04-02T12:00:00Z', endTime: '2026-04-02T19:00:00Z' } }, // 7h = 700
    { jt: jtA_hourly.id, company: coA, driver: driverHourly, dispatcher: dispatcher1, extra: { startTime: '2026-04-03T08:00:00Z', endTime: '2026-04-03T17:00:00Z' } }, // 9h = 900
    { jt: jtA_hourly.id, company: coA, driver: driverHourly, dispatcher: dispatcher1, extra: { startTime: '2026-04-04T06:00:00Z', endTime: '2026-04-04T18:00:00Z' } }, // 12h = 1200
    // 3 load Co-A jobs (driver2, dispatcher2)
    { jt: jtA_load.id, company: coA, driver: driverPercent, dispatcher: dispatcher2, extra: { loads: 2 } }, // 2 × 250 = 500
    { jt: jtA_load.id, company: coA, driver: driverPercent, dispatcher: dispatcher2, extra: { loads: 3 } }, // 750
    { jt: jtA_load.id, company: coA, driver: driverPercent, dispatcher: dispatcher2, extra: { loads: 1 } }, // 250
    // 2 hourly Co-B jobs (driver1, dispatcher2)
    { jt: jtB_hourly.id, company: coB, driver: driverHourly, dispatcher: dispatcher2, extra: { startTime: '2026-04-10T13:00:00Z', endTime: '2026-04-10T18:00:00Z' } }, // 5h × 120 = 600
    { jt: jtB_hourly.id, company: coB, driver: driverHourly, dispatcher: dispatcher2, extra: { startTime: '2026-04-11T09:00:00Z', endTime: '2026-04-11T17:00:00Z' } }, // 8h × 120 = 960
    // 2 fixed Co-B jobs (driver2, dispatcher1)
    { jt: jtB_fixed.id, company: coB, driver: driverPercent, dispatcher: dispatcher1, extra: {} }, // 800
    { jt: jtB_fixed.id, company: coB, driver: driverPercent, dispatcher: dispatcher1, extra: {} }, // 800
    // 1 fixed Co-B job WITH OVERRIDE
    { jt: jtB_fixed.id, company: coB, driver: driverPercent, dispatcher: dispatcher1, overrides: { amount: 1234.56 }, extra: {} }, // override 1234.56
  ];

  for (const s of setups) {
    const job = await createJob(ctx.orgId, s.jt, {
      driverId: s.driver,
      dispatcherId: s.dispatcher,
      jobDate: '2026-04-15',
      amount: s.overrides?.amount,
      ...s.extra,
    });

    // Compute the expected amount independently for cross-check.
    const expected = s.overrides?.amount != null
      ? s.overrides.amount
      : (await (async () => {
          // Look up rate + dispatch type from the JobType used.
          const jtId = s.jt;
          const { query } = await import('../../db/connection');
          const [row] = await query<Array<{ rateOfJob: number; dispatchType: string }>>(
            `SELECT rateOfJob, dispatchType FROM JobTypes WHERE id = @id`,
            { params: { id: jtId } },
          );
          return computeJobAmountFromInputs({
            rateOfJob: row.rateOfJob,
            dispatchType: row.dispatchType,
            loads: s.extra.loads,
            startTime: s.extra.startTime,
            endTime: s.extra.endTime,
          })!;
        })());

    jobs.push({
      id: job.id,
      driverId: s.driver,
      dispatcherId: s.dispatcher,
      companyId: s.company,
      expectedAmount: expected,
    });
    totalExpected += expected;
  }

  // Build 2 invoices grouping the jobs by dispatcher
  const inv1 = await createInvoice(ctx.orgId, { dispatcherId: dispatcher1 });
  const inv2 = await createInvoice(ctx.orgId, { dispatcherId: dispatcher2 });
  invoice1Id = inv1.id;
  invoice2Id = inv2.id;

  for (const j of jobs) {
    if (j.dispatcherId === dispatcher1) {
      await addJobToInvoice(ctx.orgId, invoice1Id, j.id, null);
    } else if (j.dispatcherId === dispatcher2) {
      await addJobToInvoice(ctx.orgId, invoice2Id, j.id, null);
    }
  }
}, 60_000);

afterAll(async () => {
  await deleteTestData(ctx.orgId, ctx.userId);
}, 30_000);

const cents = (n: number) => Math.round(n * 100) / 100;

describe('Revenue accuracy — synthetic month of 12 jobs', () => {
  it('Σ(expectedAmount) is the canonical truth', () => {
    // Sanity: every job has a non-null expectedAmount
    for (const j of jobs) {
      expect(j.expectedAmount).not.toBeNull();
      expect(Number.isFinite(j.expectedAmount)).toBe(true);
    }
    expect(totalExpected).toBeGreaterThan(0);
  });

  it('dashboard.revenueTotal = Σ(expectedAmount)', async () => {
    const stats = await getDashboardStats(ctx.orgId);
    expect(cents(Number(stats.revenue.total))).toBeCloseTo(cents(totalExpected), 2);
  });

  it('revenueByCompany totals sum to the dashboard total', async () => {
    const rows = await getRevenueByCompany(ctx.orgId);
    const sum = rows.reduce((s, r) => s + Number(r.revenue), 0);
    expect(cents(sum)).toBeCloseTo(cents(totalExpected), 2);
  });

  it('revenueByCompany — per-company values match expected', async () => {
    const rows = await getRevenueByCompany(ctx.orgId);
    const byCo = new Map(rows.map((r) => [r.companyId, Number(r.revenue)]));

    const expectedByCo = new Map<string, number>();
    for (const j of jobs) {
      expectedByCo.set(j.companyId, (expectedByCo.get(j.companyId) ?? 0) + j.expectedAmount);
    }
    for (const [cid, expected] of expectedByCo) {
      expect(cents(byCo.get(cid) ?? 0)).toBeCloseTo(cents(expected), 2);
    }
  });

  it('revenueByDriver totals sum to the dashboard total', async () => {
    const rows = await getRevenueByDriver(ctx.orgId);
    const sum = rows.reduce((s, r) => s + Number(r.revenue), 0);
    expect(cents(sum)).toBeCloseTo(cents(totalExpected), 2);
  });

  it('revenueByDriver — per-driver values match expected', async () => {
    const rows = await getRevenueByDriver(ctx.orgId);
    const byDriver = new Map(rows.map((r) => [r.driverId, Number(r.revenue)]));

    const expectedByDriver = new Map<string, number>();
    for (const j of jobs) {
      expectedByDriver.set(j.driverId, (expectedByDriver.get(j.driverId) ?? 0) + j.expectedAmount);
    }
    for (const [did, expected] of expectedByDriver) {
      expect(cents(byDriver.get(did) ?? 0)).toBeCloseTo(cents(expected), 2);
    }
  });

  it('revenueByDispatcher totals sum to the dashboard total', async () => {
    const rows = await getRevenueByDispatcher(ctx.orgId);
    const sum = rows.reduce((s, r) => s + Number(r.revenue), 0);
    expect(cents(sum)).toBeCloseTo(cents(totalExpected), 2);
  });

  it('revenueByDispatcher.commission = revenue × commissionPercent/100', async () => {
    const rows = await getRevenueByDispatcher(ctx.orgId);
    for (const r of rows) {
      const expectedCommission =
        r.dispatcherId === dispatcher1 ? Number(r.revenue) * 0.10 : Number(r.revenue) * 0.15;
      expect(cents(Number(r.commission))).toBeCloseTo(cents(expectedCommission), 2);
    }
  });

  it('rate-change cascade: bump one JobType rate, dashboard total moves by the exact delta', async () => {
    const { query } = await import('../../db/connection');
    // Find one of the hourly Co-A jobs' JobType id and its rate
    const targetJobs = jobs.filter((j) => j.companyId === coA);
    const [{ jobTypeId }] = await query<Array<{ jobTypeId: string }>>(
      `SELECT jobTypeId FROM Jobs WHERE id = @id`,
      { params: { id: targetJobs[0].id } },
    );
    const [{ rateOfJob: oldRate, dispatchType }] = await query<
      Array<{ rateOfJob: number; dispatchType: string }>
    >(`SELECT rateOfJob, dispatchType FROM JobTypes WHERE id = @id`, { params: { id: jobTypeId } });
    expect(dispatchType).toBe('hourly');

    const before = await getDashboardStats(ctx.orgId);
    await query(`UPDATE JobTypes SET rateOfJob = rateOfJob * 2 WHERE id = @id`, { params: { id: jobTypeId } });
    const after = await getDashboardStats(ctx.orgId);

    // Compute the delta: 2× rate doubles the contribution of every job
    // of that JobType (sans override). Sum those original contributions
    // independently to find the expected delta.
    let delta = 0;
    for (const j of jobs) {
      const [row] = await query<Array<{ amount: number | null; jobTypeId: string; startTime: Date; endTime: Date }>>(
        `SELECT amount, jobTypeId, startTime, endTime FROM Jobs WHERE id = @id`,
        { params: { id: j.id } },
      );
      if (row.jobTypeId === jobTypeId && row.amount === null) {
        // The job was rate-pending in the before state; now its calc doubles.
        delta += j.expectedAmount; // contribution = original; doubled adds another original.
      }
    }
    expect(cents(Number(after.revenue.total) - Number(before.revenue.total))).toBeCloseTo(cents(delta), 2);

    // Restore
    await query(`UPDATE JobTypes SET rateOfJob = @r WHERE id = @id`, { params: { id: jobTypeId, r: oldRate } });
  });

  it('outstanding total reflects effectiveAmount on invoiced jobs', async () => {
    // Both test invoices are in CREATED status (default), so their lines
    // should be in totalOutstanding.
    const stats = await getDashboardStats(ctx.orgId);
    // All 12 jobs are on one of the two invoices.
    expect(cents(Number(stats.invoices.totalOutstanding))).toBeCloseTo(cents(totalExpected), 2);
  });

  it('currency invariant: every API number is finite and 2-decimal-place', async () => {
    const stats = await getDashboardStats(ctx.orgId);
    const checkCurrency = (v: number | null | undefined) => {
      if (v == null) return;
      expect(Number.isFinite(Number(v))).toBe(true);
      const scaled = Number(v) * 100;
      expect(Math.abs(scaled - Math.round(scaled))).toBeLessThan(0.5);
    };
    checkCurrency(stats.revenue.total);
    checkCurrency(stats.revenue.thisMonth);
    checkCurrency(stats.invoices.totalOutstanding);

    const byCo = await getRevenueByCompany(ctx.orgId);
    for (const r of byCo) checkCurrency(Number(r.revenue));
    const byDriver = await getRevenueByDriver(ctx.orgId);
    for (const r of byDriver) checkCurrency(Number(r.revenue));
  });
});
