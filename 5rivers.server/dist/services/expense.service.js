"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listExpenses = listExpenses;
exports.getExpenseById = getExpenseById;
exports.createExpense = createExpense;
exports.updateExpense = updateExpense;
exports.deleteExpense = deleteExpense;
const uuid_1 = require("uuid");
const connection_1 = require("../db/connection");
const timezone_1 = require("../utils/timezone");
const SORT_COLUMNS = ['description', 'amount', 'expenseDate', 'vendor', 'paymentMethod', 'createdAt'];
const FILTER_COLUMNS = ['description', 'vendor', 'paymentMethod'];
async function listExpenses(organizationId, pagination, options) {
    const sortBy = options?.sortBy && SORT_COLUMNS.includes(options.sortBy) ? `e.${options.sortBy}` : 'e.expenseDate';
    const order = options?.order === 'desc' ? 'DESC' : 'ASC';
    const filterClauses = [];
    const params = { organizationId, offset: pagination.offset, limit: pagination.limit };
    if (options?.filters) {
        const searchTerm = options.filters['search'];
        if (searchTerm) {
            const escaped = String(searchTerm).replace(/[%_\\]/g, (c) => `\\${c}`);
            params['filter_search'] = `%${escaped}%`;
            filterClauses.push(`(
        (e.description LIKE @filter_search ESCAPE '\\')
        OR (e.vendor IS NOT NULL AND e.vendor LIKE @filter_search ESCAPE '\\')
        OR (e.reference IS NOT NULL AND e.reference LIKE @filter_search ESCAPE '\\')
      )`);
        }
        if (options.filters['categoryId']) {
            params['filter_categoryId'] = options.filters['categoryId'];
            filterClauses.push(`e.categoryId = @filter_categoryId`);
        }
        if (options.filters['paymentMethod']) {
            params['filter_paymentMethod'] = options.filters['paymentMethod'];
            filterClauses.push(`e.paymentMethod = @filter_paymentMethod`);
        }
        if (options.filters['startDate']) {
            params['filter_startDate'] = options.filters['startDate'];
            filterClauses.push(`e.expenseDate >= @filter_startDate`);
        }
        if (options.filters['endDate']) {
            params['filter_endDate'] = options.filters['endDate'];
            filterClauses.push(`e.expenseDate <= @filter_endDate`);
        }
        if (options.filters['recurring']) {
            params['filter_recurring'] = options.filters['recurring'] === 'true' ? 1 : 0;
            filterClauses.push(`e.recurring = @filter_recurring`);
        }
    }
    const whereExtra = filterClauses.length ? ` AND ${filterClauses.join(' AND ')}` : '';
    const countParams = { organizationId };
    // Copy filter params for count query
    Object.keys(params).forEach(k => {
        if (k.startsWith('filter_'))
            countParams[k] = params[k];
    });
    const [rows, countRows] = await Promise.all([
        (0, connection_1.query)(`SELECT e.id, e.organizationId, e.categoryId, e.description, e.amount,
              CONVERT(VARCHAR(10), e.expenseDate, 120) AS expenseDate,
              e.vendor, e.paymentMethod, e.reference, e.notes, e.recurring, e.recurringFrequency,
              e.createdAt, e.updatedAt,
              ec.name AS categoryName, ec.color AS categoryColor
       FROM Expenses e
       LEFT JOIN ExpenseCategories ec ON ec.id = e.categoryId
       WHERE e.organizationId = @organizationId${whereExtra}
       ORDER BY ${sortBy} ${order}
       OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`, { params }),
        (0, connection_1.query)(`SELECT COUNT(*) AS total FROM Expenses e WHERE e.organizationId = @organizationId${whereExtra}`, { params: countParams }),
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
async function getExpenseById(id, organizationId) {
    const rows = await (0, connection_1.query)(`SELECT e.id, e.organizationId, e.categoryId, e.description, e.amount,
            CONVERT(VARCHAR(10), e.expenseDate, 120) AS expenseDate,
            e.vendor, e.paymentMethod, e.reference, e.notes, e.recurring, e.recurringFrequency,
            e.createdAt, e.updatedAt,
            ec.name AS categoryName, ec.color AS categoryColor
     FROM Expenses e
     LEFT JOIN ExpenseCategories ec ON ec.id = e.categoryId
     WHERE e.id = @id AND e.organizationId = @organizationId`, { params: { id, organizationId } });
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}
async function createExpense(organizationId, input) {
    const id = (0, uuid_1.v4)();
    const now = (0, timezone_1.nowEastern)();
    await (0, connection_1.query)(`INSERT INTO Expenses (id, organizationId, categoryId, description, amount, expenseDate, vendor, paymentMethod, reference, notes, recurring, recurringFrequency, createdAt, updatedAt)
     VALUES (@id, @organizationId, @categoryId, @description, @amount, @expenseDate, @vendor, @paymentMethod, @reference, @notes, @recurring, @recurringFrequency, @createdAt, @updatedAt)`, {
        params: {
            id,
            organizationId,
            categoryId: input.categoryId ?? null,
            description: input.description,
            amount: input.amount,
            expenseDate: input.expenseDate,
            vendor: input.vendor ?? null,
            paymentMethod: input.paymentMethod ?? 'OTHER',
            reference: input.reference ?? null,
            notes: input.notes ?? null,
            recurring: input.recurring ? 1 : 0,
            recurringFrequency: input.recurringFrequency ?? null,
            createdAt: now,
            updatedAt: now,
        },
    });
    const expense = await getExpenseById(id, organizationId);
    if (!expense)
        throw new Error('Failed to create expense');
    return expense;
}
async function updateExpense(organizationId, input) {
    const existing = await getExpenseById(input.id, organizationId);
    if (!existing)
        return null;
    const params = {
        id: input.id,
        organizationId,
        categoryId: input.categoryId !== undefined ? input.categoryId : existing.categoryId,
        description: input.description ?? existing.description,
        amount: input.amount ?? existing.amount,
        expenseDate: input.expenseDate ?? existing.expenseDate,
        vendor: input.vendor !== undefined ? input.vendor : existing.vendor,
        paymentMethod: input.paymentMethod ?? existing.paymentMethod,
        reference: input.reference !== undefined ? input.reference : existing.reference,
        notes: input.notes !== undefined ? input.notes : existing.notes,
        recurring: input.recurring !== undefined ? (input.recurring ? 1 : 0) : (existing.recurring ? 1 : 0),
        recurringFrequency: input.recurringFrequency !== undefined ? input.recurringFrequency : existing.recurringFrequency,
        updatedAt: (0, timezone_1.nowEastern)(),
    };
    await (0, connection_1.query)(`UPDATE Expenses SET
       categoryId = @categoryId, description = @description, amount = @amount, expenseDate = @expenseDate,
       vendor = @vendor, paymentMethod = @paymentMethod, reference = @reference, notes = @notes,
       recurring = @recurring, recurringFrequency = @recurringFrequency, updatedAt = @updatedAt
     WHERE id = @id AND organizationId = @organizationId`, { params });
    return getExpenseById(input.id, organizationId);
}
async function deleteExpense(id, organizationId) {
    const existing = await getExpenseById(id, organizationId);
    if (!existing)
        return false;
    await (0, connection_1.query)(`DELETE FROM Expenses WHERE id = @id AND organizationId = @organizationId`, { params: { id, organizationId } });
    return true;
}
