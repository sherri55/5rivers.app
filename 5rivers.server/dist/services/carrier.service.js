"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listCarriers = listCarriers;
exports.getCarrierById = getCarrierById;
exports.createCarrier = createCarrier;
exports.updateCarrier = updateCarrier;
exports.deleteCarrier = deleteCarrier;
const uuid_1 = require("uuid");
const connection_1 = require("../db/connection");
const timezone_1 = require("../utils/timezone");
const ALL_COLUMNS = 'id, organizationId, name, description, contactPerson, email, phone, rateType, rate, status, createdAt, updatedAt';
const SORT_COLUMNS = ['name', 'contactPerson', 'email', 'phone', 'rateType', 'rate', 'status', 'createdAt'];
const FILTER_COLUMNS = ['name', 'email', 'rateType', 'status'];
async function listCarriers(organizationId, pagination, options) {
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
        OR (contactPerson IS NOT NULL AND contactPerson LIKE @filter_search ESCAPE '\\')
        OR (email IS NOT NULL AND email LIKE @filter_search ESCAPE '\\')
        OR (phone IS NOT NULL AND phone LIKE @filter_search ESCAPE '\\')
        OR (description IS NOT NULL AND description LIKE @filter_search ESCAPE '\\')
      )`);
        }
        for (const col of FILTER_COLUMNS) {
            const v = options.filters[col];
            if (v) {
                if (col === 'status' || col === 'rateType') {
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
    FILTER_COLUMNS.forEach((col) => {
        if (params[`filter_${col}`] != null)
            countParams[`filter_${col}`] = params[`filter_${col}`];
    });
    const [rows, countRows] = await Promise.all([
        (0, connection_1.query)(`SELECT ${ALL_COLUMNS}
       FROM Carriers WHERE organizationId = @organizationId${whereExtra}
       ORDER BY ${sortBy} ${order}
       OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`, { params }),
        (0, connection_1.query)(`SELECT COUNT(*) AS total FROM Carriers WHERE organizationId = @organizationId${whereExtra}`, { params: countParams }),
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
async function getCarrierById(id, organizationId) {
    const rows = await (0, connection_1.query)(`SELECT ${ALL_COLUMNS} FROM Carriers WHERE id = @id AND organizationId = @organizationId`, { params: { id, organizationId } });
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}
async function createCarrier(organizationId, input) {
    const id = (0, uuid_1.v4)();
    const now = (0, timezone_1.nowEastern)();
    await (0, connection_1.query)(`INSERT INTO Carriers (id, organizationId, name, description, contactPerson, email, phone, rateType, rate, status, createdAt, updatedAt)
     VALUES (@id, @organizationId, @name, @description, @contactPerson, @email, @phone, @rateType, @rate, @status, @createdAt, @updatedAt)`, {
        params: {
            id,
            organizationId,
            name: input.name,
            description: input.description ?? null,
            contactPerson: input.contactPerson ?? null,
            email: input.email ?? null,
            phone: input.phone ?? null,
            rateType: input.rateType ?? 'PERCENTAGE',
            rate: input.rate ?? 0,
            status: input.status ?? 'ACTIVE',
            createdAt: now,
            updatedAt: now,
        },
    });
    const carrier = await getCarrierById(id, organizationId);
    if (!carrier)
        throw new Error('Failed to create carrier');
    return carrier;
}
async function updateCarrier(organizationId, input) {
    const existing = await getCarrierById(input.id, organizationId);
    if (!existing)
        return null;
    const params = {
        id: input.id,
        organizationId,
        name: input.name ?? existing.name,
        description: input.description !== undefined ? input.description : existing.description,
        contactPerson: input.contactPerson !== undefined ? input.contactPerson : existing.contactPerson,
        email: input.email !== undefined ? input.email : existing.email,
        phone: input.phone !== undefined ? input.phone : existing.phone,
        rateType: input.rateType !== undefined ? input.rateType : existing.rateType,
        rate: input.rate !== undefined ? input.rate : existing.rate,
        status: input.status !== undefined ? input.status : existing.status,
        updatedAt: (0, timezone_1.nowEastern)(),
    };
    await (0, connection_1.query)(`UPDATE Carriers SET
       name = @name, description = @description, contactPerson = @contactPerson, email = @email, phone = @phone,
       rateType = @rateType, rate = @rate, status = @status, updatedAt = @updatedAt
     WHERE id = @id AND organizationId = @organizationId`, { params });
    return getCarrierById(input.id, organizationId);
}
async function deleteCarrier(id, organizationId) {
    const existing = await getCarrierById(id, organizationId);
    if (!existing)
        return false;
    await (0, connection_1.query)(`DELETE FROM Carriers WHERE id = @id AND organizationId = @organizationId`, { params: { id, organizationId } });
    return true;
}
