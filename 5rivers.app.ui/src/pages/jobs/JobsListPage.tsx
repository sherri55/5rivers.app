import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useJobs, useDeleteJob, useUpdateJob } from '@/hooks/useJobs';
import { useLookupMaps, useJobTypes, useDrivers, useDispatchers } from '@/hooks/useLookups';
import { useColumnVisibility, type ColumnDef } from '@/hooks/useColumnVisibility';
import { useToast } from '@/context/toast';
import { formatCurrency, formatDate, formatTime, getInitials, parseTimeMinutesET } from '@/lib/format';
import { SourceTypeBadge } from '@/components/ui/Badge';
import { ConfirmModal } from '@/components/ui/Modal';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { ColumnToggle } from '@/components/ui/ColumnToggle';
import { ExportPdfButton } from '@/components/ui/ExportPdfButton';
import { Select } from '@/components/ui/Select';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { pdfApi } from '@/api/endpoints';
import type { Job, PaginationParams } from '@/types';

// ============================================
// Jobs List Page — filterable, sortable, paginated
// ============================================

/** Parse time → total minutes from midnight in Eastern time. */
const parseTimeMinutes = parseTimeMinutesET;

const COLUMN_DEFS: ColumnDef[] = [
  { key: 'select', label: '', alwaysVisible: true },
  { key: 'jobDate', label: 'Date' },
  { key: 'jobType', label: 'Job Type / Company' },
  { key: 'driver', label: 'Driver' },
  { key: 'dispatcher', label: 'Dispatcher' },
  { key: 'unit', label: 'Unit', defaultVisible: false },
  { key: 'sourceType', label: 'Source' },
  { key: 'details', label: 'Details' },
  { key: 'amount', label: 'Amount' },
  { key: 'jobPaid', label: 'Received' },
  { key: 'driverPaid', label: 'Driver Paid' },
  { key: 'actions', label: '', alwaysVisible: true },
];

export function JobsListPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Multi-select — persisted in sessionStorage so back-navigation restores it.
  // selectedJobData stores per-job metadata needed for banner totals across pages.
  const SELECTION_KEY = 'jobs-selection';
  const SELECTION_DATA_KEY = 'jobs-selection-data';

  type SelJobData = { amount: number | null; dispatcherId: string | null };

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    try {
      const stored = sessionStorage.getItem(SELECTION_KEY);
      return stored ? new Set<string>(JSON.parse(stored)) : new Set<string>();
    } catch { return new Set<string>(); }
  });

  const [selectedJobData, setSelectedJobData] = useState<Map<string, SelJobData>>(() => {
    try {
      const stored = sessionStorage.getItem(SELECTION_DATA_KEY);
      return stored ? new Map<string, SelJobData>(JSON.parse(stored)) : new Map();
    } catch { return new Map(); }
  });

  // Sync selection to sessionStorage
  useEffect(() => {
    if (selectedIds.size > 0) {
      sessionStorage.setItem(SELECTION_KEY, JSON.stringify([...selectedIds]));
      sessionStorage.setItem(SELECTION_DATA_KEY, JSON.stringify([...selectedJobData]));
    } else {
      sessionStorage.removeItem(SELECTION_KEY);
      sessionStorage.removeItem(SELECTION_DATA_KEY);
    }
  }, [selectedIds, selectedJobData]);

  // Clear selection only when filter/sort params change (not on page change or back-navigation)
  const filterKey = [
    searchParams.get('search'), searchParams.get('dateFrom'), searchParams.get('dateTo'),
    searchParams.get('source'), searchParams.get('driver'), searchParams.get('dispatcher'),
    searchParams.get('jobPaid'), searchParams.get('driverPaid'),
    searchParams.get('sortBy'), searchParams.get('order'),
  ].join('|');
  const prevFilterKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (prevFilterKeyRef.current !== null && prevFilterKeyRef.current !== filterKey) {
      setSelectedIds(new Set());
      setSelectedJobData(new Map());
    }
    prevFilterKeyRef.current = filterKey;
  }, [filterKey]);

  const toggleSelect = useCallback((id: string, e: React.MouseEvent, job: Job) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setSelectedJobData((prev) => {
      const next = new Map(prev);
      if (next.has(id)) next.delete(id);
      else next.set(id, { amount: job.amount, dispatcherId: job.dispatcherId });
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback((jobs: Job[]) => {
    setSelectedIds((prev) => {
      const allSelected = jobs.every((j) => prev.has(j.id));
      if (allSelected) {
        // Deselect current page only — keep other pages' selections
        const next = new Set(prev);
        jobs.forEach((j) => next.delete(j.id));
        return next;
      }
      const next = new Set(prev);
      jobs.forEach((j) => next.add(j.id));
      return next;
    });
    setSelectedJobData((prev) => {
      const allSelected = jobs.every((j) => prev.has(j.id));
      const next = new Map(prev);
      if (allSelected) jobs.forEach((j) => next.delete(j.id));
      else jobs.forEach((j) => next.set(j.id, { amount: j.amount, dispatcherId: j.dispatcherId }));
      return next;
    });
  }, []);

  // Filters & pagination — stored in URL so Back button restores them
  const page           = Number(searchParams.get('page') ?? '1');
  const [limit]        = useState(20);
  const sortBy         = searchParams.get('sortBy')      ?? 'jobDate';
  const order          = (searchParams.get('order')      ?? 'desc') as 'asc' | 'desc';
  const sourceFilter     = searchParams.get('source')      ?? '';
  const dateFrom         = searchParams.get('dateFrom')    ?? '';
  const dateTo           = searchParams.get('dateTo')      ?? '';
  const searchFilter     = searchParams.get('search')      ?? '';
  const driverFilter     = searchParams.get('driver')      ?? '';
  const dispatcherFilter = searchParams.get('dispatcher')  ?? '';
  const jobPaidFilter    = searchParams.get('jobPaid')     ?? '';
  const driverPaidFilter = searchParams.get('driverPaid')  ?? '';

  const setParam = useCallback((key: string, value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value); else next.delete(key);
      next.delete('page'); // reset to page 1 on filter change
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const setPage = useCallback((p: number) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (p > 1) next.set('page', String(p)); else next.delete('page');
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  // Column visibility
  const { visibleKeys, isVisible, toggleColumn, toggleableColumns } =
    useColumnVisibility('jobs', COLUMN_DEFS);

  // Build query params
  const params = useMemo<PaginationParams>(() => {
    const p: PaginationParams = { page, limit, sortBy, order };
    if (sourceFilter)     p.filter_sourceType  = sourceFilter;
    if (dateFrom)         p.filter_dateFrom    = dateFrom;
    if (dateTo)           p.filter_dateTo      = dateTo;
    if (searchFilter)     p.filter_search      = searchFilter;
    if (driverFilter)     p.filter_driverId    = driverFilter;
    if (dispatcherFilter) p.filter_dispatcherId = dispatcherFilter;
    if (jobPaidFilter)    p.filter_jobPaid     = jobPaidFilter;
    if (driverPaidFilter) p.filter_driverPaid  = driverPaidFilter;
    return p;
  }, [page, limit, sortBy, order, sourceFilter, dateFrom, dateTo, searchFilter, driverFilter, dispatcherFilter, jobPaidFilter, driverPaidFilter]);

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
          { title: jt.title, companyId: jt.companyId, dispatchType: jt.dispatchType, rateOfJob: jt.rateOfJob },
        ]) ?? [],
      ),
    [jobTypesData],
  );

  // Toggle paid statuses
  const updateJob = useUpdateJob();

  const markBatchJobPaid = useCallback(async (ids: string[]) => {
    try {
      await Promise.all(ids.map((id) => updateJob.mutateAsync({ id, data: { jobPaid: true } })));
      addToast(`${ids.length} job${ids.length !== 1 ? 's' : ''} marked as received`, 'success');
    } catch {
      addToast('Some updates failed', 'error');
    }
  }, [updateJob, addToast]);

  const markBatchDriverPaid = useCallback(async (ids: string[]) => {
    try {
      await Promise.all(ids.map((id) => updateJob.mutateAsync({ id, data: { driverPaid: true } })));
      addToast(`Driver marked as paid for ${ids.length} job${ids.length !== 1 ? 's' : ''}`, 'success');
    } catch {
      addToast('Some updates failed', 'error');
    }
  }, [updateJob, addToast]);
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
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (sortBy === col) {
          next.set('order', order === 'asc' ? 'desc' : 'asc');
        } else {
          next.set('sortBy', col);
          next.set('order', 'desc');
        }
        next.delete('page');
        return next;
      }, { replace: true });
    },
    [sortBy, order, setSearchParams],
  );

  const hasActiveFilters = sourceFilter || dateFrom || dateTo || searchFilter || driverFilter || dispatcherFilter || jobPaidFilter || driverPaidFilter;

  // Table columns
  const columns: Column<Job>[] = useMemo(
    () => {
    const pageJobs = data?.data ?? [];
    const allPageSelected = pageJobs.length > 0 && pageJobs.every((j) => selectedIds.has(j.id));
    const somePageSelected = pageJobs.some((j) => selectedIds.has(j.id));
    return [
      {
        key: 'select',
        label: '',
        renderHeader: () => (
          <input
            type="checkbox"
            readOnly
            checked={allPageSelected}
            ref={(el) => { if (el) el.indeterminate = somePageSelected && !allPageSelected; }}
            onClick={(e) => { e.stopPropagation(); toggleSelectAll(pageJobs); }}
            onChange={() => {}}
            className="w-3.5 h-3.5 rounded accent-primary cursor-pointer"
          />
        ),
        render: (job) => (
          <div
            className="-mx-6 -my-4 px-6 py-4 flex items-center cursor-pointer"
            onClick={(e) => toggleSelect(job.id, e, job)}
          >
            <input
              type="checkbox"
              checked={selectedIds.has(job.id)}
              onChange={() => {}}
              className="w-4 h-4 rounded accent-primary pointer-events-none"
            />
          </div>
        ),
      },
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
          const title = job.jobTypeTitle ?? jt?.title;
          const company = job.companyName ?? (jt ? (companyMap.get(jt.companyId) ?? '') : '');
          const dispatchType = job.jobTypeDispatchType ?? jt?.dispatchType;
          const rateOfJob = jt?.rateOfJob;
          return (
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-medium text-blue-700">
                  {title ?? '—'}
                </span>
                {dispatchType && (
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                    dispatchType === 'hourly'
                      ? 'bg-blue-50 text-blue-600'
                      : dispatchType === 'load'
                        ? 'bg-emerald-50 text-emerald-600'
                        : dispatchType === 'tonnage'
                          ? 'bg-amber-50 text-amber-600'
                          : 'bg-slate-100 text-slate-500'
                  }`}>
                    {dispatchType}
                  </span>
                )}
              </div>
              <span className="text-[12px] text-slate-500">{company}</span>
              {rateOfJob != null && (
                <span className="text-[11px] text-slate-400">
                  {formatCurrency(rateOfJob)}
                </span>
              )}
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
        key: 'details',
        label: 'Details',
        render: (job) => {
          const dispType = (job.jobTypeDispatchType ?? jobTypeMap.get(job.jobTypeId)?.dispatchType ?? '').toLowerCase();
          const lines: { label: string; value: string }[] = [];

          if (dispType === 'hourly') {
            const start = parseTimeMinutes(job.startTime);
            const end   = parseTimeMinutes(job.endTime);
            if (start !== null && end !== null) {
              const mins = end - start;
              const h = Math.floor(mins / 60);
              const m = mins % 60;
              lines.push({ label: 'Hours', value: m > 0 ? `${h}h ${m}m` : `${h}h` });
            }
          } else if (dispType === 'load' || dispType === 'loads') {
            if (job.loads) lines.push({ label: 'Loads', value: String(job.loads) });
          }

          const parseJsonList = (raw: string | null): string[] => {
            if (!raw) return [];
            try { const p = JSON.parse(raw); return Array.isArray(p) ? p.map(String) : [raw]; }
            catch { return [raw]; }
          };

          const tons    = dispType === 'tonnage' ? parseJsonList(job.weight) : [];
          const tickets = parseJsonList(job.ticketIds);
          const tonsTotal = tons.reduce((s, v) => s + (parseFloat(v) || 0), 0);

          const hasDetails = lines.length > 0 || tons.length > 0 || tickets.length > 0;
          if (!hasDetails) return <span className="text-slate-300">—</span>;
          return (
            <div className="flex flex-col gap-0.5">
              {lines.map((l) => (
                <span key={l.label} className="text-[11px] text-slate-600 flex items-center gap-0.5">
                  {l.label === 'Hours' && <span className="material-symbols-outlined text-[13px] text-slate-400">schedule</span>}
                  {l.label === 'Loads' && <span className="material-symbols-outlined text-[13px] text-slate-400">local_shipping</span>}
                  {l.value}
                </span>
              ))}
              {tons.length > 0 && (
                <details className="text-[11px]" onClick={(e) => e.stopPropagation()}>
                  <summary className="cursor-pointer text-slate-400 hover:text-slate-600 list-none flex items-center gap-0.5 select-none">
                    <span className="material-symbols-outlined text-[13px]">weight</span>
                    {tonsTotal % 1 === 0 ? tonsTotal : tonsTotal.toFixed(2)} tons
                  </summary>
                  <div className="flex flex-col gap-0.5 pl-1 pt-0.5">
                    {tons.map((t, i) => (
                      <span key={i} className="text-slate-600">{t}</span>
                    ))}
                  </div>
                </details>
              )}
              {tickets.length > 0 && (
                <details className="text-[11px]" onClick={(e) => e.stopPropagation()}>
                  <summary className="cursor-pointer text-slate-400 hover:text-slate-600 list-none flex items-center gap-0.5 select-none">
                    <span className="material-symbols-outlined text-[13px]">confirmation_number</span>
                    {tickets.length} ticket{tickets.length !== 1 ? 's' : ''}
                  </summary>
                  <div className="flex flex-col gap-0.5 pl-1 pt-0.5">
                    {tickets.map((t) => (
                      <span key={t} className="text-slate-600">{t}</span>
                    ))}
                  </div>
                </details>
              )}
            </div>
          );
        },
      },
      {
        key: 'amount',
        label: 'Amount',
        sortable: true,
        align: 'right' as const,
        render: (job) => {
          if (job.amount == null) return <span className="text-slate-400">—</span>;
          const withTax = job.amount * 1.13;
          return (
            <div className="text-right">
              <span className="text-[13px] font-bold text-on-surface">{formatCurrency(withTax)}</span>
              <span className="block text-[11px] text-slate-400">{formatCurrency(job.amount)}</span>
            </div>
          );
        },
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
    ];
  },
    [jobTypeMap, companyMap, driverMap, dispatcherMap, unitMap, toggleJobPaid, toggleDriverPaid, updateJob.isPending, selectedIds, toggleSelect, data],
  );

  const dispatcherCommissionMap = useMemo(() =>
    new Map((dispatchersData?.data ?? []).map((d) => [d.id, d.commissionPercent ?? 0])),
    [dispatchersData],
  );

  const selSubtotal = [...selectedJobData.values()].reduce((sum, j) => sum + (j.amount ?? 0), 0);
  const selHst = selSubtotal * 0.13;
  const selTotal = selSubtotal + selHst;
  const selCommission = [...selectedJobData.values()].reduce((sum, j) => {
    if (!j.dispatcherId) return sum;
    const pct = dispatcherCommissionMap.get(j.dispatcherId) ?? 0;
    return sum + (j.amount ?? 0) * (pct / 100);
  }, 0);

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
            onChange={(e) => setParam('search', e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-surface-container-low border-none rounded-lg text-sm focus:ring-1 focus:ring-primary"
            placeholder="Search jobs..."
          />
        </div>

        <DateRangePicker
          from={dateFrom}
          to={dateTo}
          onChange={(f, t) => {
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev);
              f ? next.set('dateFrom', f) : next.delete('dateFrom');
              t ? next.set('dateTo', t) : next.delete('dateTo');
              next.delete('page');
              return next;
            }, { replace: true });
          }}
        />

        <Select
          variant="filter"
          value={sourceFilter}
          onChange={(e) => setParam('source', e.target.value)}
        >
          <option value="">All Sources</option>
          <option value="DISPATCHED">Dispatched</option>
          <option value="DIRECT">Direct</option>
        </Select>

        <Select
          variant="filter"
          value={driverFilter}
          onChange={(e) => setParam('driver', e.target.value)}
        >
          <option value="">All Drivers</option>
          {(driversData?.data ?? []).map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </Select>

        <Select
          variant="filter"
          value={dispatcherFilter}
          onChange={(e) => setParam('dispatcher', e.target.value)}
        >
          <option value="">All Dispatchers</option>
          {(dispatchersData?.data ?? []).map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </Select>

        <Select
          variant="filter"
          value={jobPaidFilter}
          onChange={(e) => setParam('jobPaid', e.target.value)}
        >
          <option value="">Job: All</option>
          <option value="true">Job: Received</option>
          <option value="false">Job: Pending</option>
        </Select>

        <Select
          variant="filter"
          value={driverPaidFilter}
          onChange={(e) => setParam('driverPaid', e.target.value)}
        >
          <option value="">Driver: All</option>
          <option value="true">Driver: Paid</option>
          <option value="false">Driver: Pending</option>
        </Select>

        <ColumnToggle
          columns={toggleableColumns}
          isVisible={isVisible}
          onToggle={toggleColumn}
        />

        <ExportPdfButton onExport={() => pdfApi.exportJobs(params)} />

        {hasActiveFilters && (
          <button
            onClick={() => setSearchParams({}, { replace: true })}
            className="text-xs font-medium text-slate-500 hover:text-slate-700 flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">close</span>
            Clear
          </button>
        )}
      </section>

      {/* Selection summary */}
      {selectedIds.size > 0 && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-500">checklist</span>
            <span className="text-sm font-semibold text-blue-700">{selectedIds.size} job{selectedIds.size !== 1 ? 's' : ''} selected</span>
          </div>
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <span className="text-slate-500 text-xs uppercase tracking-wide block">Subtotal</span>
              <span className="font-semibold text-on-surface">{formatCurrency(selSubtotal)}</span>
            </div>
            <div>
              <span className="text-slate-500 text-xs uppercase tracking-wide block">HST (13%)</span>
              <span className="font-semibold text-on-surface">{formatCurrency(selHst)}</span>
            </div>
            <div>
              <span className="text-slate-500 text-xs uppercase tracking-wide block">Total</span>
              <span className="text-lg font-bold text-blue-700">{formatCurrency(selTotal)}</span>
            </div>
            {selCommission > 0 && (
              <div>
                <span className="text-slate-500 text-xs uppercase tracking-wide block">Est. Commission</span>
                <span className="font-semibold text-amber-700">{formatCurrency(selCommission)}</span>
              </div>
            )}
            {selCommission > 0 && (
              <div>
                <span className="text-slate-500 text-xs uppercase tracking-wide block">Net (after commission)</span>
                <span className="font-semibold text-emerald-700">{formatCurrency(selTotal - selCommission)}</span>
              </div>
            )}
          </div>
          <div className="flex gap-2 ml-auto">
            <button
              onClick={() => markBatchJobPaid([...selectedIds])}
              disabled={updateJob.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-[15px]">payments</span>
              Job Received
            </button>
            <button
              onClick={() => markBatchDriverPaid([...selectedIds])}
              disabled={updateJob.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-[15px]">person_check</span>
              Driver Paid
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 px-2"
            >
              <span className="material-symbols-outlined text-sm">close</span>
              Clear
            </button>
          </div>
        </div>
      )}

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
