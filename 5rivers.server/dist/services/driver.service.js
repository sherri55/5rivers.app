"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listDrivers = listDrivers;
exports.getDriverById = getDriverById;
exports.createDriver = createDriver;
exports.updateDriver = updateDriver;
exports.deleteDriver = deleteDriver;
const uuid_1 = require("uuid");
const connection_1 = require("../db/connection");
const SORT_COLUMNS = ['name', 'description', 'email', 'phone', 'hourlyRate', 'percentageRate', 'payType', 'createdAt'];
const FILTER_COLUMNS = ['name', 'email', 'phone', 'payType'];
async function listDrivers(organizationId, pagination, options) {
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
        OR (payType LIKE @filter_search ESCAPE '\\')
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
    FILTER_COLUMNS.forEach((col) => {
        if (params[`filter_${col}`] != null)
            countParams[`filter_${col}`] = params[`filter_${col}`];
    });
    const [rows, countRows] = await Promise.all([
        (0, connection_1.query)(`SELECT id, organizationId, name, description, email, phone, payType, hourlyRate, percentageRate, createdAt, updatedAt
       FROM Drivers WHERE organizationId = @organizationId${whereExtra}
       ORDER BY ${sortBy} ${order}
       OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`, { params }),
        (0, connection_1.query)(`SELECT COUNT(*) AS total FROM Drivers WHERE organizationId = @organizationId${whereExtra}`, { params: countParams }),
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
async function getDriverById(id, organizationId) {
    const rows = await (0, connection_1.query)(`SELECT id, organizationId, name, description, email, phone, payType, hourlyRate, percentageRate, createdAt, updatedAt
     FROM Drivers WHERE id = @id AND organizationId = @organizationId`, { params: { id, organizationId } });
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}
async function createDriver(organizationId, input) {
    const id = (0, uuid_1.v4)();
    const now = new Date();
    await (0, connection_1.query)(`INSERT INTO Drivers (id, organizationId, name, description, email, phone, payType, hourlyRate, percentageRate, createdAt, updatedAt)
     VALUES (@id, @organizationId, @name, @description, @email, @phone, @payType, @hourlyRate, @percentageRate, @createdAt, @updatedAt)`, {
        params: {
            id,
            organizationId,
            name: input.name,
            description: input.description ?? null,
            email: input.email ?? null,
            phone: input.phone ?? null,
            payType: input.payType ?? 'HOURLY',
            hourlyRate: input.hourlyRate ?? 0,
            percentageRate: input.percentageRate ?? 0,
            createdAt: now,
            updatedAt: now,
        },
    });
    const driver = await getDriverById(id, organizationId);
    if (!driver)
        throw new Error('Failed to create driver');
    return driver;
}
async function updateDriver(organizationId, input) {
    const existing = await getDriverById(input.id, organizationId);
    if (!existing)
        return null;
    const params = {
        id: input.id,
        organizationId,
        name: input.name ?? existing.name,
        description: input.description !== undefined ? input.description : existing.description,
        email: input.email !== undefined ? input.email : existing.email,
        phone: input.phone !== undefined ? input.phone : existing.phone,
        payType: input.payType !== undefined ? input.payType : existing.payType,
        hourlyRate: input.hourlyRate !== undefined ? input.hourlyRate : existing.hourlyRate,
        percentageRate: input.percentageRate !== undefined ? input.percentageRate : existing.percentageRate,
        updatedAt: new Date(),
    };
    await (0, connection_1.query)(`UPDATE Drivers SET
       name = @name, description = @description, email = @email, phone = @phone, payType = @payType, hourlyRate = @hourlyRate, percentageRate = @percentageRate, updatedAt = @updatedAt
     WHERE id = @id AND organizationId = @organizationId`, { params });
    return getDriverById(input.id, organizationId);
}
async function deleteDriver(id, organizationId) {
    const existing = await getDriverById(id, organizationId);
    if (!existing)
        return false;
    await (0, connection_1.query)(`DELETE FROM Drivers WHERE id = @id AND organizationId = @organizationId`, { params: { id, organizationId } });
    return true;
}
