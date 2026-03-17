import { v4 as uuid } from 'uuid';
import { query } from '../db/connection';
import { type Pagination, type ListResult, type SortOrder } from '../types';

const SORT_COLUMNS = ['name', 'email', 'phone', 'commissionPercent', 'createdAt'] as const;
const FILTER_COLUMNS = ['name', 'email', 'phone'] as const;

export interface Dispatcher {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  email: string | null;
  phone: string | null;
  commissionPercent: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDispatcherInput {
  name: string;
  description?: string | null;
  email?: string | null;
  phone?: string | null;
  commissionPercent?: number;
}

export interface UpdateDispatcherInput extends Partial<CreateDispatcherInput> {
  id: string;
}

export interface ListDispatchersOptions {
  sortBy?: string;
  order?: SortOrder;
  filters?: Record<string, string>;
}

export async function listDispatchers(
  organizationId: string,
  pagination: Pagination,
  options?: ListDispatchersOptions
): Promise<ListResult<Dispatcher>> {
  const sortBy = options?.sortBy && SORT_COLUMNS.includes(options.sortBy as typeof SORT_COLUMNS[number]) ? options.sortBy : 'name';
  const order = options?.order === 'desc' ? 'DESC' : 'ASC';
  const filterClauses: string[] = [];
  const params: Record<string, unknown> = { organizationId, offset: pagination.offset, limit: pagination.limit };
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
  const countParams: Record<string, unknown> = { organizationId };
  FILTER_COLUMNS.forEach((col) => { if (params[`filter_${col}`] != null) countParams[`filter_${col}`] = params[`filter_${col}`]; });
  const [rows, countRows] = await Promise.all([
    query<Dispatcher[]>(
      `SELECT id, organizationId, name, description, email, phone, commissionPercent, createdAt, updatedAt
       FROM Dispatchers WHERE organizationId = @organizationId${whereExtra}
       ORDER BY ${sortBy} ${order} OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
      { params }
    ),
    query<Array<{ total: number }>>(
      `SELECT COUNT(*) AS total FROM Dispatchers WHERE organizationId = @organizationId${whereExtra}`,
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

export async function getDispatcherById(
  id: string,
  organizationId: string
): Promise<Dispatcher | null> {
  const rows = await query<Dispatcher[]>(
    `SELECT id, organizationId, name, description, email, phone, commissionPercent, createdAt, updatedAt
     FROM Dispatchers WHERE id = @id AND organizationId = @organizationId`,
    { params: { id, organizationId } }
  );
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

export async function createDispatcher(
  organizationId: string,
  input: CreateDispatcherInput
): Promise<Dispatcher> {
  const id = uuid();
  const now = new Date();
  await query(
    `INSERT INTO Dispatchers (id, organizationId, name, description, email, phone, commissionPercent, createdAt, updatedAt)
     VALUES (@id, @organizationId, @name, @description, @email, @phone, @commissionPercent, @createdAt, @updatedAt)`,
    {
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
    }
  );
  const dispatcher = await getDispatcherById(id, organizationId);
  if (!dispatcher) throw new Error('Failed to create dispatcher');
  return dispatcher;
}

export async function updateDispatcher(
  organizationId: string,
  input: UpdateDispatcherInput
): Promise<Dispatcher | null> {
  const existing = await getDispatcherById(input.id, organizationId);
  if (!existing) return null;

  const params: Record<string, unknown> = {
    id: input.id,
    organizationId,
    name: input.name ?? existing.name,
    description: input.description !== undefined ? input.description : existing.description,
    email: input.email !== undefined ? input.email : existing.email,
    phone: input.phone !== undefined ? input.phone : existing.phone,
    commissionPercent: input.commissionPercent !== undefined ? input.commissionPercent : existing.commissionPercent,
    updatedAt: new Date(),
  };

  await query(
    `UPDATE Dispatchers SET
       name = @name, description = @description, email = @email, phone = @phone, commissionPercent = @commissionPercent, updatedAt = @updatedAt
     WHERE id = @id AND organizationId = @organizationId`,
    { params }
  );
  return getDispatcherById(input.id, organizationId);
}

export async function deleteDispatcher(
  id: string,
  organizationId: string
): Promise<boolean> {
  const existing = await getDispatcherById(id, organizationId);
  if (!existing) return false;
  await query(
    `DELETE FROM Dispatchers WHERE id = @id AND organizationId = @organizationId`,
    { params: { id, organizationId } }
  );
  return true;
}
