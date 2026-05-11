/**
 * Service-layer integration tests for `job.service.ts`.
 *
 * Focuses on the override-only semantics of `Jobs.amount` and the
 * server-joined fields the UI relies on (jobTypeRateOfJob,
 * jobTypeDispatchType, effectiveAmount, etc.).
 */

import {
  createJob,
  updateJob,
  listJobs,
  getJobById,
} from '../../services/job.service';
import {
  createTestOrgAndUser,
  deleteTestData,
  type TestContext,
} from '../helpers';
import { createCompany, createJobType } from '../helpers/factories';
import { normalizePagination } from '../../types';

let ctx: TestContext;
let companyId: string;
let hourlyJobTypeId: string;
let loadJobTypeId: string;

beforeAll(async () => {
  ctx = await createTestOrgAndUser();
  const company = await createCompany(ctx.orgId);
  companyId = company.id;
  const hourly = await createJobType(ctx.orgId, companyId, {
    dispatchType: 'hourly',
    rateOfJob: 120,
  });
  hourlyJobTypeId = hourly.id;
  const load = await createJobType(ctx.orgId, companyId, {
    dispatchType: 'load',
    rateOfJob: 200,
  });
  loadJobTypeId = load.id;
}, 30_000);

afterAll(async () => {
  await deleteTestData(ctx.orgId, ctx.userId);
}, 30_000);

describe('createJob — override-only amount semantics', () => {
  it('amount omitted → stored as NULL, effectiveAmount computed', async () => {
    const job = await createJob(ctx.orgId, {
      jobDate: '2026-04-20',
      jobTypeId: hourlyJobTypeId,
      startTime: '2026-04-20T12:00:00Z',
      endTime: '2026-04-20T17:00:00Z', // 5h × $120 = $600
    });
    expect(job.amount).toBeNull();

    const fetched = await getJobById(job.id, ctx.orgId);
    expect(fetched).not.toBeNull();
    expect(fetched!.amount).toBeNull();
    expect(Number(fetched!.effectiveAmount)).toBeCloseTo(600, 2);
  });

  it('explicit amount → stored as override, effectiveAmount uses override', async () => {
    const job = await createJob(ctx.orgId, {
      jobDate: '2026-04-21',
      jobTypeId: hourlyJobTypeId,
      startTime: '2026-04-21T12:00:00Z',
      endTime: '2026-04-21T17:00:00Z',
      amount: 999,
    });
    expect(Number(job.amount)).toBe(999);
    const fetched = await getJobById(job.id, ctx.orgId);
    expect(Number(fetched!.amount)).toBe(999);
    expect(Number(fetched!.effectiveAmount)).toBe(999);
  });

  it('amount: null explicitly → stored as NULL', async () => {
    const job = await createJob(ctx.orgId, {
      jobDate: '2026-04-22',
      jobTypeId: loadJobTypeId,
      loads: 3,
      amount: null,
    });
    expect(job.amount).toBeNull();
    const fetched = await getJobById(job.id, ctx.orgId);
    expect(fetched!.amount).toBeNull();
    expect(Number(fetched!.effectiveAmount)).toBeCloseTo(600, 2); // 3 × $200
  });
});

describe('updateJob — three semantics for the amount field', () => {
  let baseJobId: string;

  beforeEach(async () => {
    const job = await createJob(ctx.orgId, {
      jobDate: '2026-04-23',
      jobTypeId: hourlyJobTypeId,
      startTime: '2026-04-23T12:00:00Z',
      endTime: '2026-04-23T13:00:00Z', // 1h × $120 = $120
      amount: 500, // start with an override
    });
    baseJobId = job.id;
  });

  it('amount omitted → keeps existing override', async () => {
    const updated = await updateJob(ctx.orgId, {
      id: baseJobId,
      driverPaid: true, // change something else
    });
    expect(Number(updated!.amount)).toBe(500);
  });

  it('amount: null → clears the override (recomputes via view)', async () => {
    const updated = await updateJob(ctx.orgId, {
      id: baseJobId,
      amount: null,
    });
    expect(updated!.amount).toBeNull();
    expect(Number(updated!.effectiveAmount)).toBeCloseTo(120, 2);
  });

  it('amount: <number> → stores new override', async () => {
    const updated = await updateJob(ctx.orgId, {
      id: baseJobId,
      amount: 750,
    });
    expect(Number(updated!.amount)).toBe(750);
    expect(Number(updated!.effectiveAmount)).toBe(750);
  });
});

describe('listJobs — joined fields and pagination', () => {
  it('projects effectiveAmount on every row', async () => {
    const result = await listJobs(ctx.orgId, normalizePagination({ limit: 100 }));
    for (const job of result.data) {
      // Either NULL (truly pending) or a finite number — but always defined as a key
      expect(Object.prototype.hasOwnProperty.call(job, 'effectiveAmount')).toBe(true);
      if (job.effectiveAmount !== null && job.effectiveAmount !== undefined) {
        expect(Number.isFinite(Number(job.effectiveAmount))).toBe(true);
      }
    }
  });

  it('projects jobTypeRateOfJob from server JOIN (not paginated)', async () => {
    const result = await listJobs(ctx.orgId, normalizePagination({ limit: 100 }));
    for (const job of result.data) {
      // Every row created in this suite was attached to a JobType with a rate.
      expect(job.jobTypeRateOfJob).not.toBeNull();
      expect(Number(job.jobTypeRateOfJob)).toBeGreaterThan(0);
    }
  });

  it('projects jobTypeDispatchType and jobTypeTitle from JOIN', async () => {
    const result = await listJobs(ctx.orgId, normalizePagination({ limit: 100 }));
    for (const job of result.data) {
      expect(job.jobTypeDispatchType).toBeTruthy();
      expect(job.jobTypeTitle).toBeTruthy();
    }
  });

  it('respects organizationId filter (no cross-org leak)', async () => {
    const otherOrgFakeId = '00000000-0000-0000-0000-000000000000';
    const result = await listJobs(otherOrgFakeId, normalizePagination({ limit: 100 }));
    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
  });
});

describe('getJobById — projection completeness', () => {
  it('returns null for an id from another org', async () => {
    const job = await createJob(ctx.orgId, {
      jobDate: '2026-04-25',
      jobTypeId: hourlyJobTypeId,
      startTime: '2026-04-25T12:00:00Z',
      endTime: '2026-04-25T13:00:00Z',
    });
    const result = await getJobById(job.id, '00000000-0000-0000-0000-000000000000');
    expect(result).toBeNull();
  });

  it('returns effectiveAmount, jobTypeRateOfJob, etc.', async () => {
    const job = await createJob(ctx.orgId, {
      jobDate: '2026-04-26',
      jobTypeId: loadJobTypeId,
      loads: 4, // 4 × $200 = $800
    });
    const fetched = await getJobById(job.id, ctx.orgId);
    expect(fetched).not.toBeNull();
    expect(Number(fetched!.effectiveAmount)).toBeCloseTo(800, 2);
    expect(Number(fetched!.jobTypeRateOfJob)).toBe(200);
    expect(fetched!.jobTypeDispatchType).toBe('load');
    expect(fetched!.companyId).toBe(companyId);
  });
});
