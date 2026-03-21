import type { ReactNode } from 'react';
import { Spinner } from './Spinner';
import { EmptyState } from './EmptyState';

// ============================================
// DataTable — reusable sortable/paginated table
// ============================================

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  render: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  sortBy?: string;
  order?: 'asc' | 'desc';
  isLoading?: boolean;
  emptyIcon?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  visibleKeys?: Set<string>;
  onSort?: (column: string) => void;
  onPageChange?: (page: number) => void;
  onRowClick?: (row: T) => void;
  rowKey: (row: T) => string;
}

export function DataTable<T>({
  columns: allColumns,
  data,
  total,
  page,
  limit,
  totalPages,
  sortBy,
  order,
  isLoading = false,
  emptyIcon,
  emptyTitle = 'No data found',
  emptyDescription,
  visibleKeys,
  onSort,
  onPageChange,
  onRowClick,
  rowKey,
}: DataTableProps<T>) {
  const columns = visibleKeys ? allColumns.filter((c) => visibleKeys.has(c.key)) : allColumns;
  if (isLoading) {
    return (
      <div className="bg-surface-container-lowest rounded-xl ghost-border overflow-hidden">
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-surface-container-lowest rounded-xl ghost-border overflow-hidden">
        <EmptyState
          icon={emptyIcon}
          title={emptyTitle}
          description={emptyDescription}
        />
      </div>
    );
  }

  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div className="bg-surface-container-lowest rounded-xl ghost-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 ${
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''
                  } ${col.sortable ? 'cursor-pointer select-none hover:text-slate-700' : ''}`}
                  onClick={() => col.sortable && onSort?.(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortable && sortBy === col.key && (
                      <span className="material-symbols-outlined text-xs text-primary">
                        {order === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {data.map((row) => (
              <tr
                key={rowKey(row)}
                className={`hover:bg-slate-50/50 transition-colors ${
                  onRowClick ? 'cursor-pointer' : ''
                }`}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-6 py-4 ${
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''
                    }`}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <footer className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="text-xs text-slate-500">
          Showing <span className="font-semibold text-on-surface">{start}-{end}</span>{' '}
          of <span className="font-semibold text-on-surface">{total}</span>
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange?.(page - 1)}
            disabled={page <= 1}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors disabled:opacity-30"
          >
            <span className="material-symbols-outlined text-lg">chevron_left</span>
          </button>
          {generatePageNumbers(page, totalPages).map((p, i) =>
            p === '...' ? (
              <span key={`ellipsis-${i}`} className="px-2 text-slate-400 text-xs">
                ...
              </span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange?.(p as number)}
                className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
                  p === page
                    ? 'bg-primary text-white'
                    : 'hover:bg-slate-100 text-slate-600'
                }`}
              >
                {p}
              </button>
            ),
          )}
          <button
            onClick={() => onPageChange?.(page + 1)}
            disabled={page >= totalPages}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors disabled:opacity-30"
          >
            <span className="material-symbols-outlined text-lg">chevron_right</span>
          </button>
        </div>
      </footer>
    </div>
  );
}

function generatePageNumbers(
  current: number,
  total: number,
): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '...')[] = [1];
  if (current > 3) pages.push('...');
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push('...');
  pages.push(total);
  return pages;
}
