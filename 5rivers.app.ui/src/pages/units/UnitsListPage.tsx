import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUnitsList, useDeleteUnit } from '@/hooks/useUnits';
import { useToast } from '@/context/toast';
import { formatDate } from '@/lib/format';
import { UnitStatusBadge } from '@/components/ui/Badge';
import { ConfirmModal } from '@/components/ui/Modal';
import { PageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ColumnToggle } from '@/components/ui/ColumnToggle';
import { useColumnVisibility, type ColumnDef } from '@/hooks/useColumnVisibility';
import { ExportPdfButton } from '@/components/ui/ExportPdfButton';
import { pdfApi } from '@/api/endpoints';
import type { Unit, PaginationParams, UnitStatus } from '@/types';

// ============================================
// Units List — card grid layout with status
// badges, vehicle info, and maintenance dates
// ============================================

const COLUMN_DEFS: ColumnDef[] = [
  { key: 'name', label: 'Name' },
  { key: 'status', label: 'Status' },
  { key: 'vehicle', label: 'Vehicle Info' },
  { key: 'plateNumber', label: 'Plate Number' },
  { key: 'vin', label: 'VIN' },
  { key: 'mileage', label: 'Mileage' },
  { key: 'insurance', label: 'Insurance' },
  { key: 'maintenance', label: 'Maintenance' },
  { key: 'actions', label: '', alwaysVisible: true },
];

const CARD_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-indigo-100 text-indigo-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-violet-100 text-violet-700',
  'bg-cyan-100 text-cyan-700',
];

function getCardColor(name: string) {
  const sum = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return CARD_COLORS[sum % CARD_COLORS.length];
}

export function UnitsListPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [page, setPage] = useState(1);
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const params = useMemo<PaginationParams>(() => {
    const p: PaginationParams = { page, limit: 20, sortBy: 'name', order: 'asc' };
    if (searchFilter) p.filter_search = searchFilter;
    if (statusFilter) p.filter_status = statusFilter;
    return p;
  }, [page, searchFilter, statusFilter]);

  const { data, isLoading } = useUnitsList(params);

  const { visibleKeys, isVisible, toggleColumn, toggleableColumns } =
    useColumnVisibility('units', COLUMN_DEFS);

  // Delete
  const deleteUnit = useDeleteUnit();
  const [deleteTarget, setDeleteTarget] = useState<Unit | null>(null);

  function handleDelete() {
    if (!deleteTarget) return;
    deleteUnit.mutate(deleteTarget.id, {
      onSuccess: () => {
        addToast('Unit deleted successfully', 'success');
        setDeleteTarget(null);
      },
      onError: (err) => addToast(err.message, 'error'),
    });
  }

  const totalPages = data?.totalPages ?? 1;

  return (
    <div>
      {/* Page header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-1 block">
            Fleet Management
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-on-surface">
            Units
          </h1>
        </div>
        <Link
          to="/units/new"
          className="gradient-primary text-white px-6 py-2.5 rounded-lg font-semibold text-sm shadow-md active:scale-[0.98] transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          New Unit
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
            placeholder="Search units..."
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
          <option value="MAINTENANCE">Maintenance</option>
          <option value="RETIRED">Retired</option>
        </select>

        <ColumnToggle
          columns={toggleableColumns}
          isVisible={isVisible}
          onToggle={toggleColumn}
        />

        <ExportPdfButton onExport={() => pdfApi.exportUnits(params)} />

        {(searchFilter || statusFilter) && (
          <button
            onClick={() => {
              setSearchFilter('');
              setStatusFilter('');
              setPage(1);
            }}
            className="text-xs font-medium text-slate-500 hover:text-slate-700 flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">close</span>
            Clear
          </button>
        )}
      </section>

      {/* Content */}
      {isLoading ? (
        <PageSpinner />
      ) : !data?.data.length ? (
        <EmptyState
          icon="local_shipping"
          title="No units found"
          description="Add your first unit to start managing your fleet."
        />
      ) : (
        <>
          {/* Card Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            {data.data.map((unit) => (
              <UnitCard
                key={unit.id}
                unit={unit}
                visibleKeys={visibleKeys}
                onClick={() => navigate(`/units/${unit.id}/edit`)}
                onDelete={() => setDeleteTarget(unit)}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-2">
              <span className="text-xs text-slate-500">
                Showing {data.data.length} of {data.total} units
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .slice(0, 5)
                  .map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 rounded text-xs font-bold ${
                        p === page
                          ? 'bg-primary text-on-primary'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                >
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Delete confirmation */}
      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Unit"
        message={`Are you sure you want to delete ${deleteTarget?.name}? This action cannot be undone.`}
        isLoading={deleteUnit.isPending}
      />
    </div>
  );
}

// --- Unit Card ---

function UnitCard({
  unit,
  visibleKeys,
  onClick,
  onDelete,
}: {
  unit: Unit;
  visibleKeys: Set<string>;
  onClick: () => void;
  onDelete: () => void;
}) {
  const vehicleDesc = [unit.year, unit.make, unit.model].filter(Boolean).join(' ');

  return (
    <div
      onClick={onClick}
      className="bg-surface-container-lowest rounded-xl ghost-border p-6 cursor-pointer hover:shadow-lg hover:shadow-on-surface/5 transition-all group"
    >
      <div className="flex items-start gap-4 mb-4">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center ${getCardColor(unit.name)}`}
        >
          <span className="material-symbols-outlined text-xl">local_shipping</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-on-surface truncate group-hover:text-primary transition-colors">
              {unit.name}
            </h3>
            {visibleKeys.has('status') && <UnitStatusBadge status={unit.status} />}
          </div>
          {visibleKeys.has('vehicle') && vehicleDesc && (
            <p className="text-xs text-slate-500">{vehicleDesc}</p>
          )}
        </div>
      </div>

      <div className="space-y-2 text-sm text-slate-600">
        {visibleKeys.has('plateNumber') && unit.plateNumber && (
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-slate-400">
              confirmation_number
            </span>
            <span className="font-mono text-xs">{unit.plateNumber}</span>
          </div>
        )}
        {visibleKeys.has('vin') && unit.vin && (
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-slate-400">
              tag
            </span>
            <span className="font-mono text-[11px] truncate">{unit.vin}</span>
          </div>
        )}
        {visibleKeys.has('mileage') && unit.mileage != null && (
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-slate-400">
              speed
            </span>
            <span className="text-xs">{unit.mileage.toLocaleString()} mi</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
        <div className="flex flex-col gap-1 text-[11px] text-slate-500">
          {visibleKeys.has('insurance') && unit.insuranceExpiry && (
            <span>
              <span className="font-semibold">Insurance:</span> {formatDate(unit.insuranceExpiry)}
            </span>
          )}
          {visibleKeys.has('maintenance') && unit.nextMaintenanceDate && (
            <span>
              <span className="font-semibold">Next Maint:</span> {formatDate(unit.nextMaintenanceDate)}
            </span>
          )}
        </div>
        <div
          className="flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <Link
            to={`/units/${unit.id}/edit`}
            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
          >
            <span className="material-symbols-outlined text-lg">edit</span>
          </Link>
          <button
            onClick={onDelete}
            className="p-1.5 text-slate-400 hover:text-error hover:bg-error-container/20 rounded transition-all"
          >
            <span className="material-symbols-outlined text-lg">delete</span>
          </button>
        </div>
      </div>
    </div>
  );
}
