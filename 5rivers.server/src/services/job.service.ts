import { v4 as uuid } from 'uuid';
import { query } from '../db/connection';
import { type Pagination, type ListResult, type SortOrder } from '../types';
import { nowUTC, parseTimeInputToUTC } from '../utils/timezone';
import { getJobTypeById } from './jobType.service';

const SORT_COLUMNS = ['jobDate', 'amount', 'sourceType', 'createdAt'] as const;
const FILTER_COLUMNS = ['jobDate', 'amount', 'sourceType', 'driverId', 'dispatcherId', 'unitId', 'jobTypeId'] as const;

export type JobSourceType = 'DISPATCHED' | 'DIRECT';

const ALL_COLUMNS = 'id, organizationId, jobDate, jobTypeId, driverId, dispatcherId, unitId, carrierId, sourceType, weight, loads, startTime, endTime, amount, carrierAmount, ticketIds, jobPaid, driverPaid, createdAt, updatedAt';

export interface Job {
  id: string;
  organizationId: string;
  jobDate: string;
  jobTypeId: string;
  driverId: string | null;
  dispatcherId: string | null;
  unitId: string | null;
  carrierId: string | null;
  sourceType: JobSourceType;
  weight: string | null;
  loads: number | null;
  startTime: string | null;
  endTime: string | null;
  amount: number | null;
  carrierAmount: number | null;
  ticketIds: string | null;
  jobPaid: boolean;
  driverPaid: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Resolved names from joins
  jobTypeTitle: string | null;
  jobTypeDispatchType: string | null;
  companyId: string | null;
  companyName: string | null;
  driverName: string | null;
  dispatcherName: string | null;
  unitName: string | null;
}

export interface CreateJobInput {
  jobDate: string;
  jobTypeId: string;
  driverId?: string | null;
  dispatcherId?: string | null;
  unitId?: string | null;
  carrierId?: string | null;
  sourceType?: JobSourceType;
  weight?: string | null;
  loads?: number | null;
  startTime?: string | null;
  endTime?: string | null;
  amount?: number | null;
  carrierAmount?: number | null;
  ticketIds?: string | null;
  jobPaid?: boolean;
  driverPaid?: boolean;
}

export interface UpdateJobInput extends Partial<CreateJobInput> {
  id: string;
}

export interface ListJobsOptions {
  sortBy?: string;
  order?: SortOrder;
  filters?: Record<string, string>;
}

export async function listJobs(
  organizationId: string,
  pagination: Pagination,
  options?: ListJobsOptions
): Promise<ListResult<Job>> {
  const sortBy = options?.sortBy && SORT_COLUMNS.includes(options.sortBy as typeof SORT_COLUMNS[number]) ? options.sortBy : 'jobDate';
  const order = options?.order === 'asc' ? 'ASC' : 'DESC';
  const filterClauses: string[] = [];
  const params: Record<string, unknown> = { organizationId, offset: pagination.offset, limit: pagination.limit };
  let needsJoins = true; // always join to resolve names (companyName, driverName, etc.)
  if (options?.filters) {
    // Global search across multiple columns including joined tables
    const searchTerm = options.filters['search'];
    if (searchTerm) {
      needsJoins = true;
      const escaped = String(searchTerm).replace(/[%_\\]/g, (c) => `\\${c}`);
      params['filter_search'] = `%${escaped}%`;
      filterClauses.push(`(
        (j.jobDate IS NOT NULL AND CAST(j.jobDate AS VARCHAR(30)) LIKE @filter_search ESCAPE '\\')
        OR (j.ticketIds IS NOT NULL AND j.ticketIds LIKE @filter_search ESCAPE '\\')
        OR (j.amount IS NOT NULL AND CAST(j.amount AS VARCHAR(20)) LIKE @filter_search ESCAPE '\\')
        OR (j.sourceType LIKE @filter_search ESCAPE '\\')
        OR (j.startTime IS NOT NULL AND j.startTime LIKE @filter_search ESCAPE '\\')
        OR (j.endTime IS NOT NULL AND j.endTime LIKE @filter_search ESCAPE '\\')
        OR (d.name IS NOT NULL AND d.name LIKE @filter_search ESCAPE '\\')
        OR (dp.name IS NOT NULL AND dp.name LIKE @filter_search ESCAPE '\\')
        OR (jt.title IS NOT NULL AND jt.title LIKE @filter_search ESCAPE '\\')
        OR (jt.startLocation IS NOT NULL AND jt.startLocation LIKE @filter_search ESCAPE '\\')
        OR (jt.endLocation IS NOT NULL AND jt.endLocation LIKE @filter_search ESCAPE '\\')
        OR (c.name IS NOT NULL AND c.name LIKE @filter_search ESCAPE '\\')
        OR (u.name IS NOT NULL AND u.name LIKE @filter_search ESCAPE '\\')
        OR (u.plateNumber IS NOT NULL AND u.plateNumber LIKE @filter_search ESCAPE '\\')
      )`);
    }

    for (const col of FILTER_COLUMNS) {
      const v = options.filters[col];
      if (v) {
        const escaped = String(v).replace(/[%_\\]/g, (c) => `\\${c}`);
        if (col === 'jobDate') {
          filterClauses.push(`(j.jobDate IS NOT NULL AND CAST(j.jobDate AS VARCHAR(30)) LIKE @filter_jobDate ESCAPE '\\')`);
          params['filter_jobDate'] = `%${escaped}%`;
        } else if (col === 'sourceType') {
          filterClauses.push("(j.sourceType = @filter_sourceType)");
          params['filter_sourceType'] = v;
        } else if (col === 'driverId' || col === 'dispatcherId' || col === 'unitId' || col === 'jobTypeId') {
          filterClauses.push(`(j.${col} = @filter_${col})`);
          params[`filter_${col}`] = v;
        } else {
          filterClauses.push("(j.amount IS NOT NULL AND CAST(j.amount AS VARCHAR(20)) LIKE @filter_amount ESCAPE '\\')");
          params['filter_amount'] = `%${escaped}%`;
        }
      }
    }
    // Date range filtering
    const dateFrom = options.filters['dateFrom'];
    const dateTo   = options.filters['dateTo'];
    if (dateFrom) {
      filterClauses.push(`(j.jobDate >= @filter_dateFrom)`);
      params['filter_dateFrom'] = dateFrom;
    }
    if (dateTo) {
      filterClauses.push(`(j.jobDate <= @filter_dateTo)`);
      params['filter_dateTo'] = dateTo;
    }
    // Boolean payment status filters — accept 'true'/'false' strings
    const jobPaidVal = options.filters['jobPaid'];
    if (jobPaidVal === 'true' || jobPaidVal === 'false') {
      filterClauses.push(`(j.jobPaid = @filter_jobPaid)`);
      params['filter_jobPaid'] = jobPaidVal === 'true' ? 1 : 0;
    }
    const driverPaidVal = options.filters['driverPaid'];
    if (driverPaidVal === 'true' || driverPaidVal === 'false') {
      filterClauses.push(`(j.driverPaid = @filter_driverPaid)`);
      params['filter_driverPaid'] = driverPaidVal === 'true' ? 1 : 0;
    }
  }
  const whereExtra = filterClauses.length ? ` AND ${filterClauses.join(' AND ')}` : '';
  const countParams: Record<string, unknown> = { organizationId };
  if (params['filter_search']      != null) countParams['filter_search']      = params['filter_search'];
  if (params['filter_dateFrom']    != null) countParams['filter_dateFrom']    = params['filter_dateFrom'];
  if (params['filter_dateTo']      != null) countParams['filter_dateTo']      = params['filter_dateTo'];
  if (params['filter_jobPaid']     != null) countParams['filter_jobPaid']     = params['filter_jobPaid'];
  if (params['filter_driverPaid']  != null) countParams['filter_driverPaid']  = params['filter_driverPaid'];
  FILTER_COLUMNS.forEach((col) => {
    if (params[`filter_${col}`] != null) countParams[`filter_${col}`] = params[`filter_${col}`];
  });

  const joins = `
    LEFT JOIN Drivers d ON j.driverId = d.id
    LEFT JOIN Dispatchers dp ON j.dispatcherId = dp.id
    LEFT JOIN JobTypes jt ON j.jobTypeId = jt.id
    LEFT JOIN Companies c ON jt.companyId = c.id
    LEFT JOIN Units u ON j.unitId = u.id`;

  const jobColumns = ALL_COLUMNS.split(', ').map(c => `j.${c}`).join(', ')
    + ', jt.title AS jobTypeTitle, jt.dispatchType AS jobTypeDispatchType, c.id AS companyId, c.name AS companyName, d.name AS driverName, dp.name AS dispatcherName, u.name AS unitName';

  const [rows, countRows] = await Promise.all([
    query<Job[]>(
      needsJoins
        ? `SELECT ${jobColumns} FROM Jobs j${joins} WHERE j.organizationId = @organizationId${whereExtra}
           ORDER BY j.${sortBy} ${order}, j.createdAt DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`
        : `SELECT ${jobColumns} FROM Jobs j WHERE j.organizationId = @organizationId${whereExtra}
           ORDER BY j.${sortBy} ${order}, j.createdAt DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
      { params }
    ),
    query<Array<{ total: number }>>(
      needsJoins
        ? `SELECT COUNT(*) AS total FROM Jobs j${joins} WHERE j.organizationId = @organizationId${whereExtra}`
        : `SELECT COUNT(*) AS total FROM Jobs j WHERE j.organizationId = @organizationId${whereExtra}`,
      { params: countParams }
    ),
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

export async function getJobById(id: string, organizationId: string): Promise<Job | null> {
  const rows = await query<Job[]>(
    `SELECT ${ALL_COLUMNS.split(', ').map(c => `j.${c}`).join(', ')},
            jt.title AS jobTypeTitle, jt.dispatchType AS jobTypeDispatchType, c.id AS companyId, c.name AS companyName,
            d.name AS driverName, dp.name AS dispatcherName, u.name AS unitName
     FROM Jobs j
     LEFT JOIN JobTypes jt ON j.jobTypeId = jt.id
     LEFT JOIN Companies c  ON jt.companyId = c.id
     LEFT JOIN Drivers d    ON j.driverId = d.id
     LEFT JOIN Dispatchers dp ON j.dispatcherId = dp.id
     LEFT JOIN Units u      ON j.unitId = u.id
     WHERE j.id = @id AND j.organizationId = @organizationId
    `,
    { params: { id, organizationId } }
  );
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

/**
 * Auto-calculate the job amount based on the job type's rate and dispatch type.
 * Returns null if rate is pending (NULL) or if we don't have enough data.
 */
async function autoCalcAmount(
  organizationId: string,
  jobTypeId: string,
  loads: number | null | undefined,
  weight: string | null | undefined,
  startTime: string | Date | null | undefined,
  endTime: string | Date | null | undefined
): Promise<number | null> {
  const jt = await getJobTypeById(jobTypeId, organizationId);
  if (!jt || jt.rateOfJob == null) return null;

  switch (jt.dispatchType) {
    case 'load':
      return jt.rateOfJob * (loads ?? 1);
    case 'fixed':
      return jt.rateOfJob;
    case 'hourly': {
      if (!startTime || !endTime) return null;
      const start = new Date(startTime).getTime();
      const end = new Date(endTime).getTime();
      if (isNaN(start) || isNaN(end) || end <= start) return null;
      const hours = (end - start) / (1000 * 60 * 60);
      return Math.round(jt.rateOfJob * hours * 100) / 100;
    }
    case 'tonnage': {
      if (!weight) return null;
      const w = parseFloat(weight);
      if (isNaN(w)) return null;
      return Math.round(jt.rateOfJob * w * 100) / 100;
    }
    default:
      return null;
  }
}

export async function createJob(organizationId: string, input: CreateJobInput): Promise<Job> {
  const id = uuid();
  const now = nowUTC();
  const jobPaid = input.jobPaid ?? false;
  const driverPaid = input.driverPaid ?? false;

  // Normalize startTime/endTime: parse any format as Eastern → store as UTC
  const startTime = parseTimeInputToUTC(input.jobDate, input.startTime);
  const endTime   = parseTimeInputToUTC(input.jobDate, input.endTime);

  // Auto-calculate amount if not explicitly provided
  let amount = input.amount ?? null;
  if (amount == null) {
    amount = await autoCalcAmount(organizationId, input.jobTypeId, input.loads, input.weight, startTime, endTime);
  }

  await query(
    `INSERT INTO Jobs (id, organizationId, jobDate, jobTypeId, driverId, dispatcherId, unitId, carrierId, sourceType, weight, loads, startTime, endTime, amount, carrierAmount, ticketIds, jobPaid, driverPaid, createdAt, updatedAt)
     VALUES (@id, @organizationId, @jobDate, @jobTypeId, @driverId, @dispatcherId, @unitId, @carrierId, @sourceType, @weight, @loads, @startTime, @endTime, @amount, @carrierAmount, @ticketIds, @jobPaid, @driverPaid, @createdAt, @updatedAt)`,
    {
      params: {
        id, organizationId, jobDate: input.jobDate, jobTypeId: input.jobTypeId,
        driverId: input.driverId ?? null, dispatcherId: input.dispatcherId ?? null, unitId: input.unitId ?? null,
        carrierId: input.carrierId ?? null, sourceType: input.sourceType ?? 'DISPATCHED',
        weight: input.weight ?? null, loads: input.loads ?? null, startTime, endTime,
        amount, carrierAmount: input.carrierAmount ?? null,
        ticketIds: input.ticketIds ?? null, jobPaid, driverPaid, createdAt: now, updatedAt: now,
      },
    }
  );
  const job = await getJobById(id, organizationId);
  if (!job) throw new Error('Failed to create job');
  return job;
}

export async function updateJob(organizationId: string, input: UpdateJobInput): Promise<Job | null> {
  const existing = await getJobById(input.id, organizationId);
  if (!existing) return null;

  // Resolve the effective jobDate (needed for time parsing context)
  const effectiveJobDate = String(input.jobDate ?? existing.jobDate);

  // Normalize startTime/endTime if provided — parse as Eastern → UTC
  const startTime = input.startTime !== undefined
    ? parseTimeInputToUTC(effectiveJobDate, input.startTime)
    : existing.startTime;
  const endTime = input.endTime !== undefined
    ? parseTimeInputToUTC(effectiveJobDate, input.endTime)
    : existing.endTime;

  const effectiveJobTypeId = input.jobTypeId ?? existing.jobTypeId;
  const effectiveWeight = input.weight !== undefined ? input.weight : existing.weight;
  const effectiveLoads = input.loads !== undefined ? input.loads : existing.loads;

  // Determine amount: if explicitly provided use it, otherwise try auto-calc if currently NULL
  let amount: number | null;
  if (input.amount !== undefined) {
    amount = input.amount;
  } else if (existing.amount == null) {
    // Amount is still NULL — try to auto-calculate
    amount = await autoCalcAmount(organizationId, effectiveJobTypeId, effectiveLoads, effectiveWeight, startTime, endTime);
  } else {
    amount = existing.amount;
  }

  const params: Record<string, unknown> = {
    id: input.id, organizationId,
    jobDate: input.jobDate ?? existing.jobDate, jobTypeId: effectiveJobTypeId,
    driverId: input.driverId !== undefined ? input.driverId : existing.driverId,
    dispatcherId: input.dispatcherId !== undefined ? input.dispatcherId : existing.dispatcherId,
    unitId: input.unitId !== undefined ? input.unitId : existing.unitId,
    carrierId: input.carrierId !== undefined ? input.carrierId : existing.carrierId,
    sourceType: input.sourceType !== undefined ? input.sourceType : existing.sourceType,
    weight: effectiveWeight,
    loads: effectiveLoads,
    startTime, endTime,
    amount,
    carrierAmount: input.carrierAmount !== undefined ? input.carrierAmount : existing.carrierAmount,
    ticketIds: input.ticketIds !== undefined ? input.ticketIds : existing.ticketIds,
    jobPaid: input.jobPaid !== undefined ? input.jobPaid : existing.jobPaid,
    driverPaid: input.driverPaid !== undefined ? input.driverPaid : existing.driverPaid,
    updatedAt: nowUTC(),
  };
  await query(
    `UPDATE Jobs SET jobDate = @jobDate, jobTypeId = @jobTypeId, driverId = @driverId, dispatcherId = @dispatcherId, unitId = @unitId,
       carrierId = @carrierId, sourceType = @sourceType, weight = @weight, loads = @loads, startTime = @startTime, endTime = @endTime,
       amount = @amount, carrierAmount = @carrierAmount, ticketIds = @ticketIds, jobPaid = @jobPaid, driverPaid = @driverPaid, updatedAt = @updatedAt
     WHERE id = @id AND organizationId = @organizationId`,
    { params }
  );
  return getJobById(input.id, organizationId);
}

export async function deleteJob(id: string, organizationId: string): Promise<boolean> {
  const existing = await getJobById(id, organizationId);
  if (!existing) return false;
  await query(`DELETE FROM Jobs WHERE id = @id AND organizationId = @organizationId`, { params: { id, organizationId } });
  return true;
}
