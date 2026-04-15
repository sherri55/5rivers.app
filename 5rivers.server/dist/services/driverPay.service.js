"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listDriverPaySummaries = listDriverPaySummaries;
exports.markJobsAsPaid = markJobsAsPaid;
const uuid_1 = require("uuid");
const connection_1 = require("../db/connection");
const timezone_1 = require("../utils/timezone");
const driverPayment_service_1 = require("./driverPayment.service");
/**
 * Compute driver pay for a single job when no explicit JobDriverPay row exists.
 * - HOURLY:     hours worked (startTime → endTime) × driver.hourlyRate
 * - PERCENTAGE: jobAmount × (driver.percentageRate / 100)
 * - CUSTOM:     0 (requires manual entry)
 */
/**
 * Extract hours and minutes from a time value.
 * Handles both:
 *   - Date objects / ISO strings (DATETIME2 → UTC, convert to Eastern)
 *   - Legacy "HH:MM" strings (treated as Eastern)
 */
function extractEasternHM(val) {
    if (!val)
        return null;
    // Date object from DATETIME2 column → convert UTC to Eastern
    if (val instanceof Date) {
        const { hour, minute } = (0, timezone_1.utcToEastern)(val);
        return { h: hour, m: minute };
    }
    // ISO string with Z → parse as UTC, convert to Eastern
    if (typeof val === 'string' && (val.endsWith('Z') || val.includes('+')) && val.includes('T')) {
        const { hour, minute } = (0, timezone_1.utcToEastern)(new Date(val));
        return { h: hour, m: minute };
    }
    // String: extract HH:MM from any format ("07:15", "2025-12-05T07:00", etc.)
    if (typeof val === 'string') {
        const match = val.match(/(\d{1,2}):(\d{2})/);
        if (match)
            return { h: parseInt(match[1], 10), m: parseInt(match[2], 10) };
    }
    return null;
}
function calcDriverPay(row) {
    switch (row.payType) {
        case 'HOURLY': {
            const start = extractEasternHM(row.startTime);
            const end = extractEasternHM(row.endTime);
            if (!start || !end)
                return 0;
            const hours = (end.h * 60 + end.m - (start.h * 60 + start.m)) / 60;
            return Math.max(0, hours) * Number(row.hourlyRate);
        }
        case 'PERCENTAGE':
            return (row.jobAmount ?? 0) * (Number(row.percentageRate) / 100);
        case 'CUSTOM':
        default:
            return 0;
    }
}
/**
 * List all drivers in the org with pay summary: total earned (calculated from driver pay type),
 * total paid (from DriverPayment), balance, and per-driver lists of jobs and payments.
 */
async function listDriverPaySummaries(organizationId) {
    const driverRows = await (0, connection_1.query)(`SELECT d.id AS driverId, d.name AS driverName,
       (SELECT ISNULL(SUM(dp.amount), 0) FROM DriverPayment dp
        WHERE dp.driverId = d.id AND dp.organizationId = @organizationId) AS totalPaid
     FROM Drivers d
     WHERE d.organizationId = @organizationId
     ORDER BY d.name`, { params: { organizationId } });
    const drivers = Array.isArray(driverRows) ? driverRows : [];
    const driverIds = drivers.map((d) => d.driverId);
    if (driverIds.length === 0)
        return [];
    // Jobs with explicit driver pay (JobDriverPay)
    const jobRows = await (0, connection_1.query)(`SELECT jdp.driverId, jdp.jobId, jdp.amount, jdp.paidAt, jdp.paymentId,
        j.jobDate, j.amount AS jobAmount, jt.title AS jobTypeTitle
     FROM JobDriverPay jdp
     INNER JOIN Jobs j ON j.id = jdp.jobId AND j.organizationId = @organizationId
     INNER JOIN JobTypes jt ON jt.id = j.jobTypeId
     WHERE jdp.driverId IN (SELECT id FROM Drivers WHERE organizationId = @organizationId)
     ORDER BY jdp.driverId, j.jobDate DESC`, { params: { organizationId } });
    // Jobs with driver assigned but no JobDriverPay row — calculate driver pay from their rate
    const jobRowsNoPay = await (0, connection_1.query)(`SELECT j.driverId, j.id AS jobId, j.jobDate, jt.title AS jobTypeTitle,
            j.amount AS jobAmount, j.startTime, j.endTime, j.loads,
            d.payType, d.hourlyRate, d.percentageRate
     FROM Jobs j
     INNER JOIN JobTypes jt ON jt.id = j.jobTypeId
     INNER JOIN Drivers d ON d.id = j.driverId
     WHERE j.organizationId = @organizationId AND j.driverId IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM JobDriverPay jdp WHERE jdp.jobId = j.id)
     ORDER BY j.driverId, j.jobDate DESC`, { params: { organizationId } });
    const paymentRows = await (0, connection_1.query)(`SELECT driverId, id, amount, paidAt, paymentMethod, reference
     FROM DriverPayment
     WHERE organizationId = @organizationId
     ORDER BY driverId, paidAt DESC`, { params: { organizationId } });
    const jobsByDriver = new Map();
    const toJobDate = (d) => typeof d === 'string' ? d.slice(0, 10) : d.toLocaleDateString('en-CA', { timeZone: 'America/Toronto' });
    for (const row of Array.isArray(jobRows) ? jobRows : []) {
        const paidAt = row.paidAt == null
            ? null
            : typeof row.paidAt === 'string'
                ? row.paidAt.slice(0, 10)
                : row.paidAt.toLocaleDateString('en-CA', { timeZone: 'America/Toronto' });
        const item = {
            jobId: row.jobId,
            jobDate: toJobDate(row.jobDate),
            jobTypeTitle: row.jobTypeTitle,
            jobAmount: row.jobAmount != null ? Number(row.jobAmount) : null,
            amount: Number(row.amount),
            paidAt,
            paymentId: row.paymentId ?? null,
        };
        const list = jobsByDriver.get(row.driverId) ?? [];
        list.push(item);
        jobsByDriver.set(row.driverId, list);
    }
    for (const row of Array.isArray(jobRowsNoPay) ? jobRowsNoPay : []) {
        const item = {
            jobId: row.jobId,
            jobDate: toJobDate(row.jobDate),
            jobTypeTitle: row.jobTypeTitle,
            jobAmount: row.jobAmount != null ? Number(row.jobAmount) : null,
            amount: calcDriverPay(row),
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
    const paymentsByDriver = new Map();
    for (const row of Array.isArray(paymentRows) ? paymentRows : []) {
        const paidAt = typeof row.paidAt === 'string'
            ? row.paidAt.slice(0, 10)
            : row.paidAt.toLocaleDateString('en-CA', { timeZone: 'America/Toronto' });
        const item = {
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
    return drivers.map((d) => {
        const jobs = jobsByDriver.get(d.driverId) ?? [];
        const totalEarned = jobs.reduce((sum, j) => sum + j.amount, 0);
        const totalPaid = Number(d.totalPaid);
        return {
            driverId: d.driverId,
            driverName: d.driverName,
            totalEarned,
            totalPaid,
            balance: totalEarned - totalPaid,
            jobs,
            payments: paymentsByDriver.get(d.driverId) ?? [],
        };
    });
}
async function markJobsAsPaid(organizationId, input) {
    if (!input.jobIds.length)
        throw new Error('No jobs provided');
    const method = input.paymentMethod && driverPayment_service_1.PAYMENT_METHODS.includes(input.paymentMethod)
        ? input.paymentMethod
        : 'OTHER';
    // Create the DriverPayment record
    const paymentId = (0, uuid_1.v4)();
    const now = (0, timezone_1.nowUTC)();
    await (0, connection_1.query)(`INSERT INTO DriverPayment (id, driverId, organizationId, amount, paidAt, paymentMethod, reference, notes, createdAt, updatedAt)
     VALUES (@id, @driverId, @organizationId, @amount, @paidAt, @paymentMethod, @reference, @notes, @now, @now)`, {
        params: {
            id: paymentId,
            driverId: input.driverId,
            organizationId,
            amount: input.amount,
            paidAt: input.paidAt.slice(0, 10),
            paymentMethod: method,
            reference: input.reference ?? null,
            notes: input.notes ?? null,
            now,
        },
    });
    let markedCount = 0;
    for (const jobId of input.jobIds) {
        // Check if JobDriverPay row exists
        const existing = await (0, connection_1.query)(`SELECT jobId FROM JobDriverPay WHERE jobId = @jobId`, { params: { jobId } });
        if (Array.isArray(existing) && existing.length > 0) {
            await (0, connection_1.query)(`UPDATE JobDriverPay SET paidAt = @now, paymentId = @paymentId WHERE jobId = @jobId`, { params: { jobId, now, paymentId } });
        }
        else {
            // No JobDriverPay row — create one using the job's amount
            const jobRows = await (0, connection_1.query)(`SELECT amount, driverId FROM Jobs WHERE id = @jobId AND organizationId = @organizationId`, { params: { jobId, organizationId } });
            const job = Array.isArray(jobRows) ? jobRows[0] : null;
            if (job) {
                await (0, connection_1.query)(`INSERT INTO JobDriverPay (jobId, driverId, amount, paidAt, paymentId, createdAt)
           VALUES (@jobId, @driverId, @amount, @now, @paymentId, @now)`, {
                    params: {
                        jobId,
                        driverId: job.driverId ?? input.driverId,
                        amount: job.amount ?? 0,
                        now,
                        paymentId,
                    },
                });
            }
        }
        markedCount++;
    }
    return { paymentId, markedCount };
}
