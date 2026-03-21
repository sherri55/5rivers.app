"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listInvoices = listInvoices;
exports.getInvoiceById = getInvoiceById;
exports.createInvoice = createInvoice;
exports.updateInvoice = updateInvoice;
exports.deleteInvoice = deleteInvoice;
const uuid_1 = require("uuid");
const connection_1 = require("../db/connection");
const SORT_COLUMNS = ['invoiceNumber', 'invoiceDate', 'status', 'billedTo', 'billedEmail', 'createdAt'];
const FILTER_COLUMNS = ['invoiceNumber', 'status', 'billedTo', 'billedEmail'];
const ALL_COLUMNS = 'id, organizationId, invoiceNumber, invoiceDate, status, dispatcherId, companyId, billedTo, billedEmail, createdAt, updatedAt';
async function listInvoices(organizationId, pagination, options) {
    const sortBy = options?.sortBy && SORT_COLUMNS.includes(options.sortBy) ? options.sortBy : 'invoiceDate';
    const order = options?.order === 'asc' ? 'ASC' : 'DESC';
    const filterClauses = [];
    const params = { organizationId, offset: pagination.offset, limit: pagination.limit };
    if (options?.filters) {
        for (const col of FILTER_COLUMNS) {
            const v = options.filters[col];
            if (v) {
                filterClauses.push(`(${col} IS NOT NULL AND ${col} LIKE @filter_${col} ESCAPE '\\')`);
                params[`filter_${col}`] = `%${String(v).replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
            }
        }
    }
    const whereExtra = filterClauses.length ? ` AND ${filterClauses.join(' AND ')}` : '';
    const countParams = { organizationId };
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
async function createInvoice(organizationId, input) {
    const id = (0, uuid_1.v4)();
    const now = new Date();
    const status = input.status && ['CREATED', 'RAISED', 'RECEIVED'].includes(input.status) ? input.status : 'CREATED';
    await (0, connection_1.query)(`INSERT INTO Invoices (id, organizationId, invoiceNumber, invoiceDate, status, dispatcherId, companyId, billedTo, billedEmail, createdAt, updatedAt)
     VALUES (@id, @organizationId, @invoiceNumber, @invoiceDate, @status, @dispatcherId, @companyId, @billedTo, @billedEmail, @createdAt, @updatedAt)`, {
        params: {
            id,
            organizationId,
            invoiceNumber: input.invoiceNumber,
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
        updatedAt: new Date(),
    };
    await (0, connection_1.query)(`UPDATE Invoices SET invoiceDate = @invoiceDate, status = @status, dispatcherId = @dispatcherId, companyId = @companyId, billedTo = @billedTo, billedEmail = @billedEmail, updatedAt = @updatedAt
     WHERE id = @id AND organizationId = @organizationId`, { params });
    return getInvoiceById(input.id, organizationId);
}
async function deleteInvoice(id, organizationId) {
    const existing = await getInvoiceById(id, organizationId);
    if (!existing)
        return false;
    await (0, connection_1.query)(`DELETE FROM Invoices WHERE id = @id AND organizationId = @organizationId`, { params: { id, organizationId } });
    return true;
}
