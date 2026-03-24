import { v4 as uuid } from 'uuid';
import { query } from '../db/connection';
import { type Pagination, type ListResult, type SortOrder } from '../types';
import { nowEastern } from '../utils/timezone';

const SORT_COLUMNS = ['name', 'description', 'color', 'plateNumber', 'vin', 'status', 'year', 'make', 'model', 'mileage', 'insuranceExpiry', 'lastMaintenanceDate', 'nextMaintenanceDate', 'createdAt'] as const;
const FILTER_COLUMNS = ['name', 'plateNumber', 'vin', 'color', 'status', 'make', 'model'] as const;

const ALL_COLUMNS = 'id, organizationId, name, description, color, plateNumber, vin, status, year, make, model, mileage, insuranceExpiry, lastMaintenanceDate, nextMaintenanceDate, createdAt, updatedAt';

export type UnitStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'RETIRED';

export interface Unit {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  color: string | null;
  plateNumber: string | null;
  vin: string | null;
  status: UnitStatus;
  year: number | null;
  make: string | null;
  model: string | null;
  mileage: number | null;
  insuranceExpiry: string | null;
  lastMaintenanceDate: string | null;
  nextMaintenanceDate: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUnitInput {
  name: string;
  description?: string | null;
  color?: string | null;
  plateNumber?: string | null;
  vin?: string | null;
  status?: UnitStatus;
  year?: number | null;
  make?: string | null;
  model?: string | null;
  mileage?: number | null;
  insuranceExpiry?: string | null;
  lastMaintenanceDate?: string | null;
  nextMaintenanceDate?: string | null;
}

export interface UpdateUnitInput extends Partial<CreateUnitInput> {
  id: string;
}

export interface ListUnitsOptions {
  sortBy?: string;
  order?: SortOrder;
  filters?: Record<string, string>;
}

export async function listUnits(
  organizationId: string,
  pagination: Pagination,
  options?: ListUnitsOptions
): Promise<ListResult<Unit>> {
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
        OR (description IS NOT NULL AND description LIKE @filter_search ESCAPE '\\')
        OR (plateNumber IS NOT NULL AND plateNumber LIKE @filter_search ESCAPE '\\')
        OR (vin IS NOT NULL AND vin LIKE @filter_search ESCAPE '\\')
        OR (make IS NOT NULL AND make LIKE @filter_search ESCAPE '\\')
        OR (model IS NOT NULL AND model LIKE @filter_search ESCAPE '\\')
        OR (color IS NOT NULL AND color LIKE @filter_search ESCAPE '\\')
        OR (status LIKE @filter_search ESCAPE '\\')
      )`);
    }
    for (const col of FILTER_COLUMNS) {
      const v = options.filters[col];
      if (v) {
        if (col === 'status') {
          filterClauses.push(`(status = @filter_status)`);
          params['filter_status'] = v;
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
  FILTER_COLUMNS.forEach((col) => { if (params[`filter_${col}`] != null) countParams[`filter_${col}`] = params[`filter_${col}`]; });
  const [rows, countRows] = await Promise.all([
    query<Unit[]>(
      `SELECT ${ALL_COLUMNS}
       FROM Units WHERE organizationId = @organizationId${whereExtra}
       ORDER BY ${sortBy} ${order} OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
      { params }
    ),
    query<Array<{ total: number }>>(
      `SELECT COUNT(*) AS total FROM Units WHERE organizationId = @organizationId${whereExtra}`,
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

export async function getUnitById(id: string, organizationId: string): Promise<Unit | null> {
  const rows = await query<Unit[]>(
    `SELECT ${ALL_COLUMNS}
     FROM Units WHERE id = @id AND organizationId = @organizationId`,
    { params: { id, organizationId } }
  );
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

export async function createUnit(organizationId: string, input: CreateUnitInput): Promise<Unit> {
  const id = uuid();
  const now = nowEastern();
  await query(
    `INSERT INTO Units (id, organizationId, name, description, color, plateNumber, vin, status, year, make, model, mileage, insuranceExpiry, lastMaintenanceDate, nextMaintenanceDate, createdAt, updatedAt)
     VALUES (@id, @organizationId, @name, @description, @color, @plateNumber, @vin, @status, @year, @make, @model, @mileage, @insuranceExpiry, @lastMaintenanceDate, @nextMaintenanceDate, @createdAt, @updatedAt)`,
    {
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
    }
  );
  const unit = await getUnitById(id, organizationId);
  if (!unit) throw new Error('Failed to create unit');
  return unit;
}

export async function updateUnit(organizationId: string, input: UpdateUnitInput): Promise<Unit | null> {
  const existing = await getUnitById(input.id, organizationId);
  if (!existing) return null;
  const params: Record<string, unknown> = {
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
    updatedAt: nowEastern(),
  };
  await query(
    `UPDATE Units SET name = @name, description = @description, color = @color, plateNumber = @plateNumber, vin = @vin,
       status = @status, year = @year, make = @make, model = @model, mileage = @mileage,
       insuranceExpiry = @insuranceExpiry, lastMaintenanceDate = @lastMaintenanceDate, nextMaintenanceDate = @nextMaintenanceDate,
       updatedAt = @updatedAt
     WHERE id = @id AND organizationId = @organizationId`,
    { params }
  );
  return getUnitById(input.id, organizationId);
}

export async function deleteUnit(id: string, organizationId: string): Promise<boolean> {
  const existing = await getUnitById(id, organizationId);
  if (!existing) return false;
  await query(`DELETE FROM Units WHERE id = @id AND organizationId = @organizationId`, { params: { id, organizationId } });
  return true;
}
