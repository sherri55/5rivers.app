import { v4 as uuid } from 'uuid';
import { query } from '../db/connection';
import {
  type Pagination,
  type ListResult,
  type SortOrder,
} from '../types';
import { nowEastern } from '../utils/timezone';

const SORT_COLUMNS = ['name', 'description', 'email', 'phone', 'hourlyRate', 'percentageRate', 'payType', 'createdAt'] as const;
const FILTER_COLUMNS = ['name', 'email', 'phone', 'payType'] as const;

export type DriverPayType = 'HOURLY' | 'PERCENTAGE' | 'CUSTOM';

export interface Driver {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  email: string | null;
  phone: string | null;
  payType: DriverPayType;
  hourlyRate: number;
  percentageRate: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDriverInput {
  name: string;
  description?: string | null;
  email?: string | null;
  phone?: string | null;
  payType?: DriverPayType;
  hourlyRate?: number;
  percentageRate?: number;
}

export interface UpdateDriverInput extends Partial<CreateDriverInput> {
  id: string;
}

export interface ListDriversOptions {
  sortBy?: string;
  order?: SortOrder;
  filters?: Record<string, string>;
}

export async function listDrivers(
  organizationId: string,
  pagination: Pagination,
  options?: ListDriversOptions
): Promise<ListResult<Driver>> {
  const sortBy = options?.sortBy && SORT_COLUMNS.includes(options.sortBy as typeof SORT_COLUMNS[number]) ? options.sortBy : 'name';
  const order = options?.order === 'desc' ? 'DESC' : 'ASC';
  const filterClauses: string[] = [];
  const params: Record<string, unknown> = { organizationId, offset: pagination.offset, limit: pagination.limit };
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
  const countParams: Record<string, unknown> = { organizationId };
  if (params['filter_search'] != null) countParams['filter_search'] = params['filter_search'];
  FILTER_COLUMNS.forEach((col) => {
    if (params[`filter_${col}`] != null) countParams[`filter_${col}`] = params[`filter_${col}`];
  });
  const [rows, countRows] = await Promise.all([
    query<Driver[]>(
      `SELECT id, organizationId, name, description, email, phone, payType, hourlyRate, percentageRate, createdAt, updatedAt
       FROM Drivers WHERE organizationId = @organizationId${whereExtra}
       ORDER BY ${sortBy} ${order}
       OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
      { params }
    ),
    query<Array<{ total: number }>>(
      `SELECT COUNT(*) AS total FROM Drivers WHERE organizationId = @organizationId${whereExtra}`,
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

export async function getDriverById(
  id: string,
  organizationId: string
): Promise<Driver | null> {
  const rows = await query<Driver[]>(
    `SELECT id, organizationId, name, description, email, phone, payType, hourlyRate, percentageRate, createdAt, updatedAt
     FROM Drivers WHERE id = @id AND organizationId = @organizationId`,
    { params: { id, organizationId } }
  );
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

export async function createDriver(
  organizationId: string,
  input: CreateDriverInput
): Promise<Driver> {
  const id = uuid();
  const now = nowEastern();
  await query(
    `INSERT INTO Drivers (id, organizationId, name, description, email, phone, payType, hourlyRate, percentageRate, createdAt, updatedAt)
     VALUES (@id, @organizationId, @name, @description, @email, @phone, @payType, @hourlyRate, @percentageRate, @createdAt, @updatedAt)`,
    {
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
    }
  );
  const driver = await getDriverById(id, organizationId);
  if (!driver) throw new Error('Failed to create driver');
  return driver;
}

export async function updateDriver(
  organizationId: string,
  input: UpdateDriverInput
): Promise<Driver | null> {
  const existing = await getDriverById(input.id, organizationId);
  if (!existing) return null;

  const params: Record<string, unknown> = {
    id: input.id,
    organizationId,
    name: input.name ?? existing.name,
    description: input.description !== undefined ? input.description : existing.description,
    email: input.email !== undefined ? input.email : existing.email,
    phone: input.phone !== undefined ? input.phone : existing.phone,
    payType: input.payType !== undefined ? input.payType : existing.payType,
    hourlyRate: input.hourlyRate !== undefined ? input.hourlyRate : existing.hourlyRate,
    percentageRate: input.percentageRate !== undefined ? input.percentageRate : existing.percentageRate,
    updatedAt: nowEastern(),
  };

  await query(
    `UPDATE Drivers SET
       name = @name, description = @description, email = @email, phone = @phone, payType = @payType, hourlyRate = @hourlyRate, percentageRate = @percentageRate, updatedAt = @updatedAt
     WHERE id = @id AND organizationId = @organizationId`,
    { params }
  );
  return getDriverById(input.id, organizationId);
}

export async function deleteDriver(
  id: string,
  organizationId: string
): Promise<boolean> {
  const existing = await getDriverById(id, organizationId);
  if (!existing) return false;
  await query(
    `DELETE FROM Drivers WHERE id = @id AND organizationId = @organizationId`,
    { params: { id, organizationId } }
  );
  return true;
}
