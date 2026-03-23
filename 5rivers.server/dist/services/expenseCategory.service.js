"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listExpenseCategories = listExpenseCategories;
exports.getExpenseCategoryById = getExpenseCategoryById;
exports.createExpenseCategory = createExpenseCategory;
exports.updateExpenseCategory = updateExpenseCategory;
exports.deleteExpenseCategory = deleteExpenseCategory;
const uuid_1 = require("uuid");
const connection_1 = require("../db/connection");
const SORT_COLUMNS = ['name', 'createdAt'];
async function listExpenseCategories(organizationId, pagination, options) {
    const sortBy = options?.sortBy && SORT_COLUMNS.includes(options.sortBy) ? options.sortBy : 'name';
    const order = options?.order === 'desc' ? 'DESC' : 'ASC';
    const filterClauses = [];
    const params = { organizationId, offset: pagination.offset, limit: pagination.limit };
    if (options?.filters) {
        const searchTerm = options.filters['search'];
        if (searchTerm) {
            const escaped = String(searchTerm).replace(/[%_\\]/g, (c) => `\\${c}`);
            params['filter_search'] = `%${escaped}%`;
            filterClauses.push(`(name LIKE @filter_search ESCAPE '\\')`);
        }
        if (options.filters['isActive']) {
            params['filter_isActive'] = options.filters['isActive'] === 'true' ? 1 : 0;
            filterClauses.push(`isActive = @filter_isActive`);
        }
    }
    const whereExtra = filterClauses.length ? ` AND ${filterClauses.join(' AND ')}` : '';
    const countParams = { organizationId };
    if (params['filter_search'] != null)
        countParams['filter_search'] = params['filter_search'];
    if (params['filter_isActive'] != null)
        countParams['filter_isActive'] = params['filter_isActive'];
    const [rows, countRows] = await Promise.all([
        (0, connection_1.query)(`SELECT id, organizationId, name, description, color, isActive, createdAt, updatedAt
       FROM ExpenseCategories
       WHERE organizationId = @organizationId${whereExtra}
       ORDER BY ${sortBy} ${order}
       OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`, { params }),
        (0, connection_1.query)(`SELECT COUNT(*) AS total FROM ExpenseCategories WHERE organizationId = @organizationId${whereExtra}`, { params: countParams }),
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
async function getExpenseCategoryById(id, organizationId) {
    const rows = await (0, connection_1.query)(`SELECT id, organizationId, name, description, color, isActive, createdAt, updatedAt
     FROM ExpenseCategories WHERE id = @id AND organizationId = @organizationId`, { params: { id, organizationId } });
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}
async function createExpenseCategory(organizationId, input) {
    const id = (0, uuid_1.v4)();
    const now = new Date();
    await (0, connection_1.query)(`INSERT INTO ExpenseCategories (id, organizationId, name, description, color, isActive, createdAt, updatedAt)
     VALUES (@id, @organizationId, @name, @description, @color, @isActive, @createdAt, @updatedAt)`, {
        params: {
            id,
            organizationId,
            name: input.name,
            description: input.description ?? null,
            color: input.color ?? null,
            isActive: input.isActive !== false ? 1 : 0,
            createdAt: now,
            updatedAt: now,
        },
    });
    const category = await getExpenseCategoryById(id, organizationId);
    if (!category)
        throw new Error('Failed to create expense category');
    return category;
}
async function updateExpenseCategory(organizationId, input) {
    const existing = await getExpenseCategoryById(input.id, organizationId);
    if (!existing)
        return null;
    const params = {
        id: input.id,
        organizationId,
        name: input.name ?? existing.name,
        description: input.description !== undefined ? input.description : existing.description,
        color: input.color !== undefined ? input.color : existing.color,
        isActive: input.isActive !== undefined ? (input.isActive ? 1 : 0) : (existing.isActive ? 1 : 0),
        updatedAt: new Date(),
    };
    await (0, connection_1.query)(`UPDATE ExpenseCategories SET
       name = @name, description = @description, color = @color, isActive = @isActive, updatedAt = @updatedAt
     WHERE id = @id AND organizationId = @organizationId`, { params });
    return getExpenseCategoryById(input.id, organizationId);
}
async function deleteExpenseCategory(id, organizationId) {
    const existing = await getExpenseCategoryById(id, organizationId);
    if (!existing)
        return false;
    await (0, connection_1.query)(`DELETE FROM ExpenseCategories WHERE id = @id AND organizationId = @organizationId`, { params: { id, organizationId } });
    return true;
}
