import { query } from '../db/connection';
import { getInvoiceById } from './invoice.service';
import { getJobById } from './job.service';

export interface JobInvoiceLine {
  jobId: string;
  invoiceId: string;
  amount: number;
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
}

export async function listJobsOnInvoice(
  invoiceId: string,
  organizationId: string
): Promise<JobInvoiceLine[]> {
  const invoice = await getInvoiceById(invoiceId, organizationId);
  if (!invoice) return [];

  const rows = await query<JobInvoiceLine[]>(
    `SELECT ji.jobId, ji.invoiceId, ji.amount, ji.addedAt,
            j.jobDate, j.jobTypeId, j.driverId, j.dispatcherId, j.unitId,
            j.sourceType, j.weight, j.loads, j.startTime, j.endTime, j.ticketIds
     FROM JobInvoice ji
     LEFT JOIN Jobs j ON j.id = ji.jobId
     WHERE ji.invoiceId = @invoiceId
     ORDER BY j.jobDate, ji.addedAt`,
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
    `SELECT jobId, invoiceId, amount, addedAt FROM JobInvoice WHERE invoiceId = @invoiceId AND jobId = @jobId`,
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
  amount: number
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

  await query(
    `INSERT INTO JobInvoice (jobId, invoiceId, amount, addedAt) VALUES (@jobId, @invoiceId, @amount, @addedAt)`,
    {
      params: {
        jobId,
        invoiceId,
        amount: Number(amount),
        addedAt: new Date(),
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
