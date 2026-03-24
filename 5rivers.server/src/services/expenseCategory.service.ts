import { v4 as uuid } from 'uuid';
import { query } from '../db/connection';
import {
  normalizePagination,
  type Pagination,
  type ListResult,
  type SortOrder,
} from '../types';
import { nowEastern } from '../utils/timezone';

const SORT_COLUMNS = ['name', 'createdAt'] as const;

export interface ExpenseCategory {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  color: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateExpenseCategoryInput {
  name: string;
  description?: string | null;
  color?: string | null;
  isActive?: boolean;
}

export interface UpdateExpenseCategoryInput extends Partial<CreateExpenseCategoryInput> {
  id: string;
}

export interface ListExpenseCategoriesOptions {
  sortBy?: string;
  order?: SortOrder;
  filters?: Record<string, string>;
}

export async function listExpenseCategories(
  organizationId: string,
  pagination: Pagination,
  options?: ListExpenseCategoriesOptions
): Promise<ListResult<ExpenseCategory>> {
  const sortBy = options?.sortBy && SORT_COLUMNS.includes(options.sortBy as typeof SORT_COLUMNS[number]) ? options.sortBy : 'name';
  const order = options?.order === 'desc' ? 'DESC' : 'ASC';
  const filterClauses: string[] = [];
  const params: Record<string, unknown> = { organizationId, offset: pagination.offset, limit: pagination.limit };

  if (options?.filters) {
    const searchTerm = options.filters['search'];
    if (searchTerm) {
      const escaped = String(searchTerm).replace(/[%_\\]/g, (c) => `\\${c}`);
      params['filter_search'] = `%${escaped}%`;
      filterClauses.push(`(name LIKE @filter_search ESCAPE '\\')`);
    }
    if (options.filters['isActive']) {
      params['filter_isActive'] = options.filters['isActive'] === 'true' ? 1 : 0;
      filterClauses.push(`isActive = @filter_isActive`);
    }
  }

  const whereExtra = filterClauses.length ? ` AND ${filterClauses.join(' AND ')}` : '';
  const countParams: Record<string, unknown> = { organizationId };
  if (params['filter_search'] != null) countParams['filter_search'] = params['filter_search'];
  if (params['filter_isActive'] != null) countParams['filter_isActive'] = params['filter_isActive'];

  const [rows, countRows] = await Promise.all([
    query<ExpenseCategory[]>(
      `SELECT id, organizationId, name, description, color, isActive, createdAt, updatedAt
       FROM ExpenseCategories
       WHERE organizationId = @organizationId${whereExtra}
       ORDER BY ${sortBy} ${order}
       OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
      { params }
    ),
    query<Array<{ total: number }>>(
      `SELECT COUNT(*) AS total FROM ExpenseCategories WHERE organizationId = @organizationId${whereExtra}`,
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

export async function getExpenseCategoryById(
  id: string,
  organizationId: string
): Promise<ExpenseCategory | null> {
  const rows = await query<ExpenseCategory[]>(
    `SELECT id, organizationId, name, description, color, isActive, createdAt, updatedAt
     FROM ExpenseCategories WHERE id = @id AND organizationId = @organizationId`,
    { params: { id, organizationId } }
  );
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

export async function createExpenseCategory(
  organizationId: string,
  input: CreateExpenseCategoryInput
): Promise<ExpenseCategory> {
  const id = uuid();
  const now = nowEastern();
  await query(
    `INSERT INTO ExpenseCategories (id, organizationId, name, description, color, isActive, createdAt, updatedAt)
     VALUES (@id, @organizationId, @name, @description, @color, @isActive, @createdAt, @updatedAt)`,
    {
      params: {
        id,
        organizationId,
        name: input.name,
        description: input.description ?? null,
        color: input.color ?? null,
        isActive: input.isActive !== false ? 1 : 0,
        createdAt: now,
        updatedAt: now,
      },
    }
  );
  const category = await getExpenseCategoryById(id, organizationId);
  if (!category) throw new Error('Failed to create expense category');
  return category;
}

export async function updateExpenseCategory(
  organizationId: string,
  input: UpdateExpenseCategoryInput
): Promise<ExpenseCategory | null> {
  const existing = await getExpenseCategoryById(input.id, organizationId);
  if (!existing) return null;

  const params: Record<string, unknown> = {
    id: input.id,
    organizationId,
    name: input.name ?? existing.name,
    description: input.description !== undefined ? input.description : existing.description,
    color: input.color !== undefined ? input.color : existing.color,
    isActive: input.isActive !== undefined ? (input.isActive ? 1 : 0) : (existing.isActive ? 1 : 0),
    updatedAt: nowEastern(),
  };

  await query(
    `UPDATE ExpenseCategories SET
       name = @name, description = @description, color = @color, isActive = @isActive, updatedAt = @updatedAt
     WHERE id = @id AND organizationId = @organizationId`,
    { params }
  );
  return getExpenseCategoryById(input.id, organizationId);
}

export async function deleteExpenseCategory(
  id: string,
  organizationId: string
): Promise<boolean> {
  const existing = await getExpenseCategoryById(id, organizationId);
  if (!existing) return false;
  await query(
    `DELETE FROM ExpenseCategories WHERE id = @id AND organizationId = @organizationId`,
    { params: { id, organizationId } }
  );
  return true;
}
