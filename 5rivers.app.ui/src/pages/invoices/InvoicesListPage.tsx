import { useState, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useInvoicesList, useDeleteInvoice } from '@/hooks/useInvoices';
import { useDispatchers } from '@/hooks/useLookups';
import { useColumnVisibility, type ColumnDef } from '@/hooks/useColumnVisibility';
import { useToast } from '@/context/toast';
import { formatDate } from '@/lib/format';
import { InvoiceStatusBadge, Badge } from '@/components/ui/Badge';
import { ConfirmModal } from '@/components/ui/Modal';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { ColumnToggle } from '@/components/ui/ColumnToggle';
import { ExportPdfButton } from '@/components/ui/ExportPdfButton';
import { pdfApi } from '@/api/endpoints';
import { cn } from '@/lib/cn';
import type { Invoice, PaginationParams } from '@/types';

// ============================================
// Invoices List — with integrated receivables
// summary cards and aging indicators
// ============================================

const COLUMN_DEFS: ColumnDef[] = [
  { key: 'invoiceNumber', label: 'Invoice #' },
  { key: 'invoiceDate', label: 'Date' },
  { key: 'status', label: 'Status' },
  { key: 'billedTo', label: 'Billed To' },
  { key: 'billedEmail', label: 'Billed Email', defaultVisible: false },
  { key: 'aging', label: 'Aging' },
  { key: 'actions', label: '', alwaysVisible: true },
];

function getAgingDays(dateStr: string): number {
  const cleaned = String(dateStr).slice(0, 10);
  const invoiceDate = new Date(cleaned + 'T00:00:00');
  const now = new Date();
  const diffMs = now.getTime() - invoiceDate.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

function AgingBadge({ days }: { days: number }) {
  const variant = days > 60 ? 'red' : days > 30 ? 'yellow' : 'green';
  return <Badge variant={variant}>{days}d</Badge>;
}

export function InvoicesListPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  // Filters & pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [sortBy, setSortBy] = useState('invoiceDate');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dispatcherFilter, setDispatcherFilter] = useState('');

  // Column visibility
  const { visibleKeys, isVisible, toggleColumn, toggleableColumns } =
    useColumnVisibility('invoices', COLUMN_DEFS);

  // Lookup data
  const { data: dispatchersData } = useDispatchers();

  const params = useMemo<PaginationParams>(() => {
    const p: PaginationParams = { page, limit, sortBy, order };
    if (searchFilter) p.filter_search = searchFilter;
    if (statusFilter) p.filter_status = statusFilter;
    if (dispatcherFilter) p.filter_dispatcherId = dispatcherFilter;
    return p;
  }, [page, limit, sortBy, order, searchFilter, statusFilter, dispatcherFilter]);

  const { data, isLoading } = useInvoicesList(params);

  // Also fetch all invoices for receivables summary (separate query without status filter)
  const { data: allData } = useInvoicesList({ limit: 500, sortBy: 'invoiceDate', order: 'desc' });

  // Receivables summary
  const receivables = useMemo(() => {
    const allInvoices = allData?.data ?? [];
    const raised = allInvoices.filter((inv) => inv.status === 'RAISED');
    const received = allInvoices.filter((inv) => inv.status === 'RECEIVED');
    const created = allInvoices.filter((inv) => inv.status === 'CREATED');
    return {
      total: raised.length + received.length,
      outstanding: raised.length,
      received: received.length,
      draft: created.length,
    };
  }, [allData]);

  // Delete
  const deleteInvoice = useDeleteInvoice();
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteInvoice.mutate(deleteTarget.id, {
      onSuccess: () => {
        addToast('Invoice deleted successfully', 'success');
        setDeleteTarget(null);
      },
      onError: (err) => addToast(err.message, 'error'),
    });
  }, [deleteTarget, deleteInvoice, addToast]);

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

  const columns: Column<Invoice>[] = useMemo(
    () => [
      {
        key: 'invoiceNumber',
        label: 'Invoice #',
        sortable: true,
        render: (inv) => (
          <span className="text-sm font-bold text-slate-900">
            {inv.invoiceNumber}
          </span>
        ),
      },
      {
        key: 'invoiceDate',
        label: 'Date',
        sortable: true,
        render: (inv) => (
          <span className="text-sm text-slate-600">
            {formatDate(inv.invoiceDate)}
          </span>
        ),
      },
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        render: (inv) => <InvoiceStatusBadge status={inv.status} />,
      },
      {
        key: 'billedTo',
        label: 'Billed To',
        render: (inv) => (
          <span className="text-sm text-slate-600">
            {inv.billedTo ?? '—'}
          </span>
        ),
      },
      {
        key: 'billedEmail',
        label: 'Billed Email',
        render: (inv) => (
          <span className="text-sm text-slate-600">
            {inv.billedEmail ?? '—'}
          </span>
        ),
      },
      {
        key: 'aging',
        label: 'Aging',
        align: 'center' as const,
        render: (inv) => {
          if (inv.status !== 'RAISED') return <span className="text-xs text-slate-400">—</span>;
          const days = getAgingDays(inv.invoiceDate);
          return <AgingBadge days={days} />;
        },
      },
      {
        key: 'actions',
        label: '',
        align: 'center' as const,
        render: (inv) => (
          <div
            className="flex items-center justify-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <Link
              to={`/invoices/${inv.id}/edit`}
              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
            >
              <span className="material-symbols-outlined text-lg">edit</span>
            </Link>
            <button
              onClick={() => setDeleteTarget(inv)}
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

  return (
    <div>
      {/* Page header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-1 block">
            Billing & Receivables
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-on-surface">
            Invoices
          </h1>
        </div>
        <Link
          to="/invoices/new"
          className="gradient-primary text-white px-6 py-2.5 rounded-lg font-semibold text-sm shadow-md active:scale-[0.98] transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          New Invoice
        </Link>
      </header>

      {/* Receivables summary cards */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-surface-container-lowest p-5 rounded-xl ghost-border">
          <div className="flex justify-between items-start mb-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Invoiced</span>
            <span className="material-symbols-outlined text-blue-500 text-lg">receipt_long</span>
          </div>
          <span className="text-2xl font-bold text-on-surface">{receivables.total}</span>
          <p className="text-[10px] text-slate-500 mt-0.5">Raised + Received</p>
        </div>
        <div className="bg-surface-container-lowest p-5 rounded-xl ghost-border">
          <div className="flex justify-between items-start mb-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Outstanding</span>
            <span className="material-symbols-outlined text-amber-500 text-lg">pending</span>
          </div>
          <span className={cn('text-2xl font-bold', receivables.outstanding > 0 ? 'text-red-600' : 'text-on-surface')}>
            {receivables.outstanding}
          </span>
          <p className="text-[10px] text-slate-500 mt-0.5">Awaiting payment</p>
        </div>
        <div className="bg-surface-container-lowest p-5 rounded-xl ghost-border">
          <div className="flex justify-between items-start mb-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Received</span>
            <span className="material-symbols-outlined text-emerald-500 text-lg">check_circle</span>
          </div>
          <span className="text-2xl font-bold text-emerald-600">{receivables.received}</span>
          <p className="text-[10px] text-slate-500 mt-0.5">Payment collected</p>
        </div>
        <div className="bg-surface-container-lowest p-5 rounded-xl ghost-border">
          <div className="flex justify-between items-start mb-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Drafts</span>
            <span className="material-symbols-outlined text-slate-400 text-lg">edit_note</span>
          </div>
          <span className="text-2xl font-bold text-slate-600">{receivables.draft}</span>
          <p className="text-[10px] text-slate-500 mt-0.5">Not yet raised</p>
        </div>
      </section>

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
            placeholder="Search invoices..."
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="appearance-none bg-surface-container-low border-none rounded-lg text-xs font-medium text-slate-600 pl-3 pr-10 py-2 focus:ring-1 focus:ring-primary cursor-pointer ghost-border"
        >
          <option value="">Status: All</option>
          <option value="CREATED">Created</option>
          <option value="RAISED">Raised</option>
          <option value="RECEIVED">Received</option>
        </select>

        <select
          value={dispatcherFilter}
          onChange={(e) => {
            setDispatcherFilter(e.target.value);
            setPage(1);
          }}
          className="appearance-none bg-surface-container-low border-none rounded-lg text-xs font-medium text-slate-600 pl-3 pr-10 py-2 focus:ring-1 focus:ring-primary cursor-pointer ghost-border"
        >
          <option value="">All Dispatchers</option>
          {(dispatchersData?.data ?? []).map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>

        <ColumnToggle
          columns={toggleableColumns}
          isVisible={isVisible}
          onToggle={toggleColumn}
        />

        <ExportPdfButton onExport={() => pdfApi.exportInvoices(params)} />

        {(searchFilter || statusFilter || dispatcherFilter) && (
          <button
            onClick={() => {
              setSearchFilter('');
              setStatusFilter('');
              setDispatcherFilter('');
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
        emptyIcon="receipt_long"
        emptyTitle="No invoices found"
        emptyDescription="Create your first invoice to get started."
        onSort={handleSort}
        onPageChange={setPage}
        onRowClick={(invoice) => navigate(`/invoices/${invoice.id}/edit`)}
        rowKey={(invoice) => invoice.id}
      />

      {/* Delete confirmation */}
      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Invoice"
        message={`Are you sure you want to delete invoice ${deleteTarget?.invoiceNumber}? This action cannot be undone.`}
        isLoading={deleteInvoice.isPending}
      />
    </div>
  );
}
