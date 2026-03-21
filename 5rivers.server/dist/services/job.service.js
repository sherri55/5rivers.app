"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listJobs = listJobs;
exports.getJobById = getJobById;
exports.createJob = createJob;
exports.updateJob = updateJob;
exports.deleteJob = deleteJob;
const uuid_1 = require("uuid");
const connection_1 = require("../db/connection");
const SORT_COLUMNS = ['jobDate', 'amount', 'sourceType', 'createdAt'];
const FILTER_COLUMNS = ['jobDate', 'amount', 'sourceType'];
const ALL_COLUMNS = 'id, organizationId, jobDate, jobTypeId, driverId, dispatcherId, unitId, carrierId, sourceType, weight, loads, startTime, endTime, amount, carrierAmount, ticketIds, driverPaid, createdAt, updatedAt';
async function listJobs(organizationId, pagination, options) {
    const sortBy = options?.sortBy && SORT_COLUMNS.includes(options.sortBy) ? options.sortBy : 'jobDate';
    const order = options?.order === 'asc' ? 'ASC' : 'DESC';
    const filterClauses = [];
    const params = { organizationId, offset: pagination.offset, limit: pagination.limit };
    if (options?.filters) {
        for (const col of FILTER_COLUMNS) {
            const v = options.filters[col];
            if (v) {
                const escaped = String(v).replace(/[%_\\]/g, (c) => `\\${c}`);
                if (col === 'jobDate') {
                    filterClauses.push("(jobDate IS NOT NULL AND jobDate LIKE @filter_jobDate ESCAPE '\\')");
                    params['filter_jobDate'] = `%${escaped}%`;
                }
                else if (col === 'sourceType') {
                    filterClauses.push("(sourceType = @filter_sourceType)");
                    params['filter_sourceType'] = v;
                }
                else {
                    filterClauses.push("(amount IS NOT NULL AND CAST(amount AS VARCHAR(20)) LIKE @filter_amount ESCAPE '\\')");
                    params['filter_amount'] = `%${escaped}%`;
                }
            }
        }
    }
    const whereExtra = filterClauses.length ? ` AND ${filterClauses.join(' AND ')}` : '';
    const countParams = { organizationId };
    FILTER_COLUMNS.forEach((col) => {
        if (params[`filter_${col}`] != null)
            countParams[`filter_${col}`] = params[`filter_${col}`];
    });
    const [rows, countRows] = await Promise.all([
        (0, connection_1.query)(`SELECT ${ALL_COLUMNS}
       FROM Jobs WHERE organizationId = @organizationId${whereExtra}
       ORDER BY ${sortBy} ${order}, createdAt DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`, { params }),
        (0, connection_1.query)(`SELECT COUNT(*) AS total FROM Jobs WHERE organizationId = @organizationId${whereExtra}`, { params: countParams }),
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
async function getJobById(id, organizationId) {
    const rows = await (0, connection_1.query)(`SELECT ${ALL_COLUMNS}
     FROM Jobs WHERE id = @id AND organizationId = @organizationId`, { params: { id, organizationId } });
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}
async function createJob(organizationId, input) {
    const id = (0, uuid_1.v4)();
    const now = new Date();
    const driverPaid = input.driverPaid ?? false;
    await (0, connection_1.query)(`INSERT INTO Jobs (id, organizationId, jobDate, jobTypeId, driverId, dispatcherId, unitId, carrierId, sourceType, weight, loads, startTime, endTime, amount, carrierAmount, ticketIds, driverPaid, createdAt, updatedAt)
     VALUES (@id, @organizationId, @jobDate, @jobTypeId, @driverId, @dispatcherId, @unitId, @carrierId, @sourceType, @weight, @loads, @startTime, @endTime, @amount, @carrierAmount, @ticketIds, @driverPaid, @createdAt, @updatedAt)`, {
        params: {
            id, organizationId, jobDate: input.jobDate, jobTypeId: input.jobTypeId,
            driverId: input.driverId ?? null, dispatcherId: input.dispatcherId ?? null, unitId: input.unitId ?? null,
            carrierId: input.carrierId ?? null, sourceType: input.sourceType ?? 'DISPATCHED',
            weight: input.weight ?? null, loads: input.loads ?? null, startTime: input.startTime ?? null, endTime: input.endTime ?? null,
            amount: input.amount ?? null, carrierAmount: input.carrierAmount ?? null,
            ticketIds: input.ticketIds ?? null, driverPaid, createdAt: now, updatedAt: now,
        },
    });
    const job = await getJobById(id, organizationId);
    if (!job)
        throw new Error('Failed to create job');
    return job;
}
async function updateJob(organizationId, input) {
    const existing = await getJobById(input.id, organizationId);
    if (!existing)
        return null;
    const params = {
        id: input.id, organizationId,
        jobDate: input.jobDate ?? existing.jobDate, jobTypeId: input.jobTypeId ?? existing.jobTypeId,
        driverId: input.driverId !== undefined ? input.driverId : existing.driverId,
        dispatcherId: input.dispatcherId !== undefined ? input.dispatcherId : existing.dispatcherId,
        unitId: input.unitId !== undefined ? input.unitId : existing.unitId,
        carrierId: input.carrierId !== undefined ? input.carrierId : existing.carrierId,
        sourceType: input.sourceType !== undefined ? input.sourceType : existing.sourceType,
        weight: input.weight !== undefined ? input.weight : existing.weight,
        loads: input.loads !== undefined ? input.loads : existing.loads,
        startTime: input.startTime !== undefined ? input.startTime : existing.startTime,
        endTime: input.endTime !== undefined ? input.endTime : existing.endTime,
        amount: input.amount !== undefined ? input.amount : existing.amount,
        carrierAmount: input.carrierAmount !== undefined ? input.carrierAmount : existing.carrierAmount,
        ticketIds: input.ticketIds !== undefined ? input.ticketIds : existing.ticketIds,
        driverPaid: input.driverPaid !== undefined ? input.driverPaid : existing.driverPaid,
        updatedAt: new Date(),
    };
    await (0, connection_1.query)(`UPDATE Jobs SET jobDate = @jobDate, jobTypeId = @jobTypeId, driverId = @driverId, dispatcherId = @dispatcherId, unitId = @unitId,
       carrierId = @carrierId, sourceType = @sourceType, weight = @weight, loads = @loads, startTime = @startTime, endTime = @endTime,
       amount = @amount, carrierAmount = @carrierAmount, ticketIds = @ticketIds, driverPaid = @driverPaid, updatedAt = @updatedAt
     WHERE id = @id AND organizationId = @organizationId`, { params });
    return getJobById(input.id, organizationId);
}
async function deleteJob(id, organizationId) {
    const existing = await getJobById(id, organizationId);
    if (!existing)
        return false;
    await (0, connection_1.query)(`DELETE FROM Jobs WHERE id = @id AND organizationId = @organizationId`, { params: { id, organizationId } });
    return true;
}
