import { query } from '../db/connection';
import { getInvoiceById } from './invoice.service';
import { getJobById } from './job.service';
import { nowEastern } from '../utils/timezone';

export interface JobInvoiceLine {
  jobId: string;
  invoiceId: string;
  /** Override on the invoice line (NULL = inherit from the underlying job). */
  amount: number | null;
  /** The value totals/PDF should actually use: override if set, else
   *  the job's effectiveAmount (from vJobsEffective). NULL only when
   *  the underlying job has no rate either. */
  effectiveAmount?: number | null;
  addedAt: Date;
  // Full job details (populated via JOIN)
  jobDate?: string;
  jobTypeId?: string;
  driverId?: string | null;
  dispatcherId?: string | null;
  unitId?: string | null;
  sourceType?: string;
  weight?: string | null;
  loads?: number | null;
  startTime?: string | null;
  endTime?: string | null;
  ticketIds?: string | null;
  // Joined JobType + Company fields — included so the invoice UI can render
  // the full "Company - Start to End (dispatch)" label without depending on
  // a paginated client-side jobTypeMap (which silently truncates at limit 200).
  jobTypeTitle?: string | null;
  jobTypeDispatchType?: string | null;
  jobTypeStartLocation?: string | null;
  jobTypeEndLocation?: string | null;
  jobTypeRateOfJob?: number | null;
  companyId?: string | null;
  companyName?: string | null;
}

export async function listJobsOnInvoice(
  invoiceId: string,
  organizationId: string
): Promise<JobInvoiceLine[]> {
  const invoice = await getInvoiceById(invoiceId, organizationId);
  if (!invoice) return [];

  // Pull from the vJobInvoiceEffective view (which itself joins to
  // vJobsEffective) so each line carries:
  //   • amount           — the raw override on this invoice line (NULL = inherit)
  //   • effectiveAmount  — the value to actually use for totals/PDFs
  //   • full job + jobType + company fields for the UI label
  const rows = await query<JobInvoiceLine[]>(
    `SELECT vji.jobId, vji.invoiceId, vji.amount, vji.effectiveAmount, vji.addedAt,
            j.jobDate, j.jobTypeId, j.driverId, j.dispatcherId, j.unitId,
            j.sourceType, j.weight, j.loads, j.startTime, j.endTime, j.ticketIds,
            jt.title AS jobTypeTitle,
            jt.dispatchType AS jobTypeDispatchType,
            jt.startLocation AS jobTypeStartLocation,
            jt.endLocation AS jobTypeEndLocation,
            jt.rateOfJob AS jobTypeRateOfJob,
            c.id AS companyId,
            c.name AS companyName
     FROM vJobInvoiceEffective vji
     LEFT JOIN Jobs j ON j.id = vji.jobId
     LEFT JOIN JobTypes jt ON jt.id = j.jobTypeId
     LEFT JOIN Companies c ON c.id = jt.companyId
     WHERE vji.invoiceId = @invoiceId
     ORDER BY j.jobDate, vji.addedAt`,
    { params: { invoiceId } }
  );
  return Array.isArray(rows) ? rows : [];
}

export async function getJobInvoice(
  invoiceId: string,
  jobId: string,
  organizationId: string
): Promise<JobInvoiceLine | null> {
  const invoice = await getInvoiceById(invoiceId, organizationId);
  if (!invoice) return null;
  const rows = await query<JobInvoiceLine[]>(
    `SELECT jobId, invoiceId, amount, effectiveAmount, addedAt
     FROM vJobInvoiceEffective
     WHERE invoiceId = @invoiceId AND jobId = @jobId`,
    { params: { invoiceId, jobId } }
  );
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

/**
 * Check if a job is already on ANY invoice.
 * JobInvoice has jobId as PK so a job can only be on one invoice.
 */
async function getExistingJobInvoice(jobId: string): Promise<JobInvoiceLine | null> {
  const rows = await query<JobInvoiceLine[]>(
    `SELECT jobId, invoiceId, amount, addedAt FROM JobInvoice WHERE jobId = @jobId`,
    { params: { jobId } }
  );
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

export async function addJobToInvoice(
  organizationId: string,
  invoiceId: string,
  jobId: string,
  amount: number | null = null,
): Promise<JobInvoiceLine> {
  const invoice = await getInvoiceById(invoiceId, organizationId);
  if (!invoice) throw new Error('Invoice not found');
  const job = await getJobById(jobId, organizationId);
  if (!job) throw new Error('Job not found');

  // Check if job is already on ANY invoice (not just this one)
  const alreadyInvoiced = await getExistingJobInvoice(jobId);
  if (alreadyInvoiced) {
    if (alreadyInvoiced.invoiceId === invoiceId) {
      throw new Error('Job is already on this invoice');
    }
    throw new Error('Job is already on another invoice');
  }

  // Validate dispatcher/company match:
  // - Dispatcher invoice: job must belong to the same dispatcher
  // - Company/direct invoice: job must be DIRECT sourceType (no dispatcher mismatch concern)
  if (invoice.dispatcherId) {
    if (job.dispatcherId !== invoice.dispatcherId) {
      throw new Error('Job dispatcher does not match invoice dispatcher');
    }
  } else if (invoice.companyId) {
    // For direct invoices, verify the job is a DIRECT-source job
    // and its jobType belongs to the invoice's company
    if (job.sourceType !== 'DIRECT') {
      throw new Error('Only direct-source jobs can be added to a company invoice');
    }
  }

  // Store the override-only amount. NULL means "inherit from the job's
  // effectiveAmount via vJobInvoiceEffective" — that's the common case.
  await query(
    `INSERT INTO JobInvoice (jobId, invoiceId, amount, addedAt) VALUES (@jobId, @invoiceId, @amount, @addedAt)`,
    {
      params: {
        jobId,
        invoiceId,
        amount: amount == null ? null : Number(amount),
        addedAt: nowEastern(),
      },
    }
  );
  const line = await getJobInvoice(invoiceId, jobId, organizationId);
  if (!line) throw new Error('Failed to add job to invoice');
  return line;
}

export async function updateJobInvoiceAmount(
  organizationId: string,
  invoiceId: string,
  jobId: string,
  amount: number
): Promise<JobInvoiceLine | null> {
  const existing = await getJobInvoice(invoiceId, jobId, organizationId);
  if (!existing) return null;

  await query(
    `UPDATE JobInvoice SET amount = @amount WHERE invoiceId = @invoiceId AND jobId = @jobId`,
    { params: { invoiceId, jobId, amount: Number(amount) } }
  );
  return getJobInvoice(invoiceId, jobId, organizationId);
}

export async function removeJobFromInvoice(
  organizationId: string,
  invoiceId: string,
  jobId: string
): Promise<boolean> {
  const existing = await getJobInvoice(invoiceId, jobId, organizationId);
  if (!existing) return false;

  await query(
    `DELETE FROM JobInvoice WHERE invoiceId = @invoiceId AND jobId = @jobId`,
    { params: { invoiceId, jobId } }
  );
  return true;
}
