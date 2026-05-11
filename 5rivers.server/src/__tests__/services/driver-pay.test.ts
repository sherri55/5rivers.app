/**
 * Service-layer tests for driver-pay calculation.
 *
 * Asserts:
 *   • HOURLY drivers: hourlyRate × hours (independent of job effectiveAmount)
 *   • PERCENTAGE drivers: jobAmount (from vJobsEffective) × percentageRate / 100
 *   • PERCENTAGE drivers reflect JobType rate changes (via the view)
 *   • totals aggregate correctly across multiple jobs per driver
 */

import { listDriverPaySummaries } from '../../services/driverPay.service';
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
} from '../helpers/factories';
import { query } from '../../db/connection';

let ctx: TestContext;
let jobTypeId: string;
let driverHourly: string;
let driverPct25: string;
let driverPct50: string;

beforeAll(async () => {
  ctx = await createTestOrgAndUser();
  const company = await createCompany(ctx.orgId);
  const jt = await createJobType(ctx.orgId, company.id, {
    dispatchType: 'hourly',
    rateOfJob: 100,
  });
  jobTypeId = jt.id;

  // HOURLY driver — paid hourly, irrespective of job's effective amount
  const dh = await createDriver(ctx.orgId, {
    name: 'Hourly Hank',
    payType: 'HOURLY',
    hourlyRate: 30,
  });
  driverHourly = dh.id;

  // PERCENTAGE driver — paid % of jobAmount
  const dp25 = await createDriver(ctx.orgId, {
    name: 'Quarter Quinn',
    payType: 'PERCENTAGE',
    percentageRate: 25,
  });
  driverPct25 = dp25.id;

  const dp50 = await createDriver(ctx.orgId, {
    name: 'Half Hannah',
    payType: 'PERCENTAGE',
    percentageRate: 50,
  });
  driverPct50 = dp50.id;

  // 3 hourly jobs assigned to the hourly driver: 5h, 8h, 10h
  for (const [start, end] of [['08:00', '13:00'], ['08:00', '16:00'], ['08:00', '18:00']]) {
    await createJob(ctx.orgId, jobTypeId, {
      driverId: driverHourly,
      startTime: `2026-04-01T${start}:00Z`,
      endTime: `2026-04-01T${end}:00Z`,
    });
  }

  // 2 jobs for driverPct25 — each 5h × $100/hr = $500 effectiveAmount → 25% = $125 each
  for (let i = 0; i < 2; i++) {
    await createJob(ctx.orgId, jobTypeId, {
      driverId: driverPct25,
      startTime: '2026-04-02T08:00:00Z',
      endTime: '2026-04-02T13:00:00Z',
    });
  }

  // 1 job for driverPct50 — 5h × $100/hr = $500 → 50% = $250
  await createJob(ctx.orgId, jobTypeId, {
    driverId: driverPct50,
    startTime: '2026-04-03T08:00:00Z',
    endTime: '2026-04-03T13:00:00Z',
  });
}, 30_000);

afterAll(async () => {
  await deleteTestData(ctx.orgId, ctx.userId);
}, 30_000);

describe('listDriverPaySummaries — pay calculation accuracy', () => {
  let summaries: Awaited<ReturnType<typeof listDriverPaySummaries>>;

  beforeAll(async () => {
    summaries = await listDriverPaySummaries(ctx.orgId);
  });

  it('returns one entry per driver', () => {
    expect(summaries.find((s) => s.driverId === driverHourly)).toBeDefined();
    expect(summaries.find((s) => s.driverId === driverPct25)).toBeDefined();
    expect(summaries.find((s) => s.driverId === driverPct50)).toBeDefined();
  });

  it('HOURLY driver: pay = hourlyRate × hours across all jobs (5+8+10 = 23h × $30 = $690)', () => {
    const s = summaries.find((s) => s.driverId === driverHourly)!;
    expect(s.totalEarned).toBeCloseTo(23 * 30, 2);
    expect(s.jobs).toHaveLength(3);
    // Each per-job pay should equal hourlyRate × that job's hours
    const expectedPerJob = [5 * 30, 8 * 30, 10 * 30].sort();
    const actualPerJob = s.jobs.map((j) => j.amount).sort();
    expect(actualPerJob).toEqual(expectedPerJob);
  });

  it('PERCENTAGE 25% driver: pay = jobAmount × 25% × 2 jobs ($500 × 0.25 × 2 = $250)', () => {
    const s = summaries.find((s) => s.driverId === driverPct25)!;
    expect(s.totalEarned).toBeCloseTo(2 * 500 * 0.25, 2);
    expect(s.jobs).toHaveLength(2);
    for (const j of s.jobs) {
      expect(j.amount).toBeCloseTo(500 * 0.25, 2);
    }
  });

  it('PERCENTAGE 50% driver: pay = 1 job × $500 × 50% = $250', () => {
    const s = summaries.find((s) => s.driverId === driverPct50)!;
    expect(s.totalEarned).toBeCloseTo(250, 2);
    expect(s.jobs).toHaveLength(1);
    expect(s.jobs[0].amount).toBeCloseTo(250, 2);
  });

  it('all drivers start with totalPaid = 0 and balance = totalEarned', () => {
    for (const s of summaries) {
      expect(s.totalPaid).toBe(0);
      expect(s.balance).toBeCloseTo(s.totalEarned, 2);
    }
  });

  it('PERCENTAGE driver pay tracks JobType rate changes via vJobsEffective', async () => {
    // Bump rate from 100 → 200; each Pct25 job's contribution doubles.
    await query(`UPDATE JobTypes SET rateOfJob = 200 WHERE id = @id`, { params: { id: jobTypeId } });
    const after = await listDriverPaySummaries(ctx.orgId);
    const s = after.find((x) => x.driverId === driverPct25)!;
    // 2 jobs × ($500 × 2 = $1,000) × 25% = $500
    expect(s.totalEarned).toBeCloseTo(2 * 1000 * 0.25, 2);

    // Restore so subsequent tests aren't affected
    await query(`UPDATE JobTypes SET rateOfJob = 100 WHERE id = @id`, { params: { id: jobTypeId } });
  });

  it('HOURLY driver pay does NOT change when JobType rate changes', async () => {
    const before = await listDriverPaySummaries(ctx.orgId);
    const beforeEarned = before.find((s) => s.driverId === driverHourly)!.totalEarned;

    await query(`UPDATE JobTypes SET rateOfJob = 200 WHERE id = @id`, { params: { id: jobTypeId } });

    const after = await listDriverPaySummaries(ctx.orgId);
    const afterEarned = after.find((s) => s.driverId === driverHourly)!.totalEarned;

    expect(afterEarned).toBeCloseTo(beforeEarned, 2); // pay derived from driver.hourlyRate, not jobType.rate

    await query(`UPDATE JobTypes SET rateOfJob = 100 WHERE id = @id`, { params: { id: jobTypeId } });
  });
});
