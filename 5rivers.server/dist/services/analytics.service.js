"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardStats = getDashboardStats;
exports.getRevenueByDay = getRevenueByDay;
exports.getRevenueByCompany = getRevenueByCompany;
exports.getRevenueByDriver = getRevenueByDriver;
exports.getRevenueByDispatcher = getRevenueByDispatcher;
exports.getMonthlyRevenue = getMonthlyRevenue;
exports.getSourceTypeBreakdown = getSourceTypeBreakdown;
exports.getPaymentStatus = getPaymentStatus;
exports.getExpensesByCategory = getExpensesByCategory;
exports.getMonthlyExpenses = getMonthlyExpenses;
exports.getMonthlyProfit = getMonthlyProfit;
exports.getTopJobTypes = getTopJobTypes;
const connection_1 = require("../db/connection");
async function getDashboardStats(organizationId) {
    const rows = await (0, connection_1.query)(`
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
    `, { params: { organizationId } });
    const invoiceRows = await (0, connection_1.query)(`SELECT
      COUNT(*) AS total,
      COUNT(CASE WHEN i.status = 'CREATED' THEN 1 END) AS createdCount,
      COUNT(CASE WHEN i.status = 'RAISED' THEN 1 END) AS raisedCount,
      COUNT(CASE WHEN i.status = 'RECEIVED' THEN 1 END) AS receivedCount
    FROM Invoices i
    WHERE i.organizationId = @organizationId`, { params: { organizationId } });
    const outstandingRows = await (0, connection_1.query)(`SELECT COALESCE(SUM(ji.amount), 0) AS totalOutstanding
    FROM Invoices i
    JOIN JobInvoice ji ON ji.invoiceId = i.id
    WHERE i.organizationId = @organizationId
      AND i.status IN ('CREATED', 'RAISED')`, { params: { organizationId } });
    const driverRows = await (0, connection_1.query)(`SELECT COUNT(*) AS activeCount FROM Drivers WHERE organizationId = @organizationId`, { params: { organizationId } });
    const balanceRows = await (0, connection_1.query)(`SELECT COALESCE(SUM(balance), 0) AS totalBalance FROM (
      SELECT d.id,
        COALESCE((SELECT SUM(jdp.amount) FROM JobDriverPay jdp WHERE jdp.driverId = d.id), 0)
        - COALESCE((SELECT SUM(dp.amount) FROM DriverPayment dp WHERE dp.driverId = d.id), 0) AS balance
      FROM Drivers d WHERE d.organizationId = @organizationId
    ) sub WHERE balance > 0`, { params: { organizationId } });
    const unitRows = await (0, connection_1.query)(`SELECT
      COUNT(*) AS total,
      COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) AS activeCount,
      COUNT(CASE WHEN status = 'MAINTENANCE' THEN 1 END) AS maintenanceCount,
      COUNT(CASE WHEN status IN ('INACTIVE','RETIRED') THEN 1 END) AS inactiveCount
    FROM Units WHERE organizationId = @organizationId`, { params: { organizationId } });
    const expenseRows = await (0, connection_1.query)(`SELECT
      COUNT(*) AS expenseCount,
      COALESCE(SUM(amount), 0) AS expenseTotal,
      COALESCE(SUM(CASE WHEN expenseDate >= DATEFROMPARTS(YEAR(GETUTCDATE()), MONTH(GETUTCDATE()), 1) THEN amount END), 0) AS expenseThisMonth,
      COALESCE(SUM(CASE WHEN expenseDate >= DATEADD(MONTH, -1, DATEFROMPARTS(YEAR(GETUTCDATE()), MONTH(GETUTCDATE()), 1))
                         AND expenseDate <  DATEFROMPARTS(YEAR(GETUTCDATE()), MONTH(GETUTCDATE()), 1)
                    THEN amount END), 0) AS expenseLastMonth,
      COALESCE(SUM(CASE WHEN expenseDate >= DATEADD(DAY, 1-DATEPART(WEEKDAY, GETUTCDATE()), CAST(GETUTCDATE() AS DATE)) THEN amount END), 0) AS expenseThisWeek,
      COALESCE(SUM(CASE WHEN expenseDate = CAST(GETUTCDATE() AS DATE) THEN amount END), 0) AS expenseToday
    FROM Expenses WHERE organizationId = @organizationId`, { params: { organizationId } });
    const r = rows[0] || {};
    const inv = invoiceRows[0] || {};
    const outstanding = outstandingRows[0] || {};
    const drv = driverRows[0] || {};
    const bal = balanceRows[0] || {};
    const u = unitRows[0] || {};
    const exp = expenseRows[0] || {};
    const revenueTotal = r.revenueTotal ?? 0;
    const revenueThisMonth = r.revenueThisMonth ?? 0;
    const revenueLastMonth = r.revenueLastMonth ?? 0;
    const expTotal = exp.expenseTotal ?? 0;
    const expThisMonth = exp.expenseThisMonth ?? 0;
    const expLastMonth = exp.expenseLastMonth ?? 0;
    return {
        revenue: {
            total: revenueTotal,
            thisMonth: revenueThisMonth,
            lastMonth: revenueLastMonth,
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
        expenses: {
            total: expTotal,
            thisMonth: expThisMonth,
            lastMonth: expLastMonth,
            thisWeek: exp.expenseThisWeek ?? 0,
            today: exp.expenseToday ?? 0,
            count: exp.expenseCount ?? 0,
        },
        profit: {
            total: revenueTotal - expTotal,
            thisMonth: revenueThisMonth - expThisMonth,
            lastMonth: revenueLastMonth - expLastMonth,
        },
    };
}
async function getRevenueByDay(organizationId, days = 30) {
    // Get the last N days of actual data (relative to the most recent job, not today)
    const rows = await (0, connection_1.query)(`SELECT
      CONVERT(VARCHAR(10), j.jobDate, 120) AS date,
      COALESCE(SUM(j.amount), 0) AS revenue,
      COUNT(*) AS jobs
    FROM Jobs j
    WHERE j.organizationId = @organizationId
      AND j.jobDate >= DATEADD(DAY, -@days, (SELECT MAX(jobDate) FROM Jobs WHERE organizationId = @organizationId))
    GROUP BY j.jobDate
    ORDER BY j.jobDate`, { params: { organizationId, days } });
    return rows;
}
async function getRevenueByCompany(organizationId, startDate, endDate) {
    let dateFilter = '';
    const params = { organizationId };
    if (startDate) {
        dateFilter += ' AND j.jobDate >= @startDate';
        params.startDate = startDate;
    }
    if (endDate) {
        dateFilter += ' AND j.jobDate <= @endDate';
        params.endDate = endDate;
    }
    return (0, connection_1.query)(`SELECT c.id AS companyId, c.name AS companyName,
      COALESCE(SUM(j.amount), 0) AS revenue,
      COUNT(j.id) AS jobs
    FROM Jobs j
    JOIN JobTypes jt ON jt.id = j.jobTypeId
    JOIN Companies c ON c.id = jt.companyId
    WHERE j.organizationId = @organizationId ${dateFilter}
    GROUP BY c.id, c.name
    ORDER BY revenue DESC`, { params });
}
async function getRevenueByDriver(organizationId, startDate, endDate) {
    let dateFilter = '';
    const params = { organizationId };
    if (startDate) {
        dateFilter += ' AND j.jobDate >= @startDate';
        params.startDate = startDate;
    }
    if (endDate) {
        dateFilter += ' AND j.jobDate <= @endDate';
        params.endDate = endDate;
    }
    return (0, connection_1.query)(`SELECT d.id AS driverId, d.name AS driverName,
      COALESCE(SUM(j.amount), 0) AS revenue,
      COUNT(j.id) AS jobs,
      COUNT(CASE WHEN j.driverPaid = 1 THEN 1 END) AS paid,
      COUNT(CASE WHEN j.driverPaid = 0 THEN 1 END) AS unpaid
    FROM Jobs j
    JOIN Drivers d ON d.id = j.driverId
    WHERE j.organizationId = @organizationId AND j.driverId IS NOT NULL ${dateFilter}
    GROUP BY d.id, d.name
    ORDER BY revenue DESC`, { params });
}
async function getRevenueByDispatcher(organizationId, startDate, endDate) {
    let dateFilter = '';
    const params = { organizationId };
    if (startDate) {
        dateFilter += ' AND j.jobDate >= @startDate';
        params.startDate = startDate;
    }
    if (endDate) {
        dateFilter += ' AND j.jobDate <= @endDate';
        params.endDate = endDate;
    }
    return (0, connection_1.query)(`SELECT dp.id AS dispatcherId, dp.name AS dispatcherName,
      COALESCE(SUM(j.amount), 0) AS revenue,
      COUNT(j.id) AS jobs,
      COALESCE(SUM(j.amount * dp.commissionPercent / 100.0), 0) AS commission
    FROM Jobs j
    JOIN Dispatchers dp ON dp.id = j.dispatcherId
    WHERE j.organizationId = @organizationId AND j.dispatcherId IS NOT NULL ${dateFilter}
    GROUP BY dp.id, dp.name, dp.commissionPercent
    ORDER BY revenue DESC`, { params });
}
async function getMonthlyRevenue(organizationId, months = 24) {
    // Look back from the most recent job, not from today
    return (0, connection_1.query)(`SELECT
      FORMAT(j.jobDate, 'yyyy-MM') AS month,
      COALESCE(SUM(j.amount), 0) AS revenue,
      COUNT(*) AS jobs
    FROM Jobs j
    WHERE j.organizationId = @organizationId
      AND j.jobDate >= DATEADD(MONTH, -@months, (SELECT COALESCE(MAX(jobDate), GETUTCDATE()) FROM Jobs WHERE organizationId = @organizationId))
    GROUP BY FORMAT(j.jobDate, 'yyyy-MM')
    ORDER BY month`, { params: { organizationId, months } });
}
async function getSourceTypeBreakdown(organizationId, startDate, endDate) {
    let dateFilter = '';
    const params = { organizationId };
    if (startDate) {
        dateFilter += ' AND j.jobDate >= @startDate';
        params.startDate = startDate;
    }
    if (endDate) {
        dateFilter += ' AND j.jobDate <= @endDate';
        params.endDate = endDate;
    }
    return (0, connection_1.query)(`SELECT j.sourceType, COUNT(*) AS count, COALESCE(SUM(j.amount), 0) AS revenue
    FROM Jobs j
    WHERE j.organizationId = @organizationId ${dateFilter}
    GROUP BY j.sourceType`, { params });
}
async function getPaymentStatus(organizationId, startDate, endDate) {
    let dateFilter = '';
    const params = { organizationId };
    if (startDate) {
        dateFilter += ' AND j.jobDate >= @startDate';
        params.startDate = startDate;
    }
    if (endDate) {
        dateFilter += ' AND j.jobDate <= @endDate';
        params.endDate = endDate;
    }
    return (0, connection_1.query)(`SELECT
      CASE WHEN j.jobPaid = 1 THEN 'Received' ELSE 'Outstanding' END AS status,
      COUNT(*) AS count,
      COALESCE(SUM(j.amount), 0) AS amount
    FROM Jobs j
    WHERE j.organizationId = @organizationId ${dateFilter}
    GROUP BY j.jobPaid`, { params });
}
async function getExpensesByCategory(organizationId, startDate, endDate) {
    let dateFilter = '';
    const params = { organizationId };
    if (startDate) {
        dateFilter += ' AND e.expenseDate >= @startDate';
        params.startDate = startDate;
    }
    if (endDate) {
        dateFilter += ' AND e.expenseDate <= @endDate';
        params.endDate = endDate;
    }
    return (0, connection_1.query)(`SELECT
      e.categoryId,
      COALESCE(ec.name, 'Uncategorized') AS categoryName,
      ec.color AS categoryColor,
      COALESCE(SUM(e.amount), 0) AS total,
      COUNT(*) AS count
    FROM Expenses e
    LEFT JOIN ExpenseCategories ec ON ec.id = e.categoryId
    WHERE e.organizationId = @organizationId ${dateFilter}
    GROUP BY e.categoryId, ec.name, ec.color
    ORDER BY total DESC`, { params });
}
async function getMonthlyExpenses(organizationId, months = 24) {
    return (0, connection_1.query)(`SELECT
      FORMAT(e.expenseDate, 'yyyy-MM') AS month,
      COALESCE(SUM(e.amount), 0) AS expenses,
      COUNT(*) AS count
    FROM Expenses e
    WHERE e.organizationId = @organizationId
      AND e.expenseDate >= DATEADD(MONTH, -@months, GETUTCDATE())
    GROUP BY FORMAT(e.expenseDate, 'yyyy-MM')
    ORDER BY month`, { params: { organizationId, months } });
}
async function getMonthlyProfit(organizationId, months = 12) {
    return (0, connection_1.query)(`SELECT
      m.month,
      COALESCE(r.revenue, 0) AS revenue,
      COALESCE(x.expenses, 0) AS expenses,
      COALESCE(r.revenue, 0) - COALESCE(x.expenses, 0) AS profit,
      COALESCE(r.jobs, 0) AS jobs
    FROM (
      SELECT FORMAT(j.jobDate, 'yyyy-MM') AS month FROM Jobs j WHERE j.organizationId = @organizationId
      UNION
      SELECT FORMAT(e.expenseDate, 'yyyy-MM') AS month FROM Expenses e WHERE e.organizationId = @organizationId
    ) m
    LEFT JOIN (
      SELECT FORMAT(j.jobDate, 'yyyy-MM') AS month, SUM(j.amount) AS revenue, COUNT(*) AS jobs
      FROM Jobs j WHERE j.organizationId = @organizationId
      GROUP BY FORMAT(j.jobDate, 'yyyy-MM')
    ) r ON r.month = m.month
    LEFT JOIN (
      SELECT FORMAT(e.expenseDate, 'yyyy-MM') AS month, SUM(e.amount) AS expenses
      FROM Expenses e WHERE e.organizationId = @organizationId
      GROUP BY FORMAT(e.expenseDate, 'yyyy-MM')
    ) x ON x.month = m.month
    WHERE m.month >= FORMAT(DATEADD(MONTH, -@months, GETUTCDATE()), 'yyyy-MM')
    ORDER BY m.month`, { params: { organizationId, months } });
}
async function getTopJobTypes(organizationId, startDate, endDate, limit = 10) {
    let dateFilter = '';
    const params = { organizationId, limit };
    if (startDate) {
        dateFilter += ' AND j.jobDate >= @startDate';
        params.startDate = startDate;
    }
    if (endDate) {
        dateFilter += ' AND j.jobDate <= @endDate';
        params.endDate = endDate;
    }
    return (0, connection_1.query)(`SELECT TOP(@limit)
      jt.id AS jobTypeId, jt.title AS jobTypeTitle, c.name AS companyName,
      jt.dispatchType, COALESCE(SUM(j.amount), 0) AS revenue, COUNT(j.id) AS jobs
    FROM Jobs j
    JOIN JobTypes jt ON jt.id = j.jobTypeId
    JOIN Companies c ON c.id = jt.companyId
    WHERE j.organizationId = @organizationId ${dateFilter}
    GROUP BY jt.id, jt.title, c.name, jt.dispatchType
    ORDER BY revenue DESC`, { params });
}
