/**
 * Service-layer test for the end-to-end invoice cascade.
 *
 * Walks a single job through every override permutation and asserts
 * `effectiveAmount` on the invoice line tracks the cascade correctly.
 * This is the headline test for "is the invoice line price right?".
 */

import {
  addJobToInvoice,
  listJobsOnInvoice,
  updateJobInvoiceAmount,
} from '../../services/jobInvoice.service';
import { updateJob } from '../../services/job.service';
import {
  createTestOrgAndUser,
  deleteTestData,
  type TestContext,
} from '../helpers';
import {
  createCompany,
  createJobType,
  createJob,
  createDispatcher,
  createInvoice,
} from '../helpers/factories';

let ctx: TestContext;
let invoiceId: string;
let jobTypeId: string;
let jobId: string;
let dispatcherId: string;

beforeAll(async () => {
  ctx = await createTestOrgAndUser();
  const company = await createCompany(ctx.orgId);
  const jt = await createJobType(ctx.orgId, company.id, {
    dispatchType: 'hourly',
    rateOfJob: 100,
  });
  jobTypeId = jt.id;
  const dispatcher = await createDispatcher(ctx.orgId);
  dispatcherId = dispatcher.id;
  const invoice = await createInvoice(ctx.orgId, { dispatcherId });
  invoiceId = invoice.id;

  // One job: 10h × $100 = $1,000 base calculation
  const job = await createJob(ctx.orgId, jobTypeId, {
    dispatcherId,
    startTime: '2026-04-20T12:00:00Z',
    endTime: '2026-04-20T22:00:00Z',
  });
  jobId = job.id;
  await addJobToInvoice(ctx.orgId, invoiceId, jobId, /* amount: */ null);
}, 30_000);

afterAll(async () => {
  await deleteTestData(ctx.orgId, ctx.userId);
}, 30_000);

async function getLine() {
  const lines = await listJobsOnInvoice(invoiceId, ctx.orgId);
  return lines.find((l) => l.jobId === jobId)!;
}

describe('Invoice cascade — single job, every override state', () => {
  it('Step 1: both NULL → effectiveAmount = $1,000 (computed)', async () => {
    const line = await getLine();
    expect(Number(line.effectiveAmount)).toBeCloseTo(1000, 2);
    expect(line.amount).toBeNull();
  });

  it('Step 2: change JobType rate to $200 → effectiveAmount = $2,000', async () => {
    // Bypassing updateJobType to avoid any side effects — direct SQL.
    const { query } = await import('../../db/connection');
    await query(`UPDATE JobTypes SET rateOfJob = 200 WHERE id = @id`, { params: { id: jobTypeId } });

    const line = await getLine();
    expect(Number(line.effectiveAmount)).toBeCloseTo(2000, 2);
    expect(line.amount).toBeNull(); // override column untouched

    // Reset for subsequent steps
    await query(`UPDATE JobTypes SET rateOfJob = 100 WHERE id = @id`, { params: { id: jobTypeId } });
  });

  it('Step 3: job override $1,500 → effectiveAmount = $1,500', async () => {
    await updateJob(ctx.orgId, { id: jobId, amount: 1500 });
    const line = await getLine();
    expect(Number(line.effectiveAmount)).toBeCloseTo(1500, 2);
  });

  it('Step 4: add a line override $1,800 → effectiveAmount = $1,800 (line beats job)', async () => {
    await updateJobInvoiceAmount(ctx.orgId, invoiceId, jobId, 1800);
    const line = await getLine();
    expect(Number(line.effectiveAmount)).toBeCloseTo(1800, 2);
    expect(Number(line.amount)).toBeCloseTo(1800, 2);
  });

  it('Step 5: clear line override (set 0) honors zero', async () => {
    await updateJobInvoiceAmount(ctx.orgId, invoiceId, jobId, 0);
    const line = await getLine();
    expect(Number(line.effectiveAmount)).toBe(0);
  });

  it('Step 6: clear job override → invoice line still has $0 from step 5', async () => {
    await updateJob(ctx.orgId, { id: jobId, amount: null });
    const line = await getLine();
    // Line override (0) still wins
    expect(Number(line.effectiveAmount)).toBe(0);
  });
});
