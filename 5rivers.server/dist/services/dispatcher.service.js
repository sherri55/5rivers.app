"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listDispatchers = listDispatchers;
exports.getDispatcherById = getDispatcherById;
exports.createDispatcher = createDispatcher;
exports.updateDispatcher = updateDispatcher;
exports.deleteDispatcher = deleteDispatcher;
const uuid_1 = require("uuid");
const connection_1 = require("../db/connection");
const timezone_1 = require("../utils/timezone");
const SORT_COLUMNS = ['name', 'email', 'phone', 'commissionPercent', 'createdAt'];
const FILTER_COLUMNS = ['name', 'email', 'phone'];
async function listDispatchers(organizationId, pagination, options) {
    const sortBy = options?.sortBy && SORT_COLUMNS.includes(options.sortBy) ? options.sortBy : 'name';
    const order = options?.order === 'desc' ? 'DESC' : 'ASC';
    const filterClauses = [];
    const params = { organizationId, offset: pagination.offset, limit: pagination.limit };
    if (options?.filters) {
        const searchTerm = options.filters['search'];
        if (searchTerm) {
            const escaped = String(searchTerm).replace(/[%_\\]/g, (c) => `\\${c}`);
            params['filter_search'] = `%${escaped}%`;
            filterClauses.push(`(
        (name LIKE @filter_search ESCAPE '\\')
        OR (email IS NOT NULL AND email LIKE @filter_search ESCAPE '\\')
        OR (phone IS NOT NULL AND phone LIKE @filter_search ESCAPE '\\')
        OR (description IS NOT NULL AND description LIKE @filter_search ESCAPE '\\')
      )`);
        }
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
    if (params['filter_search'] != null)
        countParams['filter_search'] = params['filter_search'];
    FILTER_COLUMNS.forEach((col) => { if (params[`filter_${col}`] != null)
        countParams[`filter_${col}`] = params[`filter_${col}`]; });
    const [rows, countRows] = await Promise.all([
        (0, connection_1.query)(`SELECT id, organizationId, name, description, email, phone, commissionPercent, createdAt, updatedAt
       FROM Dispatchers WHERE organizationId = @organizationId${whereExtra}
       ORDER BY ${sortBy} ${order} OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`, { params }),
        (0, connection_1.query)(`SELECT COUNT(*) AS total FROM Dispatchers WHERE organizationId = @organizationId${whereExtra}`, { params: countParams }),
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
async function getDispatcherById(id, organizationId) {
    const rows = await (0, connection_1.query)(`SELECT id, organizationId, name, description, email, phone, commissionPercent, createdAt, updatedAt
     FROM Dispatchers WHERE id = @id AND organizationId = @organizationId`, { params: { id, organizationId } });
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}
async function createDispatcher(organizationId, input) {
    const id = (0, uuid_1.v4)();
    const now = (0, timezone_1.nowEastern)();
    await (0, connection_1.query)(`INSERT INTO Dispatchers (id, organizationId, name, description, email, phone, commissionPercent, createdAt, updatedAt)
     VALUES (@id, @organizationId, @name, @description, @email, @phone, @commissionPercent, @createdAt, @updatedAt)`, {
        params: {
            id,
            organizationId,
            name: input.name,
            description: input.description ?? null,
            email: input.email ?? null,
            phone: input.phone ?? null,
            commissionPercent: input.commissionPercent ?? 0,
            createdAt: now,
            updatedAt: now,
        },
    });
    const dispatcher = await getDispatcherById(id, organizationId);
    if (!dispatcher)
        throw new Error('Failed to create dispatcher');
    return dispatcher;
}
async function updateDispatcher(organizationId, input) {
    const existing = await getDispatcherById(input.id, organizationId);
    if (!existing)
        return null;
    const params = {
        id: input.id,
        organizationId,
        name: input.name ?? existing.name,
        description: input.description !== undefined ? input.description : existing.description,
        email: input.email !== undefined ? input.email : existing.email,
        phone: input.phone !== undefined ? input.phone : existing.phone,
        commissionPercent: input.commissionPercent !== undefined ? input.commissionPercent : existing.commissionPercent,
        updatedAt: (0, timezone_1.nowEastern)(),
    };
    await (0, connection_1.query)(`UPDATE Dispatchers SET
       name = @name, description = @description, email = @email, phone = @phone, commissionPercent = @commissionPercent, updatedAt = @updatedAt
     WHERE id = @id AND organizationId = @organizationId`, { params });
    return getDispatcherById(input.id, organizationId);
}
async function deleteDispatcher(id, organizationId) {
    const existing = await getDispatcherById(id, organizationId);
    if (!existing)
        return false;
    await (0, connection_1.query)(`DELETE FROM Dispatchers WHERE id = @id AND organizationId = @organizationId`, { params: { id, organizationId } });
    return true;
}
