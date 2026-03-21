import { v4 as uuid } from 'uuid';
import { query } from '../db/connection';
import { type Pagination, type ListResult, type SortOrder } from '../types';

const SORT_COLUMNS = ['jobDate', 'amount', 'sourceType', 'createdAt'] as const;
const FILTER_COLUMNS = ['jobDate', 'amount', 'sourceType'] as const;

export type JobSourceType = 'DISPATCHED' | 'DIRECT';

const ALL_COLUMNS = 'id, organizationId, jobDate, jobTypeId, driverId, dispatcherId, unitId, carrierId, sourceType, weight, loads, startTime, endTime, amount, carrierAmount, ticketIds, driverPaid, createdAt, updatedAt';

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
  driverPaid: boolean;
  createdAt: Date;
  updatedAt: Date;
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
  if (options?.filters) {
    for (const col of FILTER_COLUMNS) {
      const v = options.filters[col];
      if (v) {
        const escaped = String(v).replace(/[%_\\]/g, (c) => `\\${c}`);
        if (col === 'jobDate') {
          filterClauses.push("(jobDate IS NOT NULL AND jobDate LIKE @filter_jobDate ESCAPE '\\')");
          params['filter_jobDate'] = `%${escaped}%`;
        } else if (col === 'sourceType') {
          filterClauses.push("(sourceType = @filter_sourceType)");
          params['filter_sourceType'] = v;
        } else {
          filterClauses.push("(amount IS NOT NULL AND CAST(amount AS VARCHAR(20)) LIKE @filter_amount ESCAPE '\\')");
          params['filter_amount'] = `%${escaped}%`;
        }
      }
    }
  }
  const whereExtra = filterClauses.length ? ` AND ${filterClauses.join(' AND ')}` : '';
  const countParams: Record<string, unknown> = { organizationId };
  FILTER_COLUMNS.forEach((col) => {
    if (params[`filter_${col}`] != null) countParams[`filter_${col}`] = params[`filter_${col}`];
  });
  const [rows, countRows] = await Promise.all([
    query<Job[]>(
      `SELECT ${ALL_COLUMNS}
       FROM Jobs WHERE organizationId = @organizationId${whereExtra}
       ORDER BY ${sortBy} ${order}, createdAt DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
      { params }
    ),
    query<Array<{ total: number }>>(
      `SELECT COUNT(*) AS total FROM Jobs WHERE organizationId = @organizationId${whereExtra}`,
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
    `SELECT ${ALL_COLUMNS}
     FROM Jobs WHERE id = @id AND organizationId = @organizationId`,
    { params: { id, organizationId } }
  );
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

export async function createJob(organizationId: string, input: CreateJobInput): Promise<Job> {
  const id = uuid();
  const now = new Date();
  const driverPaid = input.driverPaid ?? false;
  await query(
    `INSERT INTO Jobs (id, organizationId, jobDate, jobTypeId, driverId, dispatcherId, unitId, carrierId, sourceType, weight, loads, startTime, endTime, amount, carrierAmount, ticketIds, driverPaid, createdAt, updatedAt)
     VALUES (@id, @organizationId, @jobDate, @jobTypeId, @driverId, @dispatcherId, @unitId, @carrierId, @sourceType, @weight, @loads, @startTime, @endTime, @amount, @carrierAmount, @ticketIds, @driverPaid, @createdAt, @updatedAt)`,
    {
      params: {
        id, organizationId, jobDate: input.jobDate, jobTypeId: input.jobTypeId,
        driverId: input.driverId ?? null, dispatcherId: input.dispatcherId ?? null, unitId: input.unitId ?? null,
        carrierId: input.carrierId ?? null, sourceType: input.sourceType ?? 'DISPATCHED',
        weight: input.weight ?? null, loads: input.loads ?? null, startTime: input.startTime ?? null, endTime: input.endTime ?? null,
        amount: input.amount ?? null, carrierAmount: input.carrierAmount ?? null,
        ticketIds: input.ticketIds ?? null, driverPaid, createdAt: now, updatedAt: now,
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
  const params: Record<string, unknown> = {
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
  await query(
    `UPDATE Jobs SET jobDate = @jobDate, jobTypeId = @jobTypeId, driverId = @driverId, dispatcherId = @dispatcherId, unitId = @unitId,
       carrierId = @carrierId, sourceType = @sourceType, weight = @weight, loads = @loads, startTime = @startTime, endTime = @endTime,
       amount = @amount, carrierAmount = @carrierAmount, ticketIds = @ticketIds, driverPaid = @driverPaid, updatedAt = @updatedAt
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
