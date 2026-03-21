"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PAYMENT_METHODS = void 0;
exports.listDriverPayments = listDriverPayments;
exports.getDriverPaymentById = getDriverPaymentById;
exports.createDriverPayment = createDriverPayment;
exports.updateDriverPayment = updateDriverPayment;
exports.deleteDriverPayment = deleteDriverPayment;
const uuid_1 = require("uuid");
const connection_1 = require("../db/connection");
const driver_service_1 = require("./driver.service");
exports.PAYMENT_METHODS = ['CASH', 'CHECK', 'BANK_TRANSFER', 'E_TRANSFER', 'OTHER'];
async function listDriverPayments(organizationId, pagination, driverId) {
    const driverClause = driverId ? ' AND driverId = @driverId' : '';
    const params = {
        organizationId,
        offset: pagination.offset,
        limit: pagination.limit,
    };
    if (driverId)
        params.driverId = driverId;
    const [rows, countRows] = await Promise.all([
        (0, connection_1.query)(`SELECT id, driverId, organizationId, amount, paidAt, paymentMethod, reference, notes, createdAt, updatedAt
       FROM DriverPayment
       WHERE organizationId = @organizationId${driverClause}
       ORDER BY paidAt DESC, createdAt DESC
       OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`, { params }),
        (0, connection_1.query)(`SELECT COUNT(*) AS total FROM DriverPayment WHERE organizationId = @organizationId${driverClause}`, { params: driverId ? { organizationId, driverId } : { organizationId } }),
    ]);
    const total = countRows[0]?.total ?? 0;
    return {
        data: Array.isArray(rows) ? rows.map(normalizePaymentRow) : [],
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(total / pagination.limit) || 1,
    };
}
async function getDriverPaymentById(id, organizationId) {
    const rows = await (0, connection_1.query)(`SELECT id, driverId, organizationId, amount, paidAt, paymentMethod, reference, notes, createdAt, updatedAt
     FROM DriverPayment WHERE id = @id AND organizationId = @organizationId`, { params: { id, organizationId } });
    return Array.isArray(rows) && rows.length > 0 ? normalizePaymentRow(rows[0]) : null;
}
function normalizePaymentRow(row) {
    const r = row;
    const paidAt = r.paidAt;
    const paidAtStr = typeof paidAt === 'string'
        ? paidAt.slice(0, 10)
        : paidAt instanceof Date
            ? paidAt.toISOString().slice(0, 10)
            : String(paidAt ?? '').slice(0, 10);
    return { ...r, paidAt: paidAtStr };
}
async function createDriverPayment(organizationId, input) {
    const driver = await (0, driver_service_1.getDriverById)(input.driverId, organizationId);
    if (!driver)
        throw new Error('Driver not found');
    const method = input.paymentMethod && exports.PAYMENT_METHODS.includes(input.paymentMethod)
        ? input.paymentMethod
        : 'OTHER';
    const id = (0, uuid_1.v4)();
    const now = new Date();
    await (0, connection_1.query)(`INSERT INTO DriverPayment (id, driverId, organizationId, amount, paidAt, paymentMethod, reference, notes, createdAt, updatedAt)
     VALUES (@id, @driverId, @organizationId, @amount, @paidAt, @paymentMethod, @reference, @notes, @createdAt, @updatedAt)`, {
        params: {
            id,
            driverId: input.driverId,
            organizationId,
            amount: input.amount,
            paidAt: input.paidAt,
            paymentMethod: method,
            reference: input.reference ?? null,
            notes: input.notes ?? null,
            createdAt: now,
            updatedAt: now,
        },
    });
    const payment = await getDriverPaymentById(id, organizationId);
    if (!payment)
        throw new Error('Failed to create driver payment');
    return payment;
}
async function updateDriverPayment(id, organizationId, input) {
    const existing = await getDriverPaymentById(id, organizationId);
    if (!existing)
        return null;
    const updates = [];
    const params = { id, organizationId };
    if (input.amount != null) {
        updates.push('amount = @amount');
        params.amount = input.amount;
    }
    if (input.paidAt != null) {
        updates.push('paidAt = @paidAt');
        params.paidAt = input.paidAt.slice(0, 10);
    }
    if (input.paymentMethod != null && exports.PAYMENT_METHODS.includes(input.paymentMethod)) {
        updates.push('paymentMethod = @paymentMethod');
        params.paymentMethod = input.paymentMethod;
    }
    if (input.reference !== undefined) {
        updates.push('reference = @reference');
        params.reference = input.reference;
    }
    if (input.notes !== undefined) {
        updates.push('notes = @notes');
        params.notes = input.notes;
    }
    if (updates.length === 0)
        return existing;
    updates.push('updatedAt = @updatedAt');
    params.updatedAt = new Date();
    await (0, connection_1.query)(`UPDATE DriverPayment SET ${updates.join(', ')}
     WHERE id = @id AND organizationId = @organizationId`, { params });
    return getDriverPaymentById(id, organizationId);
}
async function deleteDriverPayment(id, organizationId) {
    const existing = await getDriverPaymentById(id, organizationId);
    if (!existing)
        return false;
    await (0, connection_1.query)(`DELETE FROM DriverPayment WHERE id = @id AND organizationId = @organizationId`, { params: { id, organizationId } });
    return true;
}
