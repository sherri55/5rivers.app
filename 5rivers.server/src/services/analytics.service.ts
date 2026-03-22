import { query } from '../db/connection';

// ============================================
// Analytics Service — aggregated data for
// dashboard and reports
// ============================================

// --- Dashboard Analytics ---

export interface DashboardStats {
  revenue: {
    total: number;
    thisMonth: number;
    lastMonth: number;
    thisWeek: number;
    today: number;
  };
  jobs: {
    total: number;
    thisMonth: number;
    lastMonth: number;
    thisWeek: number;
    today: number;
    unpaidCount: number;
    paidCount: number;
  };
  invoices: {
    total: number;
    totalOutstanding: number;
    createdCount: number;
    raisedCount: number;
    receivedCount: number;
  };
  drivers: {
    totalBalance: number;
    activeCount: number;
  };
  units: {
    total: number;
    activeCount: number;
    maintenanceCount: number;
    inactiveCount: number;
  };
  dateRange: {
    minDate: string | null;
    maxDate: string | null;
  };
}

export async function getDashboardStats(organizationId: string): Promise<DashboardStats> {
  const rows = await query<any[]>(
    `
    SELECT
      COALESCE(SUM(j.amount), 0) AS revenueTotal,
      COALESCE(SUM(CASE WHEN j.jobDate >= DATEFROMPARTS(YEAR(GETUTCDATE()), MONTH(GETUTCDATE()), 1) THEN j.amount END), 0) AS revenueThisMonth,
      COALESCE(SUM(CASE WHEN j.jobDate >= DATEADD(MONTH, -1, DATEFROMPARTS(YEAR(GETUTCDATE()), MONTH(GETUTCDATE()), 1))
                         AND j.jobDate <  DATEFROMPARTS(YEAR(GETUTCDATE()), MONTH(GETUTCDATE()), 1)
                    THEN j.amount END), 0) AS revenueLastMonth,
      COALESCE(SUM(CASE WHEN j.jobDate >= DATEADD(DAY, 1-DATEPART(WEEKDAY, GETUTCDATE()), CAST(GETUTCDATE() AS DATE)) THEN j.amount END), 0) AS revenueThisWeek,
      COALESCE(SUM(CASE WHEN j.jobDate = CAST(GETUTCDATE() AS DATE) THEN j.amount END), 0) AS revenueToday,
      COUNT(*) AS jobsTotal,
      COUNT(CASE WHEN j.jobDate >= DATEFROMPARTS(YEAR(GETUTCDATE()), MONTH(GETUTCDATE()), 1) THEN 1 END) AS jobsThisMonth,
      COUNT(CASE WHEN j.jobDate >= DATEADD(MONTH, -1, DATEFROMPARTS(YEAR(GETUTCDATE()), MONTH(GETUTCDATE()), 1))
                      AND j.jobDate <  DATEFROMPARTS(YEAR(GETUTCDATE()), MONTH(GETUTCDATE()), 1) THEN 1 END) AS jobsLastMonth,
      COUNT(CASE WHEN j.jobDate >= DATEADD(DAY, 1-DATEPART(WEEKDAY, GETUTCDATE()), CAST(GETUTCDATE() AS DATE)) THEN 1 END) AS jobsThisWeek,
      COUNT(CASE WHEN j.jobDate = CAST(GETUTCDATE() AS DATE) THEN 1 END) AS jobsToday,
      COUNT(CASE WHEN j.jobPaid = 0 THEN 1 END) AS unpaidCount,
      COUNT(CASE WHEN j.jobPaid = 1 THEN 1 END) AS paidCount,
      CONVERT(VARCHAR(10), MIN(j.jobDate), 120) AS minDate,
      CONVERT(VARCHAR(10), MAX(j.jobDate), 120) AS maxDate
    FROM Jobs j
    WHERE j.organizationId = @organizationId
    `,
    { params: { organizationId } }
  );

  const invoiceRows = await query<any[]>(
    `SELECT
      COUNT(*) AS total,
      COUNT(CASE WHEN i.status = 'CREATED' THEN 1 END) AS createdCount,
      COUNT(CASE WHEN i.status = 'RAISED' THEN 1 END) AS raisedCount,
      COUNT(CASE WHEN i.status = 'RECEIVED' THEN 1 END) AS receivedCount
    FROM Invoices i
    WHERE i.organizationId = @organizationId`,
    { params: { organizationId } }
  );

  const outstandingRows = await query<any[]>(
    `SELECT COALESCE(SUM(ji.amount), 0) AS totalOutstanding
    FROM Invoices i
    JOIN JobInvoice ji ON ji.invoiceId = i.id
    WHERE i.organizationId = @organizationId
      AND i.status IN ('CREATED', 'RAISED')`,
    { params: { organizationId } }
  );

  const driverRows = await query<any[]>(
    `SELECT COUNT(*) AS activeCount FROM Drivers WHERE organizationId = @organizationId`,
    { params: { organizationId } }
  );

  const balanceRows = await query<any[]>(
    `SELECT COALESCE(SUM(balance), 0) AS totalBalance FROM (
      SELECT d.id,
        COALESCE((SELECT SUM(jdp.amount) FROM JobDriverPay jdp WHERE jdp.driverId = d.id), 0)
        - COALESCE((SELECT SUM(dp.amount) FROM DriverPayment dp WHERE dp.driverId = d.id), 0) AS balance
      FROM Drivers d WHERE d.organizationId = @organizationId
    ) sub WHERE balance > 0`,
    { params: { organizationId } }
  );

  const unitRows = await query<any[]>(
    `SELECT
      COUNT(*) AS total,
      COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) AS activeCount,
      COUNT(CASE WHEN status = 'MAINTENANCE' THEN 1 END) AS maintenanceCount,
      COUNT(CASE WHEN status IN ('INACTIVE','RETIRED') THEN 1 END) AS inactiveCount
    FROM Units WHERE organizationId = @organizationId`,
    { params: { organizationId } }
  );

  const r = rows[0] || {};
  const inv = invoiceRows[0] || {};
  const outstanding = outstandingRows[0] || {};
  const drv = driverRows[0] || {};
  const bal = balanceRows[0] || {};
  const u = unitRows[0] || {};

  return {
    revenue: {
      total: r.revenueTotal ?? 0,
      thisMonth: r.revenueThisMonth ?? 0,
      lastMonth: r.revenueLastMonth ?? 0,
      thisWeek: r.revenueThisWeek ?? 0,
      today: r.revenueToday ?? 0,
    },
    jobs: {
      total: r.jobsTotal ?? 0,
      thisMonth: r.jobsThisMonth ?? 0,
      lastMonth: r.jobsLastMonth ?? 0,
      thisWeek: r.jobsThisWeek ?? 0,
      today: r.jobsToday ?? 0,
      unpaidCount: r.unpaidCount ?? 0,
      paidCount: r.paidCount ?? 0,
    },
    invoices: {
      total: inv.total ?? 0,
      totalOutstanding: outstanding.totalOutstanding ?? 0,
      createdCount: inv.createdCount ?? 0,
      raisedCount: inv.raisedCount ?? 0,
      receivedCount: inv.receivedCount ?? 0,
    },
    drivers: {
      totalBalance: bal.totalBalance ?? 0,
      activeCount: drv.activeCount ?? 0,
    },
    units: {
      total: u.total ?? 0,
      activeCount: u.activeCount ?? 0,
      maintenanceCount: u.maintenanceCount ?? 0,
      inactiveCount: u.inactiveCount ?? 0,
    },
    dateRange: {
      minDate: r.minDate ?? null,
      maxDate: r.maxDate ?? null,
    },
  };
}

// --- Revenue by Day ---

export interface DailyRevenue {
  date: string;
  revenue: number;
  jobs: number;
}

export async function getRevenueByDay(
  organizationId: string,
  days: number = 30
): Promise<DailyRevenue[]> {
  // Get the last N days of actual data (relative to the most recent job, not today)
  const rows = await query<DailyRevenue[]>(
    `SELECT
      CONVERT(VARCHAR(10), j.jobDate, 120) AS date,
      COALESCE(SUM(j.amount), 0) AS revenue,
      COUNT(*) AS jobs
    FROM Jobs j
    WHERE j.organizationId = @organizationId
      AND j.jobDate >= DATEADD(DAY, -@days, (SELECT MAX(jobDate) FROM Jobs WHERE organizationId = @organizationId))
    GROUP BY j.jobDate
    ORDER BY j.jobDate`,
    { params: { organizationId, days } }
  );
  return rows;
}

// --- Revenue by Company ---

export interface CompanyRevenue {
  companyId: string;
  companyName: string;
  revenue: number;
  jobs: number;
}

export async function getRevenueByCompany(
  organizationId: string,
  startDate?: string,
  endDate?: string
): Promise<CompanyRevenue[]> {
  let dateFilter = '';
  const params: Record<string, unknown> = { organizationId };
  if (startDate) { dateFilter += ' AND j.jobDate >= @startDate'; params.startDate = startDate; }
  if (endDate) { dateFilter += ' AND j.jobDate <= @endDate'; params.endDate = endDate; }

  return query<CompanyRevenue[]>(
    `SELECT c.id AS companyId, c.name AS companyName,
      COALESCE(SUM(j.amount), 0) AS revenue,
      COUNT(j.id) AS jobs
    FROM Jobs j
    JOIN JobTypes jt ON jt.id = j.jobTypeId
    JOIN Companies c ON c.id = jt.companyId
    WHERE j.organizationId = @organizationId ${dateFilter}
    GROUP BY c.id, c.name
    ORDER BY revenue DESC`,
    { params }
  );
}

// --- Revenue by Driver ---

export interface DriverRevenue {
  driverId: string;
  driverName: string;
  revenue: number;
  jobs: number;
  paid: number;
  unpaid: number;
}

export async function getRevenueByDriver(
  organizationId: string,
  startDate?: string,
  endDate?: string
): Promise<DriverRevenue[]> {
  let dateFilter = '';
  const params: Record<string, unknown> = { organizationId };
  if (startDate) { dateFilter += ' AND j.jobDate >= @startDate'; params.startDate = startDate; }
  if (endDate) { dateFilter += ' AND j.jobDate <= @endDate'; params.endDate = endDate; }

  return query<DriverRevenue[]>(
    `SELECT d.id AS driverId, d.name AS driverName,
      COALESCE(SUM(j.amount), 0) AS revenue,
      COUNT(j.id) AS jobs,
      COUNT(CASE WHEN j.driverPaid = 1 THEN 1 END) AS paid,
      COUNT(CASE WHEN j.driverPaid = 0 THEN 1 END) AS unpaid
    FROM Jobs j
    JOIN Drivers d ON d.id = j.driverId
    WHERE j.organizationId = @organizationId AND j.driverId IS NOT NULL ${dateFilter}
    GROUP BY d.id, d.name
    ORDER BY revenue DESC`,
    { params }
  );
}

// --- Revenue by Dispatcher ---

export interface DispatcherRevenue {
  dispatcherId: string;
  dispatcherName: string;
  revenue: number;
  jobs: number;
  commission: number;
}

export async function getRevenueByDispatcher(
  organizationId: string,
  startDate?: string,
  endDate?: string
): Promise<DispatcherRevenue[]> {
  let dateFilter = '';
  const params: Record<string, unknown> = { organizationId };
  if (startDate) { dateFilter += ' AND j.jobDate >= @startDate'; params.startDate = startDate; }
  if (endDate) { dateFilter += ' AND j.jobDate <= @endDate'; params.endDate = endDate; }

  return query<DispatcherRevenue[]>(
    `SELECT dp.id AS dispatcherId, dp.name AS dispatcherName,
      COALESCE(SUM(j.amount), 0) AS revenue,
      COUNT(j.id) AS jobs,
      COALESCE(SUM(j.amount * dp.commissionPercent / 100.0), 0) AS commission
    FROM Jobs j
    JOIN Dispatchers dp ON dp.id = j.dispatcherId
    WHERE j.organizationId = @organizationId AND j.dispatcherId IS NOT NULL ${dateFilter}
    GROUP BY dp.id, dp.name, dp.commissionPercent
    ORDER BY revenue DESC`,
    { params }
  );
}

// --- Revenue trend by month ---

export interface MonthlyRevenue {
  month: string;
  revenue: number;
  jobs: number;
}

export async function getMonthlyRevenue(
  organizationId: string,
  months: number = 24
): Promise<MonthlyRevenue[]> {
  // Look back from the most recent job, not from today
  return query<MonthlyRevenue[]>(
    `SELECT
      FORMAT(j.jobDate, 'yyyy-MM') AS month,
      COALESCE(SUM(j.amount), 0) AS revenue,
      COUNT(*) AS jobs
    FROM Jobs j
    WHERE j.organizationId = @organizationId
      AND j.jobDate >= DATEADD(MONTH, -@months, (SELECT COALESCE(MAX(jobDate), GETUTCDATE()) FROM Jobs WHERE organizationId = @organizationId))
    GROUP BY FORMAT(j.jobDate, 'yyyy-MM')
    ORDER BY month`,
    { params: { organizationId, months } }
  );
}

// --- Job source type breakdown ---

export interface SourceTypeBreakdown {
  sourceType: string;
  count: number;
  revenue: number;
}

export async function getSourceTypeBreakdown(
  organizationId: string,
  startDate?: string,
  endDate?: string
): Promise<SourceTypeBreakdown[]> {
  let dateFilter = '';
  const params: Record<string, unknown> = { organizationId };
  if (startDate) { dateFilter += ' AND j.jobDate >= @startDate'; params.startDate = startDate; }
  if (endDate) { dateFilter += ' AND j.jobDate <= @endDate'; params.endDate = endDate; }

  return query<SourceTypeBreakdown[]>(
    `SELECT j.sourceType, COUNT(*) AS count, COALESCE(SUM(j.amount), 0) AS revenue
    FROM Jobs j
    WHERE j.organizationId = @organizationId ${dateFilter}
    GROUP BY j.sourceType`,
    { params }
  );
}

// --- Payment collection rate ---

export interface PaymentStatus {
  status: string;
  count: number;
  amount: number;
}

export async function getPaymentStatus(
  organizationId: string,
  startDate?: string,
  endDate?: string
): Promise<PaymentStatus[]> {
  let dateFilter = '';
  const params: Record<string, unknown> = { organizationId };
  if (startDate) { dateFilter += ' AND j.jobDate >= @startDate'; params.startDate = startDate; }
  if (endDate) { dateFilter += ' AND j.jobDate <= @endDate'; params.endDate = endDate; }

  return query<PaymentStatus[]>(
    `SELECT
      CASE WHEN j.jobPaid = 1 THEN 'Received' ELSE 'Outstanding' END AS status,
      COUNT(*) AS count,
      COALESCE(SUM(j.amount), 0) AS amount
    FROM Jobs j
    WHERE j.organizationId = @organizationId ${dateFilter}
    GROUP BY j.jobPaid`,
    { params }
  );
}

// --- Top job types by revenue ---

export interface JobTypeRevenue {
  jobTypeId: string;
  jobTypeTitle: string;
  companyName: string;
  dispatchType: string;
  revenue: number;
  jobs: number;
}

export async function getTopJobTypes(
  organizationId: string,
  startDate?: string,
  endDate?: string,
  limit: number = 10
): Promise<JobTypeRevenue[]> {
  let dateFilter = '';
  const params: Record<string, unknown> = { organizationId, limit };
  if (startDate) { dateFilter += ' AND j.jobDate >= @startDate'; params.startDate = startDate; }
  if (endDate) { dateFilter += ' AND j.jobDate <= @endDate'; params.endDate = endDate; }

  return query<JobTypeRevenue[]>(
    `SELECT TOP(@limit)
      jt.id AS jobTypeId, jt.title AS jobTypeTitle, c.name AS companyName,
      jt.dispatchType, COALESCE(SUM(j.amount), 0) AS revenue, COUNT(j.id) AS jobs
    FROM Jobs j
    JOIN JobTypes jt ON jt.id = j.jobTypeId
    JOIN Companies c ON c.id = jt.companyId
    WHERE j.organizationId = @organizationId ${dateFilter}
    GROUP BY jt.id, jt.title, c.name, jt.dispatchType
    ORDER BY revenue DESC`,
    { params }
  );
}
