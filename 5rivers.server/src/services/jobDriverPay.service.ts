import { query } from '../db/connection';
import { getJobById } from './job.service';
import { getDriverById } from './driver.service';
import { getDriverPaymentById } from './driverPayment.service';

export interface JobDriverPay {
  jobId: string;
  driverId: string;
  amount: number;
  paidAt: Date | null;
  paymentId: string | null;
  createdAt: Date;
}

export async function getJobDriverPay(
  jobId: string,
  organizationId: string
): Promise<JobDriverPay | null> {
  const job = await getJobById(jobId, organizationId);
  if (!job) return null;

  const rows = await query<JobDriverPay[]>(
    `SELECT jobId, driverId, amount, paidAt, paymentId, createdAt
     FROM JobDriverPay WHERE jobId = @jobId`,
    { params: { jobId } }
  );
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

export async function setJobDriverPay(
  organizationId: string,
  jobId: string,
  driverId: string,
  amount: number
): Promise<JobDriverPay> {
  const job = await getJobById(jobId, organizationId);
  if (!job) throw new Error('Job not found');
  const driver = await getDriverById(driverId, organizationId);
  if (!driver) throw new Error('Driver not found');

  const existing = await getJobDriverPay(jobId, organizationId);
  const now = new Date();

  if (existing) {
    await query(
      `UPDATE JobDriverPay SET driverId = @driverId, amount = @amount, createdAt = @createdAt WHERE jobId = @jobId`,
      { params: { jobId, driverId, amount, createdAt: now } }
    );
  } else {
    await query(
      `INSERT INTO JobDriverPay (jobId, driverId, amount, paidAt, paymentId, createdAt)
       VALUES (@jobId, @driverId, @amount, NULL, NULL, @createdAt)`,
      { params: { jobId, driverId, amount, createdAt: now } }
    );
  }

  const row = await getJobDriverPay(jobId, organizationId);
  if (!row) throw new Error('Failed to set job driver pay');
  return row;
}

export async function markJobDriverPayPaid(
  organizationId: string,
  jobId: string,
  paymentId: string
): Promise<JobDriverPay | null> {
  const job = await getJobById(jobId, organizationId);
  if (!job) return null;
  const payment = await getDriverPaymentById(paymentId, organizationId);
  if (!payment) return null;

  const existing = await getJobDriverPay(jobId, organizationId);
  if (!existing) return null;

  const now = new Date();
  await query(
    `UPDATE JobDriverPay SET paidAt = @paidAt, paymentId = @paymentId WHERE jobId = @jobId`,
    { params: { jobId, paidAt: now, paymentId } }
  );
  return getJobDriverPay(jobId, organizationId);
}

export async function clearJobDriverPay(
  jobId: string,
  organizationId: string
): Promise<boolean> {
  const existing = await getJobDriverPay(jobId, organizationId);
  if (!existing) return false;
  await query(`DELETE FROM JobDriverPay WHERE jobId = @jobId`, { params: { jobId } });
  return true;
}
