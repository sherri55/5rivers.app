import { query } from '../db/connection';
import { getInvoiceById } from './invoice.service';
import { getJobById } from './job.service';

export interface JobInvoiceLine {
  jobId: string;
  invoiceId: string;
  amount: number;
  addedAt: Date;
}

export async function listJobsOnInvoice(
  invoiceId: string,
  organizationId: string
): Promise<JobInvoiceLine[]> {
  const invoice = await getInvoiceById(invoiceId, organizationId);
  if (!invoice) return []; // or throw notFound – caller can check invoice first

  const rows = await query<JobInvoiceLine[]>(
    `SELECT jobId, invoiceId, amount, addedAt
     FROM JobInvoice
     WHERE invoiceId = @invoiceId
     ORDER BY addedAt`,
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

  const existing = await getJobInvoice(invoiceId, jobId, organizationId);
  if (existing) throw new Error('Job is already on this invoice');

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
