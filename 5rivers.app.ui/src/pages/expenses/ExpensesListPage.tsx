import { useState, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useExpensesList, useDeleteExpense, useExpenseCategoriesList } from '@/hooks/useExpenses';
import { useToast } from '@/context/toast';
import { ConfirmModal } from '@/components/ui/Modal';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { ColumnToggle } from '@/components/ui/ColumnToggle';
import { useColumnVisibility, type ColumnDef } from '@/hooks/useColumnVisibility';
import { Select } from '@/components/ui/Select';
import { formatCurrency, formatDate } from '@/lib/format';
import type { Expense, PaginationParams } from '@/types';

// ============================================
// Expenses List — DataTable with filters
// ============================================

const COLUMN_DEFS: ColumnDef[] = [
  { key: 'expenseDate', label: 'Date' },
  { key: 'description', label: 'Description' },
  { key: 'category', label: 'Category' },
  { key: 'vendor', label: 'Vendor' },
  { key: 'amount', label: 'Amount' },
  { key: 'paymentMethod', label: 'Payment' },
  { key: 'recurring', label: 'Recurring' },
  { key: 'actions', label: '', alwaysVisible: true },
];

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Cash',
  CHECK: 'Check',
  BANK_TRANSFER: 'Bank Transfer',
  E_TRANSFER: 'e-Transfer',
  CREDIT_CARD: 'Credit Card',
  OTHER: 'Other',
};

const FREQUENCY_LABELS: Record<string, string> = {
  WEEKLY: 'Weekly',
  BIWEEKLY: 'Bi-weekly',
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  YEARLY: 'Yearly',
};

export function ExpensesListPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [sortBy, setSortBy] = useState('expenseDate');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');

  const categories = useExpenseCategoriesList({ limit: 100 });

  const params = useMemo<PaginationParams>(() => {
    const p: PaginationParams = { page, limit, sortBy, order };
    if (searchFilter) p.filter_search = searchFilter;
    if (categoryFilter) p.filter_categoryId = categoryFilter;
    if (paymentFilter) p.filter_paymentMethod = paymentFilter;
    return p;
  }, [page, limit, sortBy, order, searchFilter, categoryFilter, paymentFilter]);

  const { data, isLoading } = useExpensesList(params);

  const deleteExpense = useDeleteExpense();
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteExpense.mutate(deleteTarget.id, {
      onSuccess: () => {
        addToast('Expense deleted successfully', 'success');
        setDeleteTarget(null);
      },
      onError: (err) => addToast(err.message, 'error'),
    });
  }, [deleteTarget, deleteExpense, addToast]);

  const { visibleKeys, isVisible, toggleColumn, toggleableColumns } =
    useColumnVisibility('expenses', COLUMN_DEFS);

  const handleSort = useCallback(
    (col: string) => {
      if (sortBy === col) {
        setOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortBy(col);
        setOrder('asc');
      }
      setPage(1);
    },
    [sortBy],
  );

  // Calculate total of visible expenses
  const pageTotal = useMemo(() => {
    return (data?.data ?? []).reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [data?.data]);

  const columns: Column<Expense>[] = useMemo(
    () => [
      {
        key: 'expenseDate',
        label: 'Date',
        sortable: true,
        render: (e) => (
          <span className="text-sm font-medium text-slate-700 whitespace-nowrap">
            {formatDate(e.expenseDate)}
          </span>
        ),
      },
      {
        key: 'description',
        label: 'Description',
        sortable: true,
        render: (e) => (
          <div className="max-w-[250px]">
            <div className="text-sm font-semibold text-slate-900 truncate">{e.description}</div>
            {e.reference && (
              <div className="text-[11px] text-slate-400 truncate">Ref: {e.reference}</div>
            )}
          </div>
        ),
      },
      {
        key: 'category',
        label: 'Category',
        render: (e) =>
          e.categoryName ? (
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-slate-100 text-slate-700">
              {e.categoryColor && (
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: e.categoryColor }}
                />
              )}
              {e.categoryName}
            </span>
          ) : (
            <span className="text-xs text-slate-400">—</span>
          ),
      },
      {
        key: 'vendor',
        label: 'Vendor',
        sortable: true,
        render: (e) => (
          <span className="text-sm text-slate-600">{e.vendor ?? '—'}</span>
        ),
      },
      {
        key: 'amount',
        label: 'Amount',
        sortable: true,
        align: 'right' as const,
        render: (e) => (
          <span className="text-sm font-semibold text-red-600">
            {formatCurrency(e.amount)}
          </span>
        ),
      },
      {
        key: 'paymentMethod',
        label: 'Payment',
        sortable: true,
        render: (e) => (
          <span className="text-xs text-slate-600">
            {PAYMENT_LABELS[e.paymentMethod] ?? e.paymentMethod}
          </span>
        ),
      },
      {
        key: 'recurring',
        label: 'Recurring',
        align: 'center' as const,
        render: (e) =>
          e.recurring ? (
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold bg-violet-50 text-violet-700">
              <span className="material-symbols-outlined text-[12px]">repeat</span>
              {FREQUENCY_LABELS[e.recurringFrequency ?? ''] ?? ''}
            </span>
          ) : (
            <span className="text-xs text-slate-300">—</span>
          ),
      },
      {
        key: 'actions',
        label: '',
        align: 'center' as const,
        render: (e) => (
          <div
            className="flex items-center justify-center gap-2"
            onClick={(ev) => ev.stopPropagation()}
          >
            <Link
              to={`/expenses/${e.id}/edit`}
              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
            >
              <span className="material-symbols-outlined text-lg">edit</span>
            </Link>
            <button
              onClick={() => setDeleteTarget(e)}
              className="p-1.5 text-slate-400 hover:text-error hover:bg-error-container/20 rounded transition-all"
            >
              <span className="material-symbols-outlined text-lg">delete</span>
            </button>
          </div>
        ),
      },
    ],
    [],
  );

  const hasFilters = searchFilter || categoryFilter || paymentFilter;

  return (
    <div>
      {/* Page header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-1 block">
            Financial Management
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-on-surface">
            Expenses
          </h1>
        </div>
        <div className="flex gap-3">
          <Link
            to="/expenses/categories"
            className="bg-surface-container-low text-on-surface-variant px-5 py-2.5 rounded-lg font-medium text-sm border border-outline-variant/20 hover:bg-surface-container transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">category</span>
            Categories
          </Link>
          <Link
            to="/expenses/new"
            className="gradient-primary text-white px-6 py-2.5 rounded-lg font-semibold text-sm shadow-md active:scale-[0.98] transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Expense
          </Link>
        </div>
      </header>

      {/* Summary bar */}
      {data && data.total > 0 && (
        <div className="bg-red-50/50 border border-red-100 rounded-xl p-4 mb-6 flex flex-wrap items-center gap-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-red-400">Page Total</p>
            <p className="text-lg font-bold text-red-600">{formatCurrency(pageTotal)}</p>
          </div>
          <div className="h-8 w-px bg-red-200" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Records</p>
            <p className="text-lg font-bold text-slate-700">{data.total}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <section className="bg-surface-container-lowest rounded-xl shadow-sm ghost-border p-4 mb-6 flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[220px] relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
            search
          </span>
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => {
              setSearchFilter(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 bg-surface-container-low border-none rounded-lg text-sm focus:ring-1 focus:ring-primary"
            placeholder="Search expenses..."
          />
        </div>

        <Select
          variant="filter"
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Category: All</option>
          {(categories.data?.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>

        <Select
          variant="filter"
          value={paymentFilter}
          onChange={(e) => {
            setPaymentFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Payment: All</option>
          <option value="CASH">Cash</option>
          <option value="CHECK">Check</option>
          <option value="BANK_TRANSFER">Bank Transfer</option>
          <option value="E_TRANSFER">e-Transfer</option>
          <option value="CREDIT_CARD">Credit Card</option>
          <option value="OTHER">Other</option>
        </Select>

        <ColumnToggle
          columns={toggleableColumns}
          isVisible={isVisible}
          onToggle={toggleColumn}
        />

        {hasFilters && (
          <button
            onClick={() => {
              setSearchFilter('');
              setCategoryFilter('');
              setPaymentFilter('');
              setPage(1);
            }}
            className="text-xs font-medium text-slate-500 hover:text-slate-700 flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">close</span>
            Clear
          </button>
        )}
      </section>

      {/* Data table */}
      <DataTable
        columns={columns}
        data={data?.data ?? []}
        total={data?.total ?? 0}
        page={data?.page ?? 1}
        limit={data?.limit ?? limit}
        totalPages={data?.totalPages ?? 1}
        sortBy={sortBy}
        order={order}
        isLoading={isLoading}
        visibleKeys={visibleKeys}
        emptyIcon="receipt"
        emptyTitle="No expenses found"
        emptyDescription="Track your business expenses to see profit metrics."
        onSort={handleSort}
        onPageChange={setPage}
        onRowClick={(expense) => navigate(`/expenses/${expense.id}/edit`)}
        rowKey={(expense) => expense.id}
      />

      {/* Delete confirmation */}
      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Expense"
        message={`Are you sure you want to delete "${deleteTarget?.description}"? This action cannot be undone.`}
        isLoading={deleteExpense.isPending}
      />
    </div>
  );
}
