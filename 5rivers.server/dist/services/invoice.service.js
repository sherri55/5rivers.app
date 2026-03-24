"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listInvoices = listInvoices;
exports.getInvoiceById = getInvoiceById;
exports.generateNextInvoiceNumber = generateNextInvoiceNumber;
exports.createInvoice = createInvoice;
exports.updateInvoice = updateInvoice;
exports.deleteInvoice = deleteInvoice;
const uuid_1 = require("uuid");
const connection_1 = require("../db/connection");
const timezone_1 = require("../utils/timezone");
const SORT_COLUMNS = ['invoiceNumber', 'invoiceDate', 'status', 'billedTo', 'billedEmail', 'createdAt'];
const FILTER_COLUMNS = ['invoiceNumber', 'status', 'billedTo', 'billedEmail', 'dispatcherId'];
const ALL_COLUMNS = 'id, organizationId, invoiceNumber, invoiceDate, status, dispatcherId, companyId, billedTo, billedEmail, createdAt, updatedAt';
async function listInvoices(organizationId, pagination, options) {
    const sortBy = options?.sortBy && SORT_COLUMNS.includes(options.sortBy) ? options.sortBy : 'invoiceDate';
    const order = options?.order === 'asc' ? 'ASC' : 'DESC';
    const filterClauses = [];
    const params = { organizationId, offset: pagination.offset, limit: pagination.limit };
    if (options?.filters) {
        const searchTerm = options.filters['search'];
        if (searchTerm) {
            const escaped = String(searchTerm).replace(/[%_\\]/g, (c) => `\\${c}`);
            params['filter_search'] = `%${escaped}%`;
            filterClauses.push(`(
        (invoiceNumber LIKE @filter_search ESCAPE '\\')
        OR (status LIKE @filter_search ESCAPE '\\')
        OR (billedTo IS NOT NULL AND billedTo LIKE @filter_search ESCAPE '\\')
        OR (billedEmail IS NOT NULL AND billedEmail LIKE @filter_search ESCAPE '\\')
        OR (CAST(invoiceDate AS VARCHAR(30)) LIKE @filter_search ESCAPE '\\')
      )`);
        }
        for (const col of FILTER_COLUMNS) {
            const v = options.filters[col];
            if (v) {
                if (col === 'dispatcherId') {
                    filterClauses.push(`(${col} = @filter_${col})`);
                    params[`filter_${col}`] = v;
                }
                else {
                    filterClauses.push(`(${col} IS NOT NULL AND ${col} LIKE @filter_${col} ESCAPE '\\')`);
                    params[`filter_${col}`] = `%${String(v).replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
                }
            }
        }
    }
    const whereExtra = filterClauses.length ? ` AND ${filterClauses.join(' AND ')}` : '';
    const countParams = { organizationId };
    if (params['filter_search'] != null)
        countParams['filter_search'] = params['filter_search'];
    FILTER_COLUMNS.forEach((col) => { if (params[`filter_${col}`] != null)
        countParams[`filter_${col}`] = params[`filter_${col}`]; });
    const [rows, countRows] = await Promise.all([
        (0, connection_1.query)(`SELECT ${ALL_COLUMNS}
       FROM Invoices WHERE organizationId = @organizationId${whereExtra}
       ORDER BY ${sortBy} ${order}, invoiceNumber DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`, { params }),
        (0, connection_1.query)(`SELECT COUNT(*) AS total FROM Invoices WHERE organizationId = @organizationId${whereExtra}`, { params: countParams }),
    ]);
    const total = countRows[0]?.total ?? 0;
    return {
        data: Array.isArray(rows) ? rows : [],
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(total / pagination.limit) || 1,
    };
}
async function getInvoiceById(id, organizationId) {
    const rows = await (0, connection_1.query)(`SELECT ${ALL_COLUMNS}
     FROM Invoices WHERE id = @id AND organizationId = @organizationId`, { params: { id, organizationId } });
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}
const INVOICE_PREFIX = '5RT';
async function generateNextInvoiceNumber(organizationId) {
    const year = (0, timezone_1.nowEastern)().getFullYear();
    const prefix = `${INVOICE_PREFIX}-${year}-`;
    const rows = await (0, connection_1.query)(`SELECT MAX(invoiceNumber) AS maxNum FROM Invoices
     WHERE organizationId = @organizationId AND invoiceNumber LIKE @prefix`, { params: { organizationId, prefix: `${prefix}%` } });
    let seq = 1;
    const maxNum = rows?.[0]?.maxNum;
    if (maxNum) {
        const lastSeq = parseInt(maxNum.replace(prefix, ''), 10);
        if (!isNaN(lastSeq))
            seq = lastSeq + 1;
    }
    return `${prefix}${String(seq).padStart(4, '0')}`;
}
async function createInvoice(organizationId, input) {
    const id = (0, uuid_1.v4)();
    const now = (0, timezone_1.nowEastern)();
    const invoiceNumber = await generateNextInvoiceNumber(organizationId);
    const status = input.status && ['CREATED', 'RAISED', 'RECEIVED'].includes(input.status) ? input.status : 'CREATED';
    await (0, connection_1.query)(`INSERT INTO Invoices (id, organizationId, invoiceNumber, invoiceDate, status, dispatcherId, companyId, billedTo, billedEmail, createdAt, updatedAt)
     VALUES (@id, @organizationId, @invoiceNumber, @invoiceDate, @status, @dispatcherId, @companyId, @billedTo, @billedEmail, @createdAt, @updatedAt)`, {
        params: {
            id,
            organizationId,
            invoiceNumber,
            invoiceDate: input.invoiceDate,
            status,
            dispatcherId: input.dispatcherId ?? null,
            companyId: input.companyId ?? null,
            billedTo: input.billedTo ?? null,
            billedEmail: input.billedEmail ?? null,
            createdAt: now,
            updatedAt: now,
        },
    });
    const invoice = await getInvoiceById(id, organizationId);
    if (!invoice)
        throw new Error('Failed to create invoice');
    return invoice;
}
async function updateInvoice(organizationId, input) {
    const existing = await getInvoiceById(input.id, organizationId);
    if (!existing)
        return null;
    const params = {
        id: input.id,
        organizationId,
        invoiceDate: input.invoiceDate ?? existing.invoiceDate,
        status: input.status && ['CREATED', 'RAISED', 'RECEIVED'].includes(input.status) ? input.status : existing.status,
        dispatcherId: input.dispatcherId !== undefined ? input.dispatcherId : existing.dispatcherId,
        companyId: input.companyId !== undefined ? input.companyId : existing.companyId,
        billedTo: input.billedTo !== undefined ? input.billedTo : existing.billedTo,
        billedEmail: input.billedEmail !== undefined ? input.billedEmail : existing.billedEmail,
        updatedAt: (0, timezone_1.nowEastern)(),
    };
    await (0, connection_1.query)(`UPDATE Invoices SET invoiceDate = @invoiceDate, status = @status, dispatcherId = @dispatcherId, companyId = @companyId, billedTo = @billedTo, billedEmail = @billedEmail, updatedAt = @updatedAt
     WHERE id = @id AND organizationId = @organizationId`, { params });
    // Cascade: when status changes to RECEIVED, mark all linked jobs as jobPaid (payment received from client)
    const newStatus = params.status;
    const oldStatus = existing.status;
    if (newStatus === 'RECEIVED' && oldStatus !== 'RECEIVED') {
        await (0, connection_1.query)(`UPDATE Jobs SET jobPaid = 1, updatedAt = CAST(SYSDATETIMEOFFSET() AT TIME ZONE 'Eastern Standard Time' AS DATETIME2)
       WHERE id IN (SELECT jobId FROM JobInvoice WHERE invoiceId = @invoiceId)
       AND organizationId = @organizationId`, { params: { invoiceId: input.id, organizationId } });
    }
    // If status reverts from RECEIVED, unmark jobPaid
    if (oldStatus === 'RECEIVED' && newStatus !== 'RECEIVED') {
        await (0, connection_1.query)(`UPDATE Jobs SET jobPaid = 0, updatedAt = CAST(SYSDATETIMEOFFSET() AT TIME ZONE 'Eastern Standard Time' AS DATETIME2)
       WHERE id IN (SELECT jobId FROM JobInvoice WHERE invoiceId = @invoiceId)
       AND organizationId = @organizationId`, { params: { invoiceId: input.id, organizationId } });
    }
    return getInvoiceById(input.id, organizationId);
}
async function deleteInvoice(id, organizationId) {
    const existing = await getInvoiceById(id, organizationId);
    if (!existing)
        return false;
    await (0, connection_1.query)(`DELETE FROM Invoices WHERE id = @id AND organizationId = @organizationId`, { params: { id, organizationId } });
    return true;
}
