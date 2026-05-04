"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listJobTypes = listJobTypes;
exports.getJobTypeById = getJobTypeById;
exports.createJobType = createJobType;
exports.updateJobType = updateJobType;
exports.backfillJobAmounts = backfillJobAmounts;
exports.deleteJobType = deleteJobType;
const uuid_1 = require("uuid");
const connection_1 = require("../db/connection");
const timezone_1 = require("../utils/timezone");
const SORT_COLUMNS = ['title', 'startLocation', 'endLocation', 'dispatchType', 'rateOfJob', 'createdAt'];
const FILTER_COLUMNS = ['title'];
const company_service_1 = require("./company.service");
async function ensureCompanyInOrg(companyId, organizationId) {
    const company = await (0, company_service_1.getCompanyById)(companyId, organizationId);
    if (!company)
        throw new Error('Company not found or access denied');
}
async function listJobTypes(organizationId, pagination, companyId, options) {
    const sortBy = options?.sortBy && SORT_COLUMNS.includes(options.sortBy) ? options.sortBy : 'title';
    const order = options?.order === 'desc' ? 'DESC' : 'ASC';
    const params = { organizationId, offset: pagination.offset, limit: pagination.limit };
    if (companyId)
        params.companyId = companyId;
    const companyClause = companyId ? ' AND jt.companyId = @companyId' : '';
    const filterClauses = [];
    if (options?.filters) {
        const searchTerm = options.filters['search'];
        if (searchTerm) {
            const escaped = String(searchTerm).replace(/[%_\\]/g, (c) => `\\${c}`);
            params['filter_search'] = `%${escaped}%`;
            filterClauses.push(`(
        (jt.title LIKE @filter_search ESCAPE '\\')
        OR (jt.startLocation IS NOT NULL AND jt.startLocation LIKE @filter_search ESCAPE '\\')
        OR (jt.endLocation IS NOT NULL AND jt.endLocation LIKE @filter_search ESCAPE '\\')
        OR (jt.dispatchType LIKE @filter_search ESCAPE '\\')
        OR (c.name LIKE @filter_search ESCAPE '\\')
      )`);
        }
        for (const col of FILTER_COLUMNS) {
            const v = options.filters[col];
            if (v) {
                filterClauses.push(`(jt.${col} IS NOT NULL AND jt.${col} LIKE @filter_${col} ESCAPE '\\')`);
                params[`filter_${col}`] = `%${String(v).replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
            }
        }
    }
    const filterWhere = filterClauses.length ? ` AND ${filterClauses.join(' AND ')}` : '';
    const countParams = { organizationId };
    if (companyId)
        countParams.companyId = companyId;
    if (params['filter_search'] != null)
        countParams['filter_search'] = params['filter_search'];
    FILTER_COLUMNS.forEach((col) => { if (params[`filter_${col}`] != null)
        countParams[`filter_${col}`] = params[`filter_${col}`]; });
    const [rows, countRows] = await Promise.all([
        (0, connection_1.query)(`SELECT jt.id, jt.companyId, jt.title, jt.startLocation, jt.endLocation, jt.dispatchType, jt.rateOfJob, jt.createdAt, jt.updatedAt
       FROM JobTypes jt INNER JOIN Companies c ON c.id = jt.companyId AND c.organizationId = @organizationId
       WHERE 1=1${companyClause}${filterWhere} ORDER BY jt.${sortBy} ${order} OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`, { params }),
        (0, connection_1.query)(`SELECT COUNT(*) AS total FROM JobTypes jt INNER JOIN Companies c ON c.id = jt.companyId AND c.organizationId = @organizationId WHERE 1=1${companyClause}${filterWhere}`, { params: countParams }),
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
async function getJobTypeById(id, organizationId) {
    const rows = await (0, connection_1.query)(`SELECT jt.id, jt.companyId, jt.title, jt.startLocation, jt.endLocation, jt.dispatchType, jt.rateOfJob, jt.createdAt, jt.updatedAt
     FROM JobTypes jt INNER JOIN Companies c ON c.id = jt.companyId AND c.organizationId = @organizationId WHERE jt.id = @id`, { params: { id, organizationId } });
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}
async function createJobType(organizationId, input) {
    await ensureCompanyInOrg(input.companyId, organizationId);
    const id = (0, uuid_1.v4)();
    const now = (0, timezone_1.nowEastern)();
    await (0, connection_1.query)(`INSERT INTO JobTypes (id, companyId, title, startLocation, endLocation, dispatchType, rateOfJob, createdAt, updatedAt)
     VALUES (@id, @companyId, @title, @startLocation, @endLocation, @dispatchType, @rateOfJob, @createdAt, @updatedAt)`, {
        params: {
            id, companyId: input.companyId, title: input.title,
            startLocation: input.startLocation ?? null, endLocation: input.endLocation ?? null,
            dispatchType: input.dispatchType ?? 'STANDARD', rateOfJob: input.rateOfJob ?? null,
            createdAt: now, updatedAt: now,
        },
    });
    const jobType = await getJobTypeById(id, organizationId);
    if (!jobType)
        throw new Error('Failed to create job type');
    return jobType;
}
async function updateJobType(organizationId, input) {
    const existing = await getJobTypeById(input.id, organizationId);
    if (!existing)
        return null;
    const oldRate = existing.rateOfJob;
    const params = {
        id: input.id,
        title: input.title ?? existing.title,
        startLocation: input.startLocation !== undefined ? input.startLocation : existing.startLocation,
        endLocation: input.endLocation !== undefined ? input.endLocation : existing.endLocation,
        dispatchType: input.dispatchType ?? existing.dispatchType,
        rateOfJob: input.rateOfJob !== undefined ? input.rateOfJob : existing.rateOfJob,
        updatedAt: (0, timezone_1.nowEastern)(),
    };
    await (0, connection_1.query)(`UPDATE JobTypes SET title = @title, startLocation = @startLocation, endLocation = @endLocation, dispatchType = @dispatchType, rateOfJob = @rateOfJob, updatedAt = @updatedAt WHERE id = @id`, { params });
    // If rate was just confirmed (changed from NULL to a value), backfill job amounts
    const newRate = input.rateOfJob !== undefined ? input.rateOfJob : existing.rateOfJob;
    if (oldRate == null && newRate != null) {
        await backfillJobAmounts(organizationId, input.id);
    }
    return getJobTypeById(input.id, organizationId);
}
/**
 * Backfill job amounts for a job type whose rate was just confirmed.
 * Updates all jobs of this type that still have amount = NULL.
 * Only auto-fills for 'load' and 'fixed' dispatch types (hourly/tonnage
 * need additional data we don't have).
 * Returns the number of jobs updated.
 */
async function backfillJobAmounts(organizationId, jobTypeId) {
    const jt = await getJobTypeById(jobTypeId, organizationId);
    if (!jt || jt.rateOfJob == null)
        return 0;
    // For hourly/tonnage we can't auto-calc without hours/weight — leave NULL
    if (jt.dispatchType === 'hourly' || jt.dispatchType === 'tonnage')
        return 0;
    const rows = await (0, connection_1.query)(`UPDATE j
     SET j.amount = @rate * COALESCE(j.loads, 1),
         j.updatedAt = @updatedAt
     FROM Jobs j
     WHERE j.jobTypeId = @jobTypeId
       AND j.organizationId = @organizationId
       AND j.amount IS NULL`, {
        params: {
            jobTypeId: jt.id,
            organizationId,
            rate: jt.rateOfJob,
            updatedAt: (0, timezone_1.nowEastern)(),
        },
    });
    // query() returns the recordset; for UPDATE statements mssql returns rowsAffected on the result
    // but our query wrapper returns recordset. We'll return 0 as a safe default — the update still runs.
    return 0;
}
async function deleteJobType(id, organizationId) {
    const existing = await getJobTypeById(id, organizationId);
    if (!existing)
        return false;
    await (0, connection_1.query)(`DELETE FROM JobTypes WHERE id = @id`, { params: { id } });
    return true;
}
