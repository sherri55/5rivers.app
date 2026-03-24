"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getJobDriverPay = getJobDriverPay;
exports.setJobDriverPay = setJobDriverPay;
exports.markJobDriverPayPaid = markJobDriverPayPaid;
exports.clearJobDriverPay = clearJobDriverPay;
const connection_1 = require("../db/connection");
const job_service_1 = require("./job.service");
const driver_service_1 = require("./driver.service");
const driverPayment_service_1 = require("./driverPayment.service");
const timezone_1 = require("../utils/timezone");
async function getJobDriverPay(jobId, organizationId) {
    const job = await (0, job_service_1.getJobById)(jobId, organizationId);
    if (!job)
        return null;
    const rows = await (0, connection_1.query)(`SELECT jobId, driverId, amount, paidAt, paymentId, createdAt
     FROM JobDriverPay WHERE jobId = @jobId`, { params: { jobId } });
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}
async function setJobDriverPay(organizationId, jobId, driverId, amount) {
    const job = await (0, job_service_1.getJobById)(jobId, organizationId);
    if (!job)
        throw new Error('Job not found');
    const driver = await (0, driver_service_1.getDriverById)(driverId, organizationId);
    if (!driver)
        throw new Error('Driver not found');
    const existing = await getJobDriverPay(jobId, organizationId);
    const now = (0, timezone_1.nowEastern)();
    if (existing) {
        await (0, connection_1.query)(`UPDATE JobDriverPay SET driverId = @driverId, amount = @amount, createdAt = @createdAt WHERE jobId = @jobId`, { params: { jobId, driverId, amount, createdAt: now } });
    }
    else {
        await (0, connection_1.query)(`INSERT INTO JobDriverPay (jobId, driverId, amount, paidAt, paymentId, createdAt)
       VALUES (@jobId, @driverId, @amount, NULL, NULL, @createdAt)`, { params: { jobId, driverId, amount, createdAt: now } });
    }
    const row = await getJobDriverPay(jobId, organizationId);
    if (!row)
        throw new Error('Failed to set job driver pay');
    return row;
}
async function markJobDriverPayPaid(organizationId, jobId, paymentId) {
    const job = await (0, job_service_1.getJobById)(jobId, organizationId);
    if (!job)
        return null;
    const payment = await (0, driverPayment_service_1.getDriverPaymentById)(paymentId, organizationId);
    if (!payment)
        return null;
    const existing = await getJobDriverPay(jobId, organizationId);
    if (!existing)
        return null;
    const now = (0, timezone_1.nowEastern)();
    await (0, connection_1.query)(`UPDATE JobDriverPay SET paidAt = @paidAt, paymentId = @paymentId WHERE jobId = @jobId`, { params: { jobId, paidAt: now, paymentId } });
    return getJobDriverPay(jobId, organizationId);
}
async function clearJobDriverPay(jobId, organizationId) {
    const existing = await getJobDriverPay(jobId, organizationId);
    if (!existing)
        return false;
    await (0, connection_1.query)(`DELETE FROM JobDriverPay WHERE jobId = @jobId`, { params: { jobId } });
    return true;
}
