import { v4 as uuid } from 'uuid';
import { query } from '../db/connection';
import {
  normalizePagination,
  type Pagination,
  type ListResult,
  type SortOrder,
} from '../types';

const SORT_COLUMNS = ['name', 'description', 'email', 'phone', 'createdAt'] as const;
const FILTER_COLUMNS = ['name', 'description', 'email', 'phone'] as const;

export interface Company {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  website: string | null;
  industry: string | null;
  location: string | null;
  size: string | null;
  founded: number | null;
  logo: string | null;
  email: string | null;
  phone: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCompanyInput {
  name: string;
  description?: string | null;
  website?: string | null;
  industry?: string | null;
  location?: string | null;
  size?: string | null;
  founded?: number | null;
  logo?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface UpdateCompanyInput extends Partial<CreateCompanyInput> {
  id: string;
}

export interface ListCompaniesOptions {
  sortBy?: string;
  order?: SortOrder;
  filters?: Record<string, string>;
}

export async function listCompanies(
  organizationId: string,
  pagination: Pagination,
  options?: ListCompaniesOptions
): Promise<ListResult<Company>> {
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
        OR (email IS NOT NULL AND email LIKE @filter_search ESCAPE '\\')
        OR (phone IS NOT NULL AND phone LIKE @filter_search ESCAPE '\\')
        OR (website IS NOT NULL AND website LIKE @filter_search ESCAPE '\\')
        OR (industry IS NOT NULL AND industry LIKE @filter_search ESCAPE '\\')
        OR (location IS NOT NULL AND location LIKE @filter_search ESCAPE '\\')
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
    query<Company[]>(
      `SELECT id, organizationId, name, description, website, industry, location, size, founded, logo, email, phone, createdAt, updatedAt
       FROM Companies
       WHERE organizationId = @organizationId${whereExtra}
       ORDER BY ${sortBy} ${order}
       OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
      { params }
    ),
    query<Array<{ total: number }>>(
      `SELECT COUNT(*) AS total FROM Companies WHERE organizationId = @organizationId${whereExtra}`,
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

export async function getCompanyById(
  id: string,
  organizationId: string
): Promise<Company | null> {
  const rows = await query<Company[]>(
    `SELECT id, organizationId, name, description, website, industry, location, size, founded, logo, email, phone, createdAt, updatedAt
     FROM Companies WHERE id = @id AND organizationId = @organizationId`,
    { params: { id, organizationId } }
  );
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

export async function createCompany(
  organizationId: string,
  input: CreateCompanyInput
): Promise<Company> {
  const id = uuid();
  const now = new Date();
  await query(
    `INSERT INTO Companies (id, organizationId, name, description, website, industry, location, size, founded, logo, email, phone, createdAt, updatedAt)
     VALUES (@id, @organizationId, @name, @description, @website, @industry, @location, @size, @founded, @logo, @email, @phone, @createdAt, @updatedAt)`,
    {
      params: {
        id,
        organizationId,
        name: input.name,
        description: input.description ?? null,
        website: input.website ?? null,
        industry: input.industry ?? null,
        location: input.location ?? null,
        size: input.size ?? null,
        founded: input.founded ?? null,
        logo: input.logo ?? null,
        email: input.email ?? null,
        phone: input.phone ?? null,
        createdAt: now,
        updatedAt: now,
      },
    }
  );
  const company = await getCompanyById(id, organizationId);
  if (!company) throw new Error('Failed to create company');
  return company;
}

export async function updateCompany(
  organizationId: string,
  input: UpdateCompanyInput
): Promise<Company | null> {
  const existing = await getCompanyById(input.id, organizationId);
  if (!existing) return null;

  const params: Record<string, unknown> = {
    id: input.id,
    organizationId,
    name: input.name ?? existing.name,
    description: input.description !== undefined ? input.description : existing.description,
    website: input.website !== undefined ? input.website : existing.website,
    industry: input.industry !== undefined ? input.industry : existing.industry,
    location: input.location !== undefined ? input.location : existing.location,
    size: input.size !== undefined ? input.size : existing.size,
    founded: input.founded !== undefined ? input.founded : existing.founded,
    logo: input.logo !== undefined ? input.logo : existing.logo,
    email: input.email !== undefined ? input.email : existing.email,
    phone: input.phone !== undefined ? input.phone : existing.phone,
    updatedAt: new Date(),
  };

  await query(
    `UPDATE Companies SET
       name = @name, description = @description, website = @website, industry = @industry,
       location = @location, size = @size, founded = @founded, logo = @logo, email = @email, phone = @phone, updatedAt = @updatedAt
     WHERE id = @id AND organizationId = @organizationId`,
    { params }
  );
  return getCompanyById(input.id, organizationId);
}

export async function deleteCompany(
  id: string,
  organizationId: string
): Promise<boolean> {
  const existing = await getCompanyById(id, organizationId);
  if (!existing) return false;
  await query(
    `DELETE FROM Companies WHERE id = @id AND organizationId = @organizationId`,
    { params: { id, organizationId } }
  );
  return true;
}
