import { useState, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCarriersList, useDeleteCarrier } from '@/hooks/useCarriers';
import { useToast } from '@/context/toast';
import { CarrierRateTypeBadge } from '@/components/ui/Badge';
import { ConfirmModal } from '@/components/ui/Modal';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { ColumnToggle } from '@/components/ui/ColumnToggle';
import { useColumnVisibility, type ColumnDef } from '@/hooks/useColumnVisibility';
import { ExportPdfButton } from '@/components/ui/ExportPdfButton';
import { pdfApi } from '@/api/endpoints';
import type { Carrier, PaginationParams } from '@/types';

// ============================================
// Carriers List — DataTable layout with rate
// type badges and contextual rate display
// ============================================

const COLUMN_DEFS: ColumnDef[] = [
  { key: 'name', label: 'Carrier' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'rateType', label: 'Rate Type' },
  { key: 'rate', label: 'Rate' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: '', alwaysVisible: true },
];

function formatRate(carrier: Carrier): string {
  switch (carrier.rateType) {
    case 'PERCENTAGE':
      return `${carrier.rate}%`;
    case 'HOURLY':
      return `$${carrier.rate}/hr`;
    case 'FLAT_PER_JOB':
    case 'FLAT_PER_LOAD':
    case 'FLAT_PER_TON':
      return `$${carrier.rate.toFixed(2)}`;
    default:
      return String(carrier.rate);
  }
}

export function CarriersListPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  // Filters & pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [sortBy, setSortBy] = useState('name');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [rateTypeFilter, setRateTypeFilter] = useState('');

  const params = useMemo<PaginationParams>(() => {
    const p: PaginationParams = { page, limit, sortBy, order };
    if (searchFilter) p.filter_search = searchFilter;
    if (statusFilter) p.filter_status = statusFilter;
    if (rateTypeFilter) p.filter_rateType = rateTypeFilter;
    return p;
  }, [page, limit, sortBy, order, searchFilter, statusFilter, rateTypeFilter]);

  const { data, isLoading } = useCarriersList(params);

  // Delete
  const deleteCarrier = useDeleteCarrier();
  const [deleteTarget, setDeleteTarget] = useState<Carrier | null>(null);

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteCarrier.mutate(deleteTarget.id, {
      onSuccess: () => {
        addToast('Carrier deleted successfully', 'success');
        setDeleteTarget(null);
      },
      onError: (err) => addToast(err.message, 'error'),
    });
  }, [deleteTarget, deleteCarrier, addToast]);

  const { visibleKeys, isVisible, toggleColumn, toggleableColumns } =
    useColumnVisibility('carriers', COLUMN_DEFS);

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

  const columns: Column<Carrier>[] = useMemo(
    () => [
      {
        key: 'name',
        label: 'Carrier',
        sortable: true,
        render: (c) => (
          <div>
            <div className="text-sm font-semibold text-slate-900">{c.name}</div>
            {c.contactPerson && (
              <div className="text-xs text-slate-500">{c.contactPerson}</div>
            )}
          </div>
        ),
      },
      {
        key: 'email',
        label: 'Email',
        render: (c) => (
          <span className="text-sm text-slate-600">{c.email ?? '—'}</span>
        ),
      },
      {
        key: 'phone',
        label: 'Phone',
        render: (c) => (
          <span className="text-sm text-slate-600">{c.phone ?? '—'}</span>
        ),
      },
      {
        key: 'rateType',
        label: 'Rate Type',
        sortable: true,
        render: (c) => <CarrierRateTypeBadge rateType={c.rateType} />,
      },
      {
        key: 'rate',
        label: 'Rate',
        sortable: true,
        align: 'right' as const,
        render: (c) => (
          <span className="text-sm font-mono text-slate-900">
            {formatRate(c)}
          </span>
        ),
      },
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        align: 'center' as const,
        render: (c) => (
          <div className="flex items-center justify-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                c.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'
              }`}
            />
            <span className="text-xs text-slate-600">
              {c.status === 'ACTIVE' ? 'Active' : 'Inactive'}
            </span>
          </div>
        ),
      },
      {
        key: 'actions',
        label: '',
        align: 'center' as const,
        render: (c) => (
          <div
            className="flex items-center justify-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <Link
              to={`/carriers/${c.id}/edit`}
              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
            >
              <span className="material-symbols-outlined text-lg">edit</span>
            </Link>
            <button
              onClick={() => setDeleteTarget(c)}
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

  const hasFilters = searchFilter || statusFilter || rateTypeFilter;

  return (
    <div>
      {/* Page header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-1 block">
            Partner Management
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-on-surface">
            Carriers
          </h1>
        </div>
        <Link
          to="/carriers/new"
          className="gradient-primary text-white px-6 py-2.5 rounded-lg font-semibold text-sm shadow-md active:scale-[0.98] transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          New Carrier
        </Link>
      </header>

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
            placeholder="Search carriers..."
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
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>

        <select
          value={rateTypeFilter}
          onChange={(e) => {
            setRateTypeFilter(e.target.value);
            setPage(1);
          }}
          className="appearance-none bg-surface-container-low border-none rounded-lg text-xs font-medium text-slate-600 pl-3 pr-10 py-2 focus:ring-1 focus:ring-primary cursor-pointer ghost-border"
        >
          <option value="">Rate Type: All</option>
          <option value="PERCENTAGE">Percentage</option>
          <option value="FLAT_PER_JOB">Flat / Job</option>
          <option value="FLAT_PER_LOAD">Flat / Load</option>
          <option value="FLAT_PER_TON">Flat / Ton</option>
          <option value="HOURLY">Hourly</option>
        </select>

        <ColumnToggle
          columns={toggleableColumns}
          isVisible={isVisible}
          onToggle={toggleColumn}
        />

        <ExportPdfButton onExport={() => pdfApi.exportCarriers(params)} />

        {hasFilters && (
          <button
            onClick={() => {
              setSearchFilter('');
              setStatusFilter('');
              setRateTypeFilter('');
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
        emptyIcon="local_shipping"
        emptyTitle="No carriers found"
        emptyDescription="Add your first carrier to get started."
        onSort={handleSort}
        onPageChange={setPage}
        onRowClick={(carrier) => navigate(`/carriers/${carrier.id}/edit`)}
        rowKey={(carrier) => carrier.id}
      />

      {/* Delete confirmation */}
      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Carrier"
        message={`Are you sure you want to delete ${deleteTarget?.name}? This action cannot be undone.`}
        isLoading={deleteCarrier.isPending}
      />
    </div>
  );
}
