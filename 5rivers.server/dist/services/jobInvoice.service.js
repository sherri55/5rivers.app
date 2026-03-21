"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listJobsOnInvoice = listJobsOnInvoice;
exports.getJobInvoice = getJobInvoice;
exports.addJobToInvoice = addJobToInvoice;
exports.updateJobInvoiceAmount = updateJobInvoiceAmount;
exports.removeJobFromInvoice = removeJobFromInvoice;
const connection_1 = require("../db/connection");
const invoice_service_1 = require("./invoice.service");
const job_service_1 = require("./job.service");
async function listJobsOnInvoice(invoiceId, organizationId) {
    const invoice = await (0, invoice_service_1.getInvoiceById)(invoiceId, organizationId);
    if (!invoice)
        return [];
    const rows = await (0, connection_1.query)(`SELECT jobId, invoiceId, amount, addedAt
     FROM JobInvoice
     WHERE invoiceId = @invoiceId
     ORDER BY addedAt`, { params: { invoiceId } });
    return Array.isArray(rows) ? rows : [];
}
async function getJobInvoice(invoiceId, jobId, organizationId) {
    const invoice = await (0, invoice_service_1.getInvoiceById)(invoiceId, organizationId);
    if (!invoice)
        return null;
    const rows = await (0, connection_1.query)(`SELECT jobId, invoiceId, amount, addedAt FROM JobInvoice WHERE invoiceId = @invoiceId AND jobId = @jobId`, { params: { invoiceId, jobId } });
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}
/**
 * Check if a job is already on ANY invoice.
 * JobInvoice has jobId as PK so a job can only be on one invoice.
 */
async function getExistingJobInvoice(jobId) {
    const rows = await (0, connection_1.query)(`SELECT jobId, invoiceId, amount, addedAt FROM JobInvoice WHERE jobId = @jobId`, { params: { jobId } });
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}
async function addJobToInvoice(organizationId, invoiceId, jobId, amount) {
    const invoice = await (0, invoice_service_1.getInvoiceById)(invoiceId, organizationId);
    if (!invoice)
        throw new Error('Invoice not found');
    const job = await (0, job_service_1.getJobById)(jobId, organizationId);
    if (!job)
        throw new Error('Job not found');
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
    }
    else if (invoice.companyId) {
        // For direct invoices, verify the job is a DIRECT-source job
        // and its jobType belongs to the invoice's company
        if (job.sourceType !== 'DIRECT') {
            throw new Error('Only direct-source jobs can be added to a company invoice');
        }
    }
    await (0, connection_1.query)(`INSERT INTO JobInvoice (jobId, invoiceId, amount, addedAt) VALUES (@jobId, @invoiceId, @amount, @addedAt)`, {
        params: {
            jobId,
            invoiceId,
            amount: Number(amount),
            addedAt: new Date(),
        },
    });
    const line = await getJobInvoice(invoiceId, jobId, organizationId);
    if (!line)
        throw new Error('Failed to add job to invoice');
    return line;
}
async function updateJobInvoiceAmount(organizationId, invoiceId, jobId, amount) {
    const existing = await getJobInvoice(invoiceId, jobId, organizationId);
    if (!existing)
        return null;
    await (0, connection_1.query)(`UPDATE JobInvoice SET amount = @amount WHERE invoiceId = @invoiceId AND jobId = @jobId`, { params: { invoiceId, jobId, amount: Number(amount) } });
    return getJobInvoice(invoiceId, jobId, organizationId);
}
async function removeJobFromInvoice(organizationId, invoiceId, jobId) {
    const existing = await getJobInvoice(invoiceId, jobId, organizationId);
    if (!existing)
        return false;
    await (0, connection_1.query)(`DELETE FROM JobInvoice WHERE invoiceId = @invoiceId AND jobId = @jobId`, { params: { invoiceId, jobId } });
    return true;
}
