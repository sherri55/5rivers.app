import { v4 as uuid } from 'uuid';
import { query } from '../db/connection';
import { type Pagination, type ListResult, type SortOrder } from '../types';

const SORT_COLUMNS = ['title', 'startLocation', 'endLocation', 'dispatchType', 'rateOfJob', 'createdAt'] as const;
const FILTER_COLUMNS = ['title'] as const;
import { getCompanyById } from './company.service';

export interface JobType {
  id: string;
  companyId: string;
  title: string;
  startLocation: string | null;
  endLocation: string | null;
  dispatchType: string;
  rateOfJob: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateJobTypeInput {
  companyId: string;
  title: string;
  startLocation?: string | null;
  endLocation?: string | null;
  dispatchType?: string;
  rateOfJob?: number;
}

export interface UpdateJobTypeInput extends Partial<Omit<CreateJobTypeInput, 'companyId'>> {
  id: string;
}

async function ensureCompanyInOrg(companyId: string, organizationId: string): Promise<void> {
  const company = await getCompanyById(companyId, organizationId);
  if (!company) throw new Error('Company not found or access denied');
}

export interface ListJobTypesOptions {
  sortBy?: string;
  order?: SortOrder;
  filters?: Record<string, string>;
}

export async function listJobTypes(
  organizationId: string,
  pagination: Pagination,
  companyId?: string,
  options?: ListJobTypesOptions
): Promise<ListResult<JobType>> {
  const sortBy = options?.sortBy && SORT_COLUMNS.includes(options.sortBy as typeof SORT_COLUMNS[number]) ? options.sortBy : 'title';
  const order = options?.order === 'desc' ? 'DESC' : 'ASC';
  const params: Record<string, unknown> = { organizationId, offset: pagination.offset, limit: pagination.limit };
  if (companyId) params.companyId = companyId;
  const companyClause = companyId ? ' AND jt.companyId = @companyId' : '';
  const filterClauses: string[] = [];
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
  const countParams: Record<string, unknown> = { organizationId };
  if (companyId) countParams.companyId = companyId;
  if (params['filter_search'] != null) countParams['filter_search'] = params['filter_search'];
  FILTER_COLUMNS.forEach((col) => { if (params[`filter_${col}`] != null) countParams[`filter_${col}`] = params[`filter_${col}`]; });
  const [rows, countRows] = await Promise.all([
    query<JobType[]>(
      `SELECT jt.id, jt.companyId, jt.title, jt.startLocation, jt.endLocation, jt.dispatchType, jt.rateOfJob, jt.createdAt, jt.updatedAt
       FROM JobTypes jt INNER JOIN Companies c ON c.id = jt.companyId AND c.organizationId = @organizationId
       WHERE 1=1${companyClause}${filterWhere} ORDER BY jt.${sortBy} ${order} OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
      { params }
    ),
    query<Array<{ total: number }>>(
      `SELECT COUNT(*) AS total FROM JobTypes jt INNER JOIN Companies c ON c.id = jt.companyId AND c.organizationId = @organizationId WHERE 1=1${companyClause}${filterWhere}`,
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

export async function getJobTypeById(id: string, organizationId: string): Promise<JobType | null> {
  const rows = await query<JobType[]>(
    `SELECT jt.id, jt.companyId, jt.title, jt.startLocation, jt.endLocation, jt.dispatchType, jt.rateOfJob, jt.createdAt, jt.updatedAt
     FROM JobTypes jt INNER JOIN Companies c ON c.id = jt.companyId AND c.organizationId = @organizationId WHERE jt.id = @id`,
    { params: { id, organizationId } }
  );
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

export async function createJobType(organizationId: string, input: CreateJobTypeInput): Promise<JobType> {
  await ensureCompanyInOrg(input.companyId, organizationId);
  const id = uuid();
  const now = new Date();
  await query(
    `INSERT INTO JobTypes (id, companyId, title, startLocation, endLocation, dispatchType, rateOfJob, createdAt, updatedAt)
     VALUES (@id, @companyId, @title, @startLocation, @endLocation, @dispatchType, @rateOfJob, @createdAt, @updatedAt)`,
    {
      params: {
        id, companyId: input.companyId, title: input.title,
        startLocation: input.startLocation ?? null, endLocation: input.endLocation ?? null,
        dispatchType: input.dispatchType ?? 'STANDARD', rateOfJob: input.rateOfJob ?? 0,
        createdAt: now, updatedAt: now,
      },
    }
  );
  const jobType = await getJobTypeById(id, organizationId);
  if (!jobType) throw new Error('Failed to create job type');
  return jobType;
}

export async function updateJobType(organizationId: string, input: UpdateJobTypeInput): Promise<JobType | null> {
  const existing = await getJobTypeById(input.id, organizationId);
  if (!existing) return null;
  const params: Record<string, unknown> = {
    id: input.id,
    title: input.title ?? existing.title,
    startLocation: input.startLocation !== undefined ? input.startLocation : existing.startLocation,
    endLocation: input.endLocation !== undefined ? input.endLocation : existing.endLocation,
    dispatchType: input.dispatchType ?? existing.dispatchType,
    rateOfJob: input.rateOfJob !== undefined ? input.rateOfJob : existing.rateOfJob,
    updatedAt: new Date(),
  };
  await query(
    `UPDATE JobTypes SET title = @title, startLocation = @startLocation, endLocation = @endLocation, dispatchType = @dispatchType, rateOfJob = @rateOfJob, updatedAt = @updatedAt WHERE id = @id`,
    { params }
  );
  return getJobTypeById(input.id, organizationId);
}

export async function deleteJobType(id: string, organizationId: string): Promise<boolean> {
  const existing = await getJobTypeById(id, organizationId);
  if (!existing) return false;
  await query(`DELETE FROM JobTypes WHERE id = @id`, { params: { id } });
  return true;
}
