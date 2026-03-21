"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listUnits = listUnits;
exports.getUnitById = getUnitById;
exports.createUnit = createUnit;
exports.updateUnit = updateUnit;
exports.deleteUnit = deleteUnit;
const uuid_1 = require("uuid");
const connection_1 = require("../db/connection");
const SORT_COLUMNS = ['name', 'description', 'color', 'plateNumber', 'vin', 'status', 'year', 'make', 'model', 'mileage', 'insuranceExpiry', 'lastMaintenanceDate', 'nextMaintenanceDate', 'createdAt'];
const FILTER_COLUMNS = ['name', 'plateNumber', 'vin', 'color', 'status', 'make', 'model'];
const ALL_COLUMNS = 'id, organizationId, name, description, color, plateNumber, vin, status, year, make, model, mileage, insuranceExpiry, lastMaintenanceDate, nextMaintenanceDate, createdAt, updatedAt';
async function listUnits(organizationId, pagination, options) {
    const sortBy = options?.sortBy && SORT_COLUMNS.includes(options.sortBy) ? options.sortBy : 'name';
    const order = options?.order === 'desc' ? 'DESC' : 'ASC';
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
       FROM Units WHERE organizationId = @organizationId${whereExtra}
       ORDER BY ${sortBy} ${order} OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`, { params }),
        (0, connection_1.query)(`SELECT COUNT(*) AS total FROM Units WHERE organizationId = @organizationId${whereExtra}`, { params: countParams }),
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
async function getUnitById(id, organizationId) {
    const rows = await (0, connection_1.query)(`SELECT ${ALL_COLUMNS}
     FROM Units WHERE id = @id AND organizationId = @organizationId`, { params: { id, organizationId } });
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}
async function createUnit(organizationId, input) {
    const id = (0, uuid_1.v4)();
    const now = new Date();
    await (0, connection_1.query)(`INSERT INTO Units (id, organizationId, name, description, color, plateNumber, vin, status, year, make, model, mileage, insuranceExpiry, lastMaintenanceDate, nextMaintenanceDate, createdAt, updatedAt)
     VALUES (@id, @organizationId, @name, @description, @color, @plateNumber, @vin, @status, @year, @make, @model, @mileage, @insuranceExpiry, @lastMaintenanceDate, @nextMaintenanceDate, @createdAt, @updatedAt)`, {
        params: {
            id, organizationId, name: input.name,
            description: input.description ?? null, color: input.color ?? null,
            plateNumber: input.plateNumber ?? null, vin: input.vin ?? null,
            status: input.status ?? 'ACTIVE',
            year: input.year ?? null, make: input.make ?? null, model: input.model ?? null,
            mileage: input.mileage ?? null,
            insuranceExpiry: input.insuranceExpiry ?? null,
            lastMaintenanceDate: input.lastMaintenanceDate ?? null,
            nextMaintenanceDate: input.nextMaintenanceDate ?? null,
            createdAt: now, updatedAt: now,
        },
    });
    const unit = await getUnitById(id, organizationId);
    if (!unit)
        throw new Error('Failed to create unit');
    return unit;
}
async function updateUnit(organizationId, input) {
    const existing = await getUnitById(input.id, organizationId);
    if (!existing)
        return null;
    const params = {
        id: input.id, organizationId,
        name: input.name ?? existing.name,
        description: input.description !== undefined ? input.description : existing.description,
        color: input.color !== undefined ? input.color : existing.color,
        plateNumber: input.plateNumber !== undefined ? input.plateNumber : existing.plateNumber,
        vin: input.vin !== undefined ? input.vin : existing.vin,
        status: input.status !== undefined ? input.status : existing.status,
        year: input.year !== undefined ? input.year : existing.year,
        make: input.make !== undefined ? input.make : existing.make,
        model: input.model !== undefined ? input.model : existing.model,
        mileage: input.mileage !== undefined ? input.mileage : existing.mileage,
        insuranceExpiry: input.insuranceExpiry !== undefined ? input.insuranceExpiry : existing.insuranceExpiry,
        lastMaintenanceDate: input.lastMaintenanceDate !== undefined ? input.lastMaintenanceDate : existing.lastMaintenanceDate,
        nextMaintenanceDate: input.nextMaintenanceDate !== undefined ? input.nextMaintenanceDate : existing.nextMaintenanceDate,
        updatedAt: new Date(),
    };
    await (0, connection_1.query)(`UPDATE Units SET name = @name, description = @description, color = @color, plateNumber = @plateNumber, vin = @vin,
       status = @status, year = @year, make = @make, model = @model, mileage = @mileage,
       insuranceExpiry = @insuranceExpiry, lastMaintenanceDate = @lastMaintenanceDate, nextMaintenanceDate = @nextMaintenanceDate,
       updatedAt = @updatedAt
     WHERE id = @id AND organizationId = @organizationId`, { params });
    return getUnitById(input.id, organizationId);
}
async function deleteUnit(id, organizationId) {
    const existing = await getUnitById(id, organizationId);
    if (!existing)
        return false;
    await (0, connection_1.query)(`DELETE FROM Units WHERE id = @id AND organizationId = @organizationId`, { params: { id, organizationId } });
    return true;
}
