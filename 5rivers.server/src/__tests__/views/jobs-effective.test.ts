/**
 * Integration tests for the `vJobsEffective` SQL view.
 *
 * The view's CASE expression must compute the same number as the
 * TypeScript `computeJobAmountFromInputs` for every fixture in
 * helpers/calc-fixtures.ts. This file enforces that contract — if the
 * SQL formula drifts from the TS formula, the corresponding fixture
 * fails here while the unit tests still pass, pointing the finger at SQL.
 */

import { query } from '../../db/connection';
import { createTestOrgAndUser, deleteTestData, type TestContext } from '../helpers';
import { createCompany, createJobType, createJob } from '../helpers/factories';
import { SQL_FIXTURES } from '../helpers/calc-fixtures';

let ctx: TestContext;
let companyId: string;

beforeAll(async () => {
  ctx = await createTestOrgAndUser();
  const company = await createCompany(ctx.orgId);
  companyId = company.id;
}, 30_000);

afterAll(async () => {
  await deleteTestData(ctx.orgId, ctx.userId);
}, 30_000);

describe('vJobsEffective — matches TS formula across all fixtures', () => {
  // Run every SQL-eligible fixture through the view. Tonnage cases are
  // excluded (the view can't parse weight strings in pure T-SQL).
  it.each(SQL_FIXTURES)('$name', async ({ input, expected }) => {
    const jt = await createJobType(ctx.orgId, companyId, {
      title: `JT for ${input.dispatchType ?? 'null'}`,
      dispatchType: input.dispatchType ?? undefined,
      rateOfJob: input.rateOfJob ?? null,
    });
    const job = await createJob(ctx.orgId, jt.id, {
      startTime: input.startTime as string | null | undefined,
      endTime:   input.endTime as string | null | undefined,
      loads:     input.loads,
      weight:    input.weight,
    });
    const rows = await query<Array<{ effectiveAmount: number | string | null }>>(
      `SELECT effectiveAmount FROM vJobsEffective WHERE id = @id`,
      { params: { id: job.id } },
    );
    const got = rows[0]?.effectiveAmount;
    if (expected === null) {
      expect(got == null).toBe(true);
    } else {
      expect(got).not.toBeNull();
      // SQL Server can return DECIMAL as string in some driver configs.
      expect(Number(got)).toBeCloseTo(expected, 2);
    }
  }, 10_000);
});

describe('vJobsEffective — SQL-specific guarantees', () => {
  it('override beats computed (job.amount set to 9999)', async () => {
    const jt = await createJobType(ctx.orgId, companyId, { dispatchType: 'fixed', rateOfJob: 100 });
    const job = await createJob(ctx.orgId, jt.id, { amount: 9999 });
    const [row] = await query<Array<{ effectiveAmount: number | string | null }>>(
      `SELECT effectiveAmount FROM vJobsEffective WHERE id = @id`,
      { params: { id: job.id } },
    );
    expect(Number(row.effectiveAmount)).toBe(9999);
  });

  it('override of 0 beats computed (zero is a valid explicit value)', async () => {
    const jt = await createJobType(ctx.orgId, companyId, { dispatchType: 'fixed', rateOfJob: 100 });
    const job = await createJob(ctx.orgId, jt.id, { amount: 0 });
    const [row] = await query<Array<{ effectiveAmount: number | string | null }>>(
      `SELECT effectiveAmount FROM vJobsEffective WHERE id = @id`,
      { params: { id: job.id } },
    );
    expect(Number(row.effectiveAmount)).toBe(0);
  });

  it('NULL override falls through to computed', async () => {
    const jt = await createJobType(ctx.orgId, companyId, { dispatchType: 'fixed', rateOfJob: 250 });
    const job = await createJob(ctx.orgId, jt.id, { amount: null });
    const [row] = await query<Array<{ effectiveAmount: number | string | null }>>(
      `SELECT effectiveAmount FROM vJobsEffective WHERE id = @id`,
      { params: { id: job.id } },
    );
    expect(Number(row.effectiveAmount)).toBe(250);
  });

  it('rate change reflects without modifying Jobs.amount', async () => {
    const jt = await createJobType(ctx.orgId, companyId, { dispatchType: 'load', rateOfJob: 100 });
    const job = await createJob(ctx.orgId, jt.id, { loads: 5 });

    let [row] = await query<Array<{ effectiveAmount: number | string | null; amount: number | null }>>(
      `SELECT effectiveAmount, amount FROM vJobsEffective WHERE id = @id`,
      { params: { id: job.id } },
    );
    expect(Number(row.effectiveAmount)).toBe(500);
    expect(row.amount).toBeNull();

    // Change the rate on the job type
    await query(
      `UPDATE JobTypes SET rateOfJob = 200 WHERE id = @id`,
      { params: { id: jt.id } },
    );

    [row] = await query<Array<{ effectiveAmount: number | string | null; amount: number | null }>>(
      `SELECT effectiveAmount, amount FROM vJobsEffective WHERE id = @id`,
      { params: { id: job.id } },
    );
    // effectiveAmount now reflects the new rate × loads
    expect(Number(row.effectiveAmount)).toBe(1000);
    // The override column itself is untouched
    expect(row.amount).toBeNull();
  });

  it('no row loss: vJobsEffective count == Jobs count for this org', async () => {
    const [jobsCount] = await query<Array<{ n: number }>>(
      `SELECT COUNT(*) AS n FROM Jobs WHERE organizationId = @orgId`,
      { params: { orgId: ctx.orgId } },
    );
    const [viewCount] = await query<Array<{ n: number }>>(
      `SELECT COUNT(*) AS n FROM vJobsEffective WHERE organizationId = @orgId`,
      { params: { orgId: ctx.orgId } },
    );
    expect(viewCount.n).toBe(jobsCount.n);
  });

  it('zero rate on JobType → effectiveAmount NULL (rate pending)', async () => {
    const jt = await createJobType(ctx.orgId, companyId, { dispatchType: 'fixed', rateOfJob: 0 });
    const job = await createJob(ctx.orgId, jt.id, {});
    const [row] = await query<Array<{ effectiveAmount: number | string | null }>>(
      `SELECT effectiveAmount FROM vJobsEffective WHERE id = @id`,
      { params: { id: job.id } },
    );
    expect(row.effectiveAmount == null).toBe(true);
  });

  it('LOWER() in SQL matches JS .toLowerCase() — mixed-case dispatchType', async () => {
    const jt = await createJobType(ctx.orgId, companyId, {
      dispatchType: 'Hourly',
      rateOfJob: 100,
    });
    const job = await createJob(ctx.orgId, jt.id, {
      startTime: '2026-04-20T12:00:00Z',
      endTime:   '2026-04-20T17:00:00Z',
    });
    const [row] = await query<Array<{ effectiveAmount: number | string | null }>>(
      `SELECT effectiveAmount FROM vJobsEffective WHERE id = @id`,
      { params: { id: job.id } },
    );
    expect(Number(row.effectiveAmount)).toBe(500);
  });
});
