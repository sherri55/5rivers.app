/** Pagination input from query params. */
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

/** Normalized pagination (after applying defaults and max). */
export interface Pagination {
  page: number;
  limit: number;
  offset: number;
}

/** Sort order for list endpoints. */
export type SortOrder = 'asc' | 'desc';

/** Sort + filter options for list endpoints. */
export interface ListOptions {
  sortBy?: string;
  order?: SortOrder;
  filters?: Record<string, string>;
}

/** Parse sort + filter from request query. Use filter_name=... for filters. */
export function parseListOptions(query: Record<string, unknown>): { sortBy?: string; order?: SortOrder; filters: Record<string, string> } {
  const sortBy = typeof query.sortBy === 'string' ? query.sortBy.trim() : undefined;
  const order = query.order === 'asc' || query.order === 'desc' ? query.order : undefined;
  const filters: Record<string, string> = {};
  for (const [k, v] of Object.entries(query)) {
    if (k.startsWith('filter_') && typeof v === 'string' && v.trim()) filters[k.slice(7)] = v.trim();
  }
  return { sortBy, order, filters };
}

/** List response shape. */
export interface ListResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export function normalizePagination(params: PaginationParams): Pagination {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, params.limit ?? DEFAULT_PAGE_SIZE)
  );
  const offset = params.offset ?? (page - 1) * limit;
  return { page, limit, offset };
}
