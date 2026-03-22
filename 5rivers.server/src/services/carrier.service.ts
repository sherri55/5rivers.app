import { v4 as uuid } from 'uuid';
import { query } from '../db/connection';
import {
  type Pagination,
  type ListResult,
  type SortOrder,
} from '../types';

const ALL_COLUMNS = 'id, organizationId, name, description, contactPerson, email, phone, rateType, rate, status, createdAt, updatedAt';
const SORT_COLUMNS = ['name', 'contactPerson', 'email', 'phone', 'rateType', 'rate', 'status', 'createdAt'] as const;
const FILTER_COLUMNS = ['name', 'email', 'rateType', 'status'] as const;

export type CarrierRateType = 'PERCENTAGE' | 'FLAT_PER_JOB' | 'FLAT_PER_LOAD' | 'FLAT_PER_TON' | 'HOURLY';
export type CarrierStatus = 'ACTIVE' | 'INACTIVE';

export interface Carrier {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  rateType: CarrierRateType;
  rate: number;
  status: CarrierStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCarrierInput {
  name: string;
  description?: string | null;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  rateType?: CarrierRateType;
  rate?: number;
  status?: CarrierStatus;
}

export interface UpdateCarrierInput extends Partial<CreateCarrierInput> {
  id: string;
}

export interface ListCarriersOptions {
  sortBy?: string;
  order?: SortOrder;
  filters?: Record<string, string>;
}

export async function listCarriers(
  organizationId: string,
  pagination: Pagination,
  options?: ListCarriersOptions
): Promise<ListResult<Carrier>> {
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
        } else {
          filterClauses.push(`(${col} IS NOT NULL AND ${col} LIKE @filter_${col} ESCAPE '\\')`);
          params[`filter_${col}`] = `%${String(v).replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
        }
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
    query<Carrier[]>(
      `SELECT ${ALL_COLUMNS}
       FROM Carriers WHERE organizationId = @organizationId${whereExtra}
       ORDER BY ${sortBy} ${order}
       OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
      { params }
    ),
    query<Array<{ total: number }>>(
      `SELECT COUNT(*) AS total FROM Carriers WHERE organizationId = @organizationId${whereExtra}`,
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

export async function getCarrierById(
  id: string,
  organizationId: string
): Promise<Carrier | null> {
  const rows = await query<Carrier[]>(
    `SELECT ${ALL_COLUMNS} FROM Carriers WHERE id = @id AND organizationId = @organizationId`,
    { params: { id, organizationId } }
  );
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

export async function createCarrier(
  organizationId: string,
  input: CreateCarrierInput
): Promise<Carrier> {
  const id = uuid();
  const now = new Date();
  await query(
    `INSERT INTO Carriers (id, organizationId, name, description, contactPerson, email, phone, rateType, rate, status, createdAt, updatedAt)
     VALUES (@id, @organizationId, @name, @description, @contactPerson, @email, @phone, @rateType, @rate, @status, @createdAt, @updatedAt)`,
    {
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
    }
  );
  const carrier = await getCarrierById(id, organizationId);
  if (!carrier) throw new Error('Failed to create carrier');
  return carrier;
}

export async function updateCarrier(
  organizationId: string,
  input: UpdateCarrierInput
): Promise<Carrier | null> {
  const existing = await getCarrierById(input.id, organizationId);
  if (!existing) return null;

  const params: Record<string, unknown> = {
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
    updatedAt: new Date(),
  };

  await query(
    `UPDATE Carriers SET
       name = @name, description = @description, contactPerson = @contactPerson, email = @email, phone = @phone,
       rateType = @rateType, rate = @rate, status = @status, updatedAt = @updatedAt
     WHERE id = @id AND organizationId = @organizationId`,
    { params }
  );
  return getCarrierById(input.id, organizationId);
}

export async function deleteCarrier(
  id: string,
  organizationId: string
): Promise<boolean> {
  const existing = await getCarrierById(id, organizationId);
  if (!existing) return false;
  await query(
    `DELETE FROM Carriers WHERE id = @id AND organizationId = @organizationId`,
    { params: { id, organizationId } }
  );
  return true;
}
