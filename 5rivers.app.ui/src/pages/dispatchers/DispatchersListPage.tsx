import { useState, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatchersList, useDeleteDispatcher } from '@/hooks/useDispatchers';
import { useInvoicesList } from '@/hooks/useInvoices';
import { useToast } from '@/context/toast';
import { getInitials, formatDate } from '@/lib/format';
import { InvoiceStatusBadge, Badge } from '@/components/ui/Badge';
import { ConfirmModal } from '@/components/ui/Modal';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { ColumnToggle } from '@/components/ui/ColumnToggle';
import { useColumnVisibility, type ColumnDef } from '@/hooks/useColumnVisibility';
import { ExportPdfButton } from '@/components/ui/ExportPdfButton';
import { pdfApi } from '@/api/endpoints';
import { cn } from '@/lib/cn';
import type { Dispatcher, Invoice, PaginationParams } from '@/types';

// ============================================
// Dispatchers List — with integrated receivables
// showing outstanding invoice counts per dispatcher
// ============================================

const COLUMN_DEFS: ColumnDef[] = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'commissionPercent', label: 'Commission' },
  { key: 'outstanding', label: 'Outstanding' },
  { key: 'actions', label: '', alwaysVisible: true },
];

function getAgingDays(dateStr: string): number {
  const cleaned = String(dateStr).slice(0, 10);
  const invoiceDate = new Date(cleaned + 'T00:00:00');
  const now = new Date();
  const diffMs = now.getTime() - invoiceDate.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

interface DispatcherReceivable {
  totalInvoices: number;
  outstanding: number;
  received: number;
}

export function DispatchersListPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  // View mode
  const [viewMode, setViewMode] = useState<'table' | 'receivables'>('table');

  // Column visibility
  const { visibleKeys, isVisible, toggleColumn, toggleableColumns } =
    useColumnVisibility('dispatchers', COLUMN_DEFS);

  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [sortBy, setSortBy] = useState('name');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [searchFilter, setSearchFilter] = useState('');

  const params = useMemo<PaginationParams>(() => {
    const p: PaginationParams = { page, limit, sortBy, order };
    if (searchFilter) p.filter_search = searchFilter;
    return p;
  }, [page, limit, sortBy, order, searchFilter]);

  const { data, isLoading } = useDispatchersList(params);

  // Fetch all invoices for receivables
  const { data: invoicesData } = useInvoicesList({ limit: 500, sortBy: 'invoiceDate', order: 'desc' });

  // Build dispatcher receivable map
  const { receivableMap, dispatcherGroups } = useMemo(() => {
    const invoices = invoicesData?.data ?? [];
    const relevant = invoices.filter((inv) => inv.status === 'RAISED' || inv.status === 'RECEIVED');

    const map = new Map<string, DispatcherReceivable>();
    const groupMap = new Map<string, Invoice[]>();

    for (const inv of relevant) {
      const key = inv.dispatcherId ?? '__none__';
      const existing = map.get(key) ?? { totalInvoices: 0, outstanding: 0, received: 0 };
      existing.totalInvoices++;
      if (inv.status === 'RAISED') existing.outstanding++;
      else existing.received++;
      map.set(key, existing);

      const group = groupMap.get(key) ?? [];
      group.push(inv);
      groupMap.set(key, group);
    }

    return { receivableMap: map, dispatcherGroups: groupMap };
  }, [invoicesData]);

  // Expanded dispatcher in receivables view
  const [expandedDispatcher, setExpandedDispatcher] = useState<string | null>(null);

  // Delete
  const deleteDispatcher = useDeleteDispatcher();
  const [deleteTarget, setDeleteTarget] = useState<Dispatcher | null>(null);

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteDispatcher.mutate(deleteTarget.id, {
      onSuccess: () => {
        addToast('Dispatcher deleted successfully', 'success');
        setDeleteTarget(null);
      },
      onError: (err) => addToast(err.message, 'error'),
    });
  }, [deleteTarget, deleteDispatcher, addToast]);

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

  const columns: Column<Dispatcher>[] = useMemo(
    () => [
      {
        key: 'name',
        label: 'Name',
        sortable: true,
        render: (d) => (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-sm text-indigo-700">
              {getInitials(d.name)}
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">{d.name}</div>
              {d.description && (
                <div className="text-xs text-slate-500 truncate max-w-[200px]">
                  {d.description}
                </div>
              )}
            </div>
          </div>
        ),
      },
      {
        key: 'email',
        label: 'Email',
        sortable: true,
        render: (d) => (
          <span className="text-sm text-slate-600">{d.email ?? '—'}</span>
        ),
      },
      {
        key: 'phone',
        label: 'Phone',
        render: (d) => (
          <span className="text-sm text-slate-600">{d.phone ?? '—'}</span>
        ),
      },
      {
        key: 'commissionPercent',
        label: 'Commission',
        sortable: true,
        align: 'right' as const,
        render: (d) => (
          <span className="inline-flex items-center px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-100">
            {d.commissionPercent}%
          </span>
        ),
      },
      {
        key: 'outstanding',
        label: 'Outstanding',
        align: 'center' as const,
        render: (d) => {
          const recv = receivableMap.get(d.id);
          if (!recv || recv.outstanding === 0) return <span className="text-sm text-slate-400">—</span>;
          return (
            <span className="inline-flex items-center px-2.5 py-0.5 bg-amber-50 text-amber-700 text-xs font-bold rounded-full border border-amber-100">
              {recv.outstanding} invoice{recv.outstanding !== 1 ? 's' : ''}
            </span>
          );
        },
      },
      {
        key: 'actions',
        label: '',
        align: 'center' as const,
        render: (d) => (
          <div
            className="flex items-center justify-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <Link
              to={`/dispatchers/${d.id}/edit`}
              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
            >
              <span className="material-symbols-outlined text-lg">edit</span>
            </Link>
            <button
              onClick={() => setDeleteTarget(d)}
              className="p-1.5 text-slate-400 hover:text-error hover:bg-error-container/20 rounded transition-all"
            >
              <span className="material-symbols-outlined text-lg">delete</span>
            </button>
          </div>
        ),
      },
    ],
    [receivableMap],
  );

  // For receivables view, build sorted list
  const receivableDispatchers = useMemo(() => {
    const dispatchers = data?.data ?? [];
    return dispatchers
      .map((d) => ({
        ...d,
        receivable: receivableMap.get(d.id) ?? { totalInvoices: 0, outstanding: 0, received: 0 },
        invoices: dispatcherGroups.get(d.id) ?? [],
      }))
      .filter((d) => d.receivable.totalInvoices > 0)
      .sort((a, b) => b.receivable.outstanding - a.receivable.outstanding);
  }, [data, receivableMap, dispatcherGroups]);

  return (
    <div>
      {/* Page header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-1 block">
            Dispatch Network
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-on-surface">
            Dispatchers
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex items-center p-1 bg-surface-container-low rounded-lg">
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                'px-4 py-1.5 text-[10px] uppercase font-bold tracking-widest rounded-md transition-all',
                viewMode === 'table'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-slate-500 hover:text-slate-700',
              )}
            >
              Directory
            </button>
            <button
              onClick={() => setViewMode('receivables')}
              className={cn(
                'px-4 py-1.5 text-[10px] uppercase font-bold tracking-widest rounded-md transition-all',
                viewMode === 'receivables'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-slate-500 hover:text-slate-700',
              )}
            >
              Receivables
            </button>
          </div>
          <Link
            to="/dispatchers/new"
            className="gradient-primary text-white px-6 py-2.5 rounded-lg font-semibold text-sm shadow-md active:scale-[0.98] transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Dispatcher
          </Link>
        </div>
      </header>

      {viewMode === 'table' ? (
        <>
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
                placeholder="Search by name, email, phone..."
              />
            </div>

            <ColumnToggle
              columns={toggleableColumns}
              isVisible={isVisible}
              onToggle={toggleColumn}
            />

            <ExportPdfButton onExport={() => pdfApi.exportDispatchers(params)} />

            {searchFilter && (
              <button
                onClick={() => {
                  setSearchFilter('');
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
            emptyIcon="support_agent"
            emptyTitle="No dispatchers found"
            emptyDescription="Add your first dispatcher to start assigning jobs."
            onSort={handleSort}
            onPageChange={setPage}
            onRowClick={(dispatcher) =>
              navigate(`/dispatchers/${dispatcher.id}/edit`)
            }
            rowKey={(dispatcher) => dispatcher.id}
          />
        </>
      ) : (
        <>
          {/* Receivables view — dispatcher groups with expandable invoice tables */}
          <section className="space-y-4">
            {receivableDispatchers.length === 0 && (
              <div className="bg-surface-container-lowest rounded-xl ghost-border p-12 text-center">
                <span className="material-symbols-outlined text-5xl text-slate-300 mb-3 block">account_balance</span>
                <p className="text-lg font-semibold text-slate-400">No receivables data</p>
                <p className="text-sm text-slate-400 mt-1">Receivables will appear once invoices are raised.</p>
              </div>
            )}

            {receivableDispatchers.map((group) => {
              const isExpanded = expandedDispatcher === group.id;

              return (
                <div
                  key={group.id}
                  className="bg-surface-container-lowest rounded-xl ghost-border overflow-hidden"
                >
                  {/* Dispatcher header */}
                  <button
                    onClick={() => setExpandedDispatcher(isExpanded ? null : group.id)}
                    className="w-full px-6 py-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center">
                        <span className="material-symbols-outlined text-indigo-600 text-xl">support_agent</span>
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-on-surface">{group.name}</p>
                        <p className="text-xs text-slate-500">
                          {group.receivable.totalInvoices} invoice{group.receivable.totalInvoices !== 1 ? 's' : ''} &middot; {group.commissionPercent}% commission
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-8">
                      <div className="text-right hidden sm:block">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total</p>
                        <p className="text-sm font-bold text-on-surface">{group.receivable.totalInvoices}</p>
                      </div>
                      <div className="text-right hidden sm:block">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Received</p>
                        <p className="text-sm font-bold text-emerald-600">{group.receivable.received}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Outstanding</p>
                        <p
                          className={cn(
                            'text-sm font-bold',
                            group.receivable.outstanding > 0 ? 'text-red-600' : 'text-emerald-600',
                          )}
                        >
                          {group.receivable.outstanding}
                        </p>
                      </div>
                      <span
                        className={cn(
                          'material-symbols-outlined text-slate-400 transition-transform duration-200',
                          isExpanded && 'rotate-180',
                        )}
                      >
                        expand_more
                      </span>
                    </div>
                  </button>

                  {/* Invoice table */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-slate-50/50">
                            <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                              Invoice #
                            </th>
                            <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                              Date
                            </th>
                            <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                              Status
                            </th>
                            <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                              Billed To
                            </th>
                            <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">
                              Aging
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {group.invoices.map((inv) => {
                            const agingDays = getAgingDays(inv.invoiceDate);
                            return (
                              <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4">
                                  <Link
                                    to={`/invoices/${inv.id}/edit`}
                                    className="text-sm font-bold text-blue-600 hover:underline"
                                  >
                                    {inv.invoiceNumber}
                                  </Link>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-600">
                                  {formatDate(inv.invoiceDate)}
                                </td>
                                <td className="px-6 py-4">
                                  <InvoiceStatusBadge status={inv.status} />
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-600">
                                  {inv.billedTo ?? '—'}
                                </td>
                                <td className="px-6 py-4 text-right">
                                  {inv.status === 'RAISED' ? (
                                    <Badge variant={agingDays > 60 ? 'red' : agingDays > 30 ? 'yellow' : 'green'}>
                                      {agingDays}d
                                    </Badge>
                                  ) : (
                                    <span className="text-xs text-slate-400">—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        </>
      )}

      {/* Delete confirmation */}
      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Dispatcher"
        message={`Are you sure you want to delete ${deleteTarget?.name}? This action cannot be undone.`}
        isLoading={deleteDispatcher.isPending}
      />
    </div>
  );
}
