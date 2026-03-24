import { useState, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useJobs, useDeleteJob, useUpdateJob } from '@/hooks/useJobs';
import { useLookupMaps, useJobTypes, useDrivers, useDispatchers } from '@/hooks/useLookups';
import { useColumnVisibility, type ColumnDef } from '@/hooks/useColumnVisibility';
import { useToast } from '@/context/toast';
import { formatCurrency, formatDate, formatTime, getInitials } from '@/lib/format';
import { SourceTypeBadge } from '@/components/ui/Badge';
import { ConfirmModal } from '@/components/ui/Modal';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { ColumnToggle } from '@/components/ui/ColumnToggle';
import { ExportPdfButton } from '@/components/ui/ExportPdfButton';
import { Select } from '@/components/ui/Select';
import { pdfApi } from '@/api/endpoints';
import type { Job, PaginationParams } from '@/types';

// ============================================
// Jobs List Page — filterable, sortable, paginated
// ============================================

const COLUMN_DEFS: ColumnDef[] = [
  { key: 'jobDate', label: 'Date' },
  { key: 'jobType', label: 'Job Type / Company' },
  { key: 'driver', label: 'Driver' },
  { key: 'dispatcher', label: 'Dispatcher' },
  { key: 'unit', label: 'Unit', defaultVisible: false },
  { key: 'sourceType', label: 'Source' },
  { key: 'amount', label: 'Amount' },
  { key: 'jobPaid', label: 'Received' },
  { key: 'driverPaid', label: 'Driver Paid' },
  { key: 'actions', label: '', alwaysVisible: true },
];

export function JobsListPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  // Filters & pagination state
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [sortBy, setSortBy] = useState('jobDate');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [sourceFilter, setSourceFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [driverFilter, setDriverFilter] = useState('');
  const [dispatcherFilter, setDispatcherFilter] = useState('');

  // Column visibility
  const { visibleKeys, isVisible, toggleColumn, toggleableColumns } =
    useColumnVisibility('jobs', COLUMN_DEFS);

  // Build query params
  const params = useMemo<PaginationParams>(() => {
    const p: PaginationParams = { page, limit, sortBy, order };
    if (sourceFilter) p.filter_sourceType = sourceFilter;
    if (dateFilter) p.filter_jobDate = dateFilter;
    if (searchFilter) p.filter_search = searchFilter;
    if (driverFilter) p.filter_driverId = driverFilter;
    if (dispatcherFilter) p.filter_dispatcherId = dispatcherFilter;
    return p;
  }, [page, limit, sortBy, order, sourceFilter, dateFilter, searchFilter, driverFilter, dispatcherFilter]);

  // Fetch data
  const { data, isLoading } = useJobs(params);
  const { companyMap, driverMap, dispatcherMap, unitMap } = useLookupMaps();
  const { data: jobTypesData } = useJobTypes();
  const { data: driversData } = useDrivers();
  const { data: dispatchersData } = useDispatchers();

  // Job type lookup map
  const jobTypeMap = useMemo(
    () =>
      new Map(
        jobTypesData?.data.map((jt) => [
          jt.id,
          { title: jt.title, companyId: jt.companyId, dispatchType: jt.dispatchType },
        ]) ?? [],
      ),
    [jobTypesData],
  );

  // Toggle paid statuses
  const updateJob = useUpdateJob();
  const toggleJobPaid = useCallback(
    (job: Job) => {
      updateJob.mutate(
        { id: job.id, data: { jobPaid: !job.jobPaid } },
        {
          onSuccess: () => addToast(job.jobPaid ? 'Payment marked as not received' : 'Payment marked as received', 'success'),
          onError: (err) => addToast(err.message, 'error'),
        },
      );
    },
    [updateJob, addToast],
  );
  const toggleDriverPaid = useCallback(
    (job: Job) => {
      updateJob.mutate(
        { id: job.id, data: { driverPaid: !job.driverPaid } },
        {
          onSuccess: () => addToast(job.driverPaid ? 'Driver marked as unpaid' : 'Driver marked as paid', 'success'),
          onError: (err) => addToast(err.message, 'error'),
        },
      );
    },
    [updateJob, addToast],
  );

  // Delete
  const deleteJob = useDeleteJob();
  const [deleteTarget, setDeleteTarget] = useState<Job | null>(null);

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteJob.mutate(deleteTarget.id, {
      onSuccess: () => {
        addToast('Job deleted successfully', 'success');
        setDeleteTarget(null);
      },
      onError: (err) => {
        addToast(err.message, 'error');
      },
    });
  }, [deleteTarget, deleteJob, addToast]);

  // Sort handler
  const handleSort = useCallback(
    (col: string) => {
      if (sortBy === col) {
        setOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortBy(col);
        setOrder('desc');
      }
      setPage(1);
    },
    [sortBy],
  );

  const hasActiveFilters = sourceFilter || dateFilter || searchFilter || driverFilter || dispatcherFilter;

  // Table columns
  const columns: Column<Job>[] = useMemo(
    () => [
      {
        key: 'jobDate',
        label: 'Date',
        sortable: true,
        render: (job) => (
          <div>
            <span className="text-[13px] font-semibold text-on-surface">
              {formatDate(job.jobDate)}
            </span>
            {(job.startTime || job.endTime) && (
              <span className="block text-[11px] text-slate-400 mt-0.5">
                {formatTime(job.startTime)}
                {job.endTime && ` – ${formatTime(job.endTime)}`}
              </span>
            )}
          </div>
        ),
      },
      {
        key: 'jobType',
        label: 'Job Type / Company',
        render: (job) => {
          const jt = jobTypeMap.get(job.jobTypeId);
          return (
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-medium text-blue-700">
                  {jt?.title ?? '—'}
                </span>
                {jt?.dispatchType && (
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                    jt.dispatchType === 'hourly'
                      ? 'bg-blue-50 text-blue-600'
                      : jt.dispatchType === 'load'
                        ? 'bg-emerald-50 text-emerald-600'
                        : jt.dispatchType === 'tonnage'
                          ? 'bg-amber-50 text-amber-600'
                          : 'bg-slate-100 text-slate-500'
                  }`}>
                    {jt.dispatchType}
                  </span>
                )}
              </div>
              <span className="text-[12px] text-slate-500">
                {jt ? (companyMap.get(jt.companyId) ?? '') : ''}
              </span>
            </div>
          );
        },
      },
      {
        key: 'driver',
        label: 'Driver',
        render: (job) => {
          const name = driverMap.get(job.driverId ?? '');
          if (!name) return <span className="text-slate-400">—</span>;
          return (
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-blue-600">
                {getInitials(name)}
              </div>
              <span className="text-[13px] font-medium text-slate-700">{name}</span>
            </div>
          );
        },
      },
      {
        key: 'dispatcher',
        label: 'Dispatcher',
        render: (job) => (
          <span className="text-[13px] text-slate-700">
            {dispatcherMap.get(job.dispatcherId ?? '') ?? '—'}
          </span>
        ),
      },
      {
        key: 'unit',
        label: 'Unit',
        render: (job) => {
          const unit = unitMap.get(job.unitId ?? '');
          if (!unit) return <span className="text-slate-400">—</span>;
          return (
            <span className="bg-surface-container-high px-2 py-0.5 rounded text-[11px] font-mono font-medium text-slate-700">
              {unit}
            </span>
          );
        },
      },
      {
        key: 'sourceType',
        label: 'Source',
        sortable: true,
        render: (job) => <SourceTypeBadge sourceType={job.sourceType} />,
      },
      {
        key: 'amount',
        label: 'Amount',
        sortable: true,
        align: 'right' as const,
        render: (job) => (
          <span className="text-[13px] font-bold text-on-surface">
            {formatCurrency(job.amount)}
          </span>
        ),
      },
      {
        key: 'jobPaid',
        label: 'Received',
        align: 'center' as const,
        render: (job) => (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleJobPaid(job);
            }}
            disabled={updateJob.isPending}
            className={`p-1 rounded-lg transition-all ${
              job.jobPaid
                ? 'text-emerald-500 hover:bg-emerald-50 hover:text-emerald-700'
                : 'text-slate-300 hover:bg-slate-50 hover:text-slate-500'
            }`}
            title={job.jobPaid ? 'Mark payment as not received' : 'Mark payment as received'}
          >
            <span className={`material-symbols-outlined ${job.jobPaid ? 'filled' : ''}`}>
              {job.jobPaid ? 'check_circle' : 'radio_button_unchecked'}
            </span>
          </button>
        ),
      },
      {
        key: 'driverPaid',
        label: 'Driver Paid',
        align: 'center' as const,
        render: (job) => (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleDriverPaid(job);
            }}
            disabled={updateJob.isPending}
            className={`p-1 rounded-lg transition-all ${
              job.driverPaid
                ? 'text-blue-500 hover:bg-blue-50 hover:text-blue-700'
                : 'text-slate-300 hover:bg-slate-50 hover:text-slate-500'
            }`}
            title={job.driverPaid ? 'Mark driver as unpaid' : 'Mark driver as paid'}
          >
            <span className={`material-symbols-outlined ${job.driverPaid ? 'filled' : ''}`}>
              {job.driverPaid ? 'check_circle' : 'radio_button_unchecked'}
            </span>
          </button>
        ),
      },
      {
        key: 'actions',
        label: '',
        align: 'right' as const,
        render: (job) => (
          <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            <Link
              to={`/jobs/${job.id}/edit`}
              className="p-1.5 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">edit</span>
            </Link>
            <button
              onClick={() => setDeleteTarget(job)}
              className="p-1.5 hover:bg-error-container/20 text-slate-400 hover:text-error rounded transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">delete</span>
            </button>
          </div>
        ),
      },
    ],
    [jobTypeMap, companyMap, driverMap, dispatcherMap, unitMap, toggleJobPaid, toggleDriverPaid, updateJob.isPending],
  );

  return (
    <div>
      {/* Page header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-1 block">
            Logistics Operations
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-on-surface">
            Active Jobs
          </h1>
        </div>
        <div className="flex gap-3">
          <Link
            to="/jobs/new"
            className="gradient-primary text-white px-6 py-2.5 rounded-lg font-semibold text-sm shadow-md active:scale-[0.98] transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Job
          </Link>
        </div>
      </header>

      {/* Filters */}
      <section className="bg-surface-container-lowest rounded-xl shadow-sm ghost-border p-4 mb-6 flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[180px] relative">
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
            placeholder="Search jobs..."
          />
        </div>

        <input
          type="month"
          value={dateFilter}
          onChange={(e) => {
            setDateFilter(e.target.value);
            setPage(1);
          }}
          className="bg-surface-container-low border-none rounded-lg text-xs font-medium text-slate-600 px-3 py-2 focus:ring-1 focus:ring-primary ghost-border"
        />

        <Select
          variant="filter"
          value={sourceFilter}
          onChange={(e) => {
            setSourceFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Sources</option>
          <option value="DISPATCHED">Dispatched</option>
          <option value="DIRECT">Direct</option>
        </Select>

        <Select
          variant="filter"
          value={driverFilter}
          onChange={(e) => {
            setDriverFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Drivers</option>
          {(driversData?.data ?? []).map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </Select>

        <Select
          variant="filter"
          value={dispatcherFilter}
          onChange={(e) => {
            setDispatcherFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Dispatchers</option>
          {(dispatchersData?.data ?? []).map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </Select>

        <ColumnToggle
          columns={toggleableColumns}
          isVisible={isVisible}
          onToggle={toggleColumn}
        />

        <ExportPdfButton onExport={() => pdfApi.exportJobs(params)} />

        {hasActiveFilters && (
          <button
            onClick={() => {
              setSourceFilter('');
              setDateFilter('');
              setSearchFilter('');
              setDriverFilter('');
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
        emptyIcon="local_shipping"
        emptyTitle="No jobs found"
        emptyDescription="Create your first job to get started."
        onSort={handleSort}
        onPageChange={setPage}
        onRowClick={(job) => navigate(`/jobs/${job.id}/edit`)}
        rowKey={(job) => job.id}
      />

      {/* Delete confirmation */}
      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Job"
        message="Are you sure you want to delete this job? This action cannot be undone."
        isLoading={deleteJob.isPending}
      />
    </div>
  );
}
