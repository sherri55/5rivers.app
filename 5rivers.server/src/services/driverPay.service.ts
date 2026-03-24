import { query } from '../db/connection';

export interface DriverPayJobRow {
  jobId: string;
  jobDate: string;
  jobTypeTitle: string;
  amount: number;
  paidAt: string | null;
  paymentId: string | null;
}

export interface DriverPayPaymentRow {
  id: string;
  amount: number;
  paidAt: string;
  paymentMethod: string;
  reference: string | null;
}

export interface DriverPaySummary {
  driverId: string;
  driverName: string;
  totalEarned: number;
  totalPaid: number;
  balance: number;
  jobs: DriverPayJobRow[];
  payments: DriverPayPaymentRow[];
}

/**
 * List all drivers in the org with pay summary: total earned (from JobDriverPay, or job amount when no driver-pay set),
 * total paid (from DriverPayment), balance, and per-driver lists of jobs and payments.
 */
export async function listDriverPaySummaries(
  organizationId: string
): Promise<DriverPaySummary[]> {
  const driverRows = await query<
    Array<{ driverId: string; driverName: string; totalEarned: number; totalPaid: number }>
  >(
    `SELECT d.id AS driverId, d.name AS driverName,
       (SELECT ISNULL(SUM(jdp.amount), 0) FROM JobDriverPay jdp
        INNER JOIN Jobs j ON j.id = jdp.jobId AND j.organizationId = @organizationId
        WHERE jdp.driverId = d.id) +
       (SELECT ISNULL(SUM(j.amount), 0) FROM Jobs j
        INNER JOIN JobTypes jt ON jt.id = j.jobTypeId
        WHERE j.organizationId = @organizationId AND j.driverId = d.id
          AND NOT EXISTS (SELECT 1 FROM JobDriverPay jdp2 WHERE jdp2.jobId = j.id)) AS totalEarned,
       (SELECT ISNULL(SUM(dp.amount), 0) FROM DriverPayment dp
        WHERE dp.driverId = d.id AND dp.organizationId = @organizationId) AS totalPaid
     FROM Drivers d
     WHERE d.organizationId = @organizationId
     ORDER BY d.name`,
    { params: { organizationId } }
  );

  const drivers = Array.isArray(driverRows) ? driverRows : [];
  const driverIds = drivers.map((d) => d.driverId);
  if (driverIds.length === 0) return [];

  // Jobs with explicit driver pay (JobDriverPay)
  const jobRows = await query<
    Array<{
      driverId: string;
      jobId: string;
      jobDate: Date | string;
      jobTypeTitle: string;
      amount: number;
      paidAt: Date | string | null;
      paymentId: string | null;
    }>
  >(
    `SELECT jdp.driverId, jdp.jobId, jdp.amount, jdp.paidAt, jdp.paymentId,
        j.jobDate, jt.title AS jobTypeTitle
     FROM JobDriverPay jdp
     INNER JOIN Jobs j ON j.id = jdp.jobId AND j.organizationId = @organizationId
     INNER JOIN JobTypes jt ON jt.id = j.jobTypeId
     WHERE jdp.driverId IN (SELECT id FROM Drivers WHERE organizationId = @organizationId)
     ORDER BY jdp.driverId, j.jobDate DESC`,
    { params: { organizationId } }
  );

  // Jobs with driver assigned but no JobDriverPay row – use job amount as earned
  const jobRowsNoPay = await query<
    Array<{
      driverId: string;
      jobId: string;
      jobDate: Date | string;
      jobTypeTitle: string;
      amount: number | null;
    }>
  >(
    `SELECT j.driverId, j.id AS jobId, j.jobDate, jt.title AS jobTypeTitle, j.amount
     FROM Jobs j
     INNER JOIN JobTypes jt ON jt.id = j.jobTypeId
     WHERE j.organizationId = @organizationId AND j.driverId IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM JobDriverPay jdp WHERE jdp.jobId = j.id)
     ORDER BY j.driverId, j.jobDate DESC`,
    { params: { organizationId } }
  );

  const paymentRows = await query<
    Array<{
      driverId: string;
      id: string;
      amount: number;
      paidAt: Date | string;
      paymentMethod: string;
      reference: string | null;
    }>
  >(
    `SELECT driverId, id, amount, paidAt, paymentMethod, reference
     FROM DriverPayment
     WHERE organizationId = @organizationId
     ORDER BY driverId, paidAt DESC`,
    { params: { organizationId } }
  );

  const jobsByDriver = new Map<string, DriverPayJobRow[]>();
  const toJobDate = (d: Date | string) =>
    typeof d === 'string' ? d.slice(0, 10) : (d as Date).toLocaleDateString('en-CA', { timeZone: 'America/Toronto' });
  for (const row of Array.isArray(jobRows) ? jobRows : []) {
    const paidAt =
      row.paidAt == null
        ? null
        : typeof row.paidAt === 'string'
          ? row.paidAt.slice(0, 10)
          : (row.paidAt as Date).toLocaleDateString('en-CA', { timeZone: 'America/Toronto' });
    const item: DriverPayJobRow = {
      jobId: row.jobId,
      jobDate: toJobDate(row.jobDate),
      jobTypeTitle: row.jobTypeTitle,
      amount: Number(row.amount),
      paidAt,
      paymentId: row.paymentId ?? null,
    };
    const list = jobsByDriver.get(row.driverId) ?? [];
    list.push(item);
    jobsByDriver.set(row.driverId, list);
  }
  for (const row of Array.isArray(jobRowsNoPay) ? jobRowsNoPay : []) {
    const item: DriverPayJobRow = {
      jobId: row.jobId,
      jobDate: toJobDate(row.jobDate),
      jobTypeTitle: row.jobTypeTitle,
      amount: Number(row.amount ?? 0),
      paidAt: null,
      paymentId: null,
    };
    const list = jobsByDriver.get(row.driverId) ?? [];
    list.push(item);
    jobsByDriver.set(row.driverId, list);
  }
  // Sort each driver's jobs by date descending
  for (const [driverId, list] of jobsByDriver) {
    list.sort((a, b) => b.jobDate.localeCompare(a.jobDate));
  }

  const paymentsByDriver = new Map<string, DriverPayPaymentRow[]>();
  for (const row of Array.isArray(paymentRows) ? paymentRows : []) {
    const paidAt =
      typeof row.paidAt === 'string'
        ? row.paidAt.slice(0, 10)
        : (row.paidAt as Date).toLocaleDateString('en-CA', { timeZone: 'America/Toronto' });
    const item: DriverPayPaymentRow = {
      id: row.id,
      amount: Number(row.amount),
      paidAt,
      paymentMethod: row.paymentMethod,
      reference: row.reference ?? null,
    };
    const list = paymentsByDriver.get(row.driverId) ?? [];
    list.push(item);
    paymentsByDriver.set(row.driverId, list);
  }

  return drivers.map((d) => ({
    driverId: d.driverId,
    driverName: d.driverName,
    totalEarned: Number(d.totalEarned),
    totalPaid: Number(d.totalPaid),
    balance: Number(d.totalEarned) - Number(d.totalPaid),
    jobs: jobsByDriver.get(d.driverId) ?? [],
    payments: paymentsByDriver.get(d.driverId) ?? [],
  }));
}
