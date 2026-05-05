import { useState, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDriversList, useDeleteDriver } from '@/hooks/useDrivers';
import { useDriverPaySummary, useCreateDriverPayment, useDeleteDriverPayment, useMarkJobsAsPaid } from '@/hooks/useDriverPay';
import { useToast } from '@/context/toast';
import { formatCurrency, formatDate, getInitials } from '@/lib/format';
import { PayTypeBadge } from '@/components/ui/Badge';
import { ConfirmModal, Modal } from '@/components/ui/Modal';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { ColumnToggle } from '@/components/ui/ColumnToggle';
import { useColumnVisibility, type ColumnDef } from '@/hooks/useColumnVisibility';
import { ExportPdfButton, type PdfColumnDef } from '@/components/ui/ExportPdfButton';
import { Select } from '@/components/ui/Select';
import { pdfApi } from '@/api/endpoints';
import { cn } from '@/lib/cn';
import type { Driver, PaginationParams, DriverPaySummary } from '@/types';

// ============================================
// Drivers List — with integrated driver pay
// ============================================

const DRIVERS_PDF_COLUMNS: PdfColumnDef[] = [
  { key: 'name',        label: 'Name' },
  { key: 'email',       label: 'Email' },
  { key: 'phone',       label: 'Phone' },
  { key: 'payType',     label: 'Pay Type' },
  { key: 'description', label: 'Description' },
];

const COLUMN_DEFS: ColumnDef[] = [
  { key: 'name', label: 'Driver' },
  { key: 'phone', label: 'Phone' },
  { key: 'payType', label: 'Pay Type' },
  { key: 'hourlyRate', label: 'Hourly Rate' },
  { key: 'percentageRate', label: 'Percentage' },
  { key: 'balance', label: 'Balance' },
  { key: 'actions', label: '', alwaysVisible: true },
];

type PaymentMethod = 'CASH' | 'CHECK' | 'BANK_TRANSFER' | 'E_TRANSFER' | 'OTHER';

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CHECK', label: 'Check' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'E_TRANSFER', label: 'E-Transfer' },
  { value: 'OTHER', label: 'Other' },
];

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-indigo-100 text-indigo-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-violet-100 text-violet-700',
];

function getAvatarColor(name: string) {
  const sum = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

export function DriversListPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  // View mode: table or pay
  const [viewMode, setViewMode] = useState<'table' | 'pay'>('table');

  // Column visibility
  const { visibleKeys, isVisible, toggleColumn, toggleableColumns } =
    useColumnVisibility('drivers', COLUMN_DEFS);

  // Filters & pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [sortBy, setSortBy] = useState('name');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [searchFilter, setSearchFilter] = useState('');
  const [payTypeFilter, setPayTypeFilter] = useState('');

  const params = useMemo<PaginationParams>(() => {
    const p: PaginationParams = { page, limit, sortBy, order };
    if (searchFilter) p.filter_search = searchFilter;
    if (payTypeFilter) p.filter_payType = payTypeFilter;
    return p;
  }, [page, limit, sortBy, order, searchFilter, payTypeFilter]);

  const { data, isLoading } = useDriversList(params);

  // Driver pay data
  const { data: payData, isLoading: payLoading } = useDriverPaySummary();
  const [expandedDriver, setExpandedDriver] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Record<string, 'jobs' | 'payments'>>({});
  const [paymentModal, setPaymentModal] = useState<{ driver: DriverPaySummary; selectedJobIds?: string[] } | null>(null);

  // Per-driver job selection: Map<driverId, Set<jobId>>
  const [jobSelection, setJobSelection] = useState<Map<string, Set<string>>>(new Map());

  const toggleJobSelection = useCallback((driverId: string, jobId: string) => {
    setJobSelection((prev) => {
      const next = new Map(prev);
      const sel = new Set(next.get(driverId) ?? []);
      sel.has(jobId) ? sel.delete(jobId) : sel.add(jobId);
      next.set(driverId, sel);
      return next;
    });
  }, []);

  const toggleSelectAllJobs = useCallback(
    (driverId: string, jobIds: string[]) => {
      setJobSelection((prev) => {
        const next = new Map(prev);
        const sel = next.get(driverId) ?? new Set();
        const unpaid = jobIds.filter((id) => {
          const driver = payData?.drivers.find((d) => d.driverId === driverId);
          const job = driver?.jobs.find((j) => j.jobId === id);
          return !job?.paidAt;
        });
        const allSelected = unpaid.every((id) => sel.has(id));
        const newSel = new Set(allSelected ? [] : unpaid);
        next.set(driverId, newSel);
        return next;
      });
    },
    [payData],
  );

  const clearDriverSelection = useCallback((driverId: string) => {
    setJobSelection((prev) => {
      const next = new Map(prev);
      next.set(driverId, new Set());
      return next;
    });
  }, []);

  // Pay summary map for table view
  const payMap = useMemo(() => {
    const m = new Map<string, DriverPaySummary>();
    for (const d of payData?.drivers ?? []) {
      m.set(d.driverId, d);
    }
    return m;
  }, [payData]);

  // Global pay totals
  const payTotals = useMemo(() => {
    const all = payData?.drivers ?? [];
    return {
      earned: all.reduce((s, d) => s + d.totalEarned, 0),
      paid: all.reduce((s, d) => s + d.totalPaid, 0),
      owed: all.reduce((s, d) => s + Math.max(0, d.balance), 0),
    };
  }, [payData]);

  // Delete
  const deleteDriver = useDeleteDriver();
  const [deleteTarget, setDeleteTarget] = useState<Driver | null>(null);

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteDriver.mutate(deleteTarget.id, {
      onSuccess: () => {
        addToast('Driver deleted successfully', 'success');
        setDeleteTarget(null);
      },
      onError: (err) => addToast(err.message, 'error'),
    });
  }, [deleteTarget, deleteDriver, addToast]);

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

  const columns: Column<Driver>[] = useMemo(
    () => [
      {
        key: 'name',
        label: 'Driver',
        sortable: true,
        render: (d) => (
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${getAvatarColor(d.name)}`}
            >
              {getInitials(d.name)}
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">{d.name}</div>
              {d.email && (
                <div className="text-xs text-slate-500">{d.email}</div>
              )}
            </div>
          </div>
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
        key: 'payType',
        label: 'Pay Type',
        sortable: true,
        render: (d) => <PayTypeBadge payType={d.payType} />,
      },
      {
        key: 'hourlyRate',
        label: 'Hourly Rate',
        sortable: true,
        align: 'right' as const,
        render: (d) => (
          <span className="text-sm font-mono text-slate-900">
            {d.payType === 'HOURLY' || d.payType === 'CUSTOM'
              ? formatCurrency(d.hourlyRate)
              : '—'}
          </span>
        ),
      },
      {
        key: 'percentageRate',
        label: 'Percentage',
        sortable: true,
        align: 'right' as const,
        render: (d) => (
          <span className="text-sm font-mono text-slate-900">
            {d.payType === 'PERCENTAGE' || d.payType === 'CUSTOM'
              ? `${d.percentageRate}%`
              : '—'}
          </span>
        ),
      },
      {
        key: 'balance',
        label: 'Balance',
        align: 'right' as const,
        render: (d) => {
          const pay = payMap.get(d.id);
          if (!pay) return <span className="text-sm text-slate-400">—</span>;
          return (
            <span
              className={cn(
                'text-sm font-bold font-mono',
                pay.balance > 0 ? 'text-red-600' : 'text-emerald-600',
              )}
            >
              {formatCurrency(pay.balance)}
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
              to={`/drivers/${d.id}/edit`}
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
    [payMap],
  );

  return (
    <div>
      {/* Page header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-1 block">
            Fleet Personnel
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-on-surface">
            Drivers
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
              onClick={() => setViewMode('pay')}
              className={cn(
                'px-4 py-1.5 text-[10px] uppercase font-bold tracking-widest rounded-md transition-all',
                viewMode === 'pay'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-slate-500 hover:text-slate-700',
              )}
            >
              Driver Pay
            </button>
          </div>
          <Link
            to="/drivers/new"
            className="gradient-primary text-white px-6 py-2.5 rounded-lg font-semibold text-sm shadow-md active:scale-[0.98] transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            New Driver
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
                placeholder="Search drivers..."
              />
            </div>

            <Select
              variant="filter"
              value={payTypeFilter}
              onChange={(e) => {
                setPayTypeFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Pay Type: All</option>
              <option value="HOURLY">Hourly</option>
              <option value="PERCENTAGE">Percentage</option>
              <option value="CUSTOM">Custom</option>
            </Select>

            <ColumnToggle
              columns={toggleableColumns}
              isVisible={isVisible}
              onToggle={toggleColumn}
            />

            <ExportPdfButton columns={DRIVERS_PDF_COLUMNS} onExport={(cols) => pdfApi.exportDrivers(params, cols)} />

            {(searchFilter || payTypeFilter) && (
              <button
                onClick={() => {
                  setSearchFilter('');
                  setPayTypeFilter('');
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
            emptyIcon="person"
            emptyTitle="No drivers found"
            emptyDescription="Add your first driver to get started."
            onSort={handleSort}
            onPageChange={setPage}
            onRowClick={(driver) => navigate(`/drivers/${driver.id}/edit`)}
            rowKey={(driver) => driver.id}
          />
        </>
      ) : (
        <>
          {/* Pay summary cards */}
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
            <SummaryCard label="Total Earned" value={formatCurrency(payTotals.earned)} accent="blue" icon="trending_up" />
            <SummaryCard label="Total Paid" value={formatCurrency(payTotals.paid)} accent="emerald" icon="paid" />
            <SummaryCard label="Total Owed" value={formatCurrency(payTotals.owed)} accent="red" icon="account_balance_wallet" />
          </section>

          {/* Driver pay cards */}
          <section className="space-y-4">
            {payLoading && (
              <div className="bg-surface-container-lowest rounded-xl ghost-border p-12 text-center">
                <span className="material-symbols-outlined text-5xl text-slate-300 mb-3 block animate-spin">progress_activity</span>
                <p className="text-sm text-slate-400">Loading driver pay data...</p>
              </div>
            )}

            {!payLoading && (payData?.drivers ?? []).length === 0 && (
              <div className="bg-surface-container-lowest rounded-xl ghost-border p-12 text-center">
                <span className="material-symbols-outlined text-5xl text-slate-300 mb-3 block">payments</span>
                <p className="text-lg font-semibold text-slate-400">No driver pay data</p>
                <p className="text-sm text-slate-400 mt-1">Driver pay summaries will appear here once jobs are recorded.</p>
              </div>
            )}

            {(payData?.drivers ?? []).map((driver) => {
              const isExpanded = expandedDriver === driver.driverId;
              const tab = activeTab[driver.driverId] ?? 'jobs';

              return (
                <div
                  key={driver.driverId}
                  className="bg-surface-container-lowest rounded-xl ghost-border overflow-hidden"
                >
                  {/* Driver header row */}
                  <button
                    onClick={() => setExpandedDriver(isExpanded ? null : driver.driverId)}
                    className="w-full px-6 py-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center">
                        <span className="material-symbols-outlined text-blue-600 text-xl">person</span>
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-on-surface">{driver.driverName}</p>
                        <p className="text-xs text-slate-500">
                          {driver.jobs.length} job{driver.jobs.length !== 1 ? 's' : ''} &middot;{' '}
                          {driver.payments.length} payment{driver.payments.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-8">
                      <div className="text-right hidden sm:block">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Earned</p>
                        <p className="text-sm font-bold text-on-surface">{formatCurrency(driver.totalEarned)}</p>
                      </div>
                      <div className="text-right hidden sm:block">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Paid</p>
                        <p className="text-sm font-bold text-emerald-600">{formatCurrency(driver.totalPaid)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Balance</p>
                        <p
                          className={cn(
                            'text-sm font-bold',
                            driver.balance > 0 ? 'text-red-600' : 'text-emerald-600',
                          )}
                        >
                          {formatCurrency(driver.balance)}
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

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-slate-100">
                      {/* Tab bar + record payment button */}
                      <div className="px-6 py-3 flex items-center justify-between border-b border-slate-100 bg-slate-50/30">
                        <div className="flex gap-1">
                          <TabButton
                            active={tab === 'jobs'}
                            onClick={() => setActiveTab((prev) => ({ ...prev, [driver.driverId]: 'jobs' }))}
                          >
                            Jobs ({driver.jobs.length})
                          </TabButton>
                          <TabButton
                            active={tab === 'payments'}
                            onClick={() => setActiveTab((prev) => ({ ...prev, [driver.driverId]: 'payments' }))}
                          >
                            Payments ({driver.payments.length})
                          </TabButton>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPaymentModal({ driver });
                          }}
                          className="gradient-primary text-white px-4 py-2 rounded-lg font-semibold text-xs shadow-sm active:scale-[0.98] transition-all flex items-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-[16px]">add</span>
                          Record Payment
                        </button>
                      </div>

                      {/* Jobs tab */}
                      {tab === 'jobs' && (() => {
                        const sel = jobSelection.get(driver.driverId) ?? new Set<string>();
                        const unpaidJobs = driver.jobs.filter((j) => !j.paidAt);
                        const selIds = driver.jobs.filter((j) => sel.has(j.jobId));
                        const selTotal = selIds.reduce((s, j) => s + j.amount, 0);
                        const allUnpaidSelected = unpaidJobs.length > 0 && unpaidJobs.every((j) => sel.has(j.jobId));
                        const someSelected = sel.size > 0 && !allUnpaidSelected;
                        return (
                          <div>
                            {/* Selection banner */}
                            {sel.size > 0 && (
                              <div className="px-6 py-3 bg-primary/5 border-b border-primary/10 flex items-center justify-between">
                                <div className="flex items-center gap-6">
                                  <span className="text-xs font-bold text-primary">{sel.size} job{sel.size !== 1 ? 's' : ''} selected</span>
                                  <span className="text-xs text-slate-600">
                                    Driver Pay: <span className="font-bold font-mono">{formatCurrency(selTotal)}</span>
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => clearDriverSelection(driver.driverId)}
                                    className="text-xs text-slate-500 hover:text-slate-700 transition-colors"
                                  >
                                    Clear
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPaymentModal({ driver, selectedJobIds: [...sel] });
                                    }}
                                    className="gradient-primary text-white px-4 py-1.5 rounded-lg text-xs font-semibold shadow-sm active:scale-[0.98] transition-all flex items-center gap-1.5"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">payments</span>
                                    Mark as Paid
                                  </button>
                                </div>
                              </div>
                            )}
                            <div className="overflow-x-auto">
                              <table className="w-full text-left">
                                <thead>
                                  <tr className="bg-slate-50/50">
                                    <th className="px-4 py-3 w-8">
                                      <input
                                        type="checkbox"
                                        readOnly
                                        checked={allUnpaidSelected}
                                        ref={(el) => { if (el) el.indeterminate = someSelected; }}
                                        onClick={() => toggleSelectAllJobs(driver.driverId, unpaidJobs.map((j) => j.jobId))}
                                        onChange={() => {}}
                                        disabled={unpaidJobs.length === 0}
                                        className="w-3.5 h-3.5 rounded accent-primary cursor-pointer disabled:opacity-30"
                                      />
                                    </th>
                                    <Th>Date</Th>
                                    <Th>Job Type</Th>
                                    <Th align="right">Job Amount</Th>
                                    <Th align="right">Driver Pay</Th>
                                    <Th align="center">Paid</Th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {driver.jobs.length === 0 ? (
                                    <tr>
                                      <td colSpan={6} className="px-6 py-8 text-center text-sm text-slate-400">
                                        No jobs recorded
                                      </td>
                                    </tr>
                                  ) : (
                                    driver.jobs.map((job) => {
                                      const isSelected = sel.has(job.jobId);
                                      const isPaid = !!job.paidAt;
                                      return (
                                        <tr
                                          key={job.jobId}
                                          onClick={() => !isPaid && toggleJobSelection(driver.driverId, job.jobId)}
                                          className={cn(
                                            'transition-colors',
                                            isPaid ? 'opacity-60' : 'hover:bg-slate-50/50 cursor-pointer',
                                            isSelected && 'bg-primary/5',
                                          )}
                                        >
                                          <td className="px-4 py-4">
                                            <input
                                              type="checkbox"
                                              checked={isSelected}
                                              disabled={isPaid}
                                              onChange={() => toggleJobSelection(driver.driverId, job.jobId)}
                                              onClick={(e) => e.stopPropagation()}
                                              className="w-3.5 h-3.5 rounded accent-primary cursor-pointer disabled:opacity-30"
                                            />
                                          </td>
                                          <td className="px-6 py-4 text-sm text-slate-600">{formatDate(job.jobDate)}</td>
                                          <td className="px-6 py-4 text-sm font-medium text-slate-700">{job.jobTypeTitle}</td>
                                          <td className="px-6 py-4 text-sm font-mono text-slate-500 text-right">
                                            {job.jobAmount != null ? formatCurrency(job.jobAmount) : '—'}
                                          </td>
                                          <td className="px-6 py-4 text-sm font-mono font-bold text-on-surface text-right">
                                            {formatCurrency(job.amount)}
                                          </td>
                                          <td className="px-6 py-4 text-center">
                                            {isPaid ? (
                                              <span className="material-symbols-outlined filled text-emerald-500 text-lg">
                                                check_circle
                                              </span>
                                            ) : (
                                              <span className="material-symbols-outlined text-slate-300 text-lg">
                                                radio_button_unchecked
                                              </span>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Payments tab */}
                      {tab === 'payments' && (
                        <PaymentsTable payments={driver.payments} />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        </>
      )}

      {/* Record Payment Modal */}
      {paymentModal && (
        <RecordPaymentModal
          driver={paymentModal.driver}
          selectedJobIds={paymentModal.selectedJobIds}
          onClose={() => { setPaymentModal(null); if (paymentModal.selectedJobIds) clearDriverSelection(paymentModal.driver.driverId); }}
        />
      )}

      {/* Delete confirmation */}
      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Driver"
        message={`Are you sure you want to delete ${deleteTarget?.name}? This action cannot be undone.`}
        isLoading={deleteDriver.isPending}
      />
    </div>
  );
}

// --- Sub-components ---

function SummaryCard({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: string;
  accent?: 'blue' | 'emerald' | 'red';
  icon?: string;
}) {
  return (
    <div className="bg-surface-container-lowest p-6 rounded-xl ghost-border flex flex-col justify-between h-36">
      <div className="flex justify-between items-start">
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</span>
        {icon && (
          <span
            className={cn(
              'material-symbols-outlined',
              accent === 'blue' ? 'text-blue-500' : accent === 'emerald' ? 'text-emerald-500' : accent === 'red' ? 'text-red-400' : 'text-slate-300',
            )}
          >
            {icon}
          </span>
        )}
      </div>
      <span className="text-3xl font-bold text-on-surface">{value}</span>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
        active
          ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-200'
          : 'text-slate-500 hover:bg-slate-100',
      )}
    >
      {children}
    </button>
  );
}

function Th({ children, align }: { children: React.ReactNode; align?: 'left' | 'right' | 'center' }) {
  return (
    <th
      className={cn(
        'px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
      )}
    >
      {children}
    </th>
  );
}

function PaymentsTable({
  payments,
}: {
  payments: { id: string; amount: number; paidAt: string; paymentMethod: string; reference: string | null }[];
}) {
  const deletePayment = useDeleteDriverPayment();
  const { addToast } = useToast();

  const handleDelete = useCallback(
    (id: string) => {
      deletePayment.mutate(id, {
        onSuccess: () => addToast('Payment deleted', 'success'),
        onError: (err) => addToast(err.message, 'error'),
      });
    },
    [deletePayment, addToast],
  );

  const methodLabel: Record<string, string> = {
    CASH: 'Cash',
    CHECK: 'Check',
    BANK_TRANSFER: 'Bank Transfer',
    E_TRANSFER: 'E-Transfer',
    OTHER: 'Other',
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="bg-slate-50/50">
            <Th>Date</Th>
            <Th align="right">Amount</Th>
            <Th>Method</Th>
            <Th>Reference</Th>
            <Th align="center"></Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {payments.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-400">
                No payments recorded
              </td>
            </tr>
          ) : (
            payments.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 text-sm text-slate-600">{formatDate(p.paidAt)}</td>
                <td className="px-6 py-4 text-sm font-mono font-bold text-emerald-600 text-right">
                  {formatCurrency(p.amount)}
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">{methodLabel[p.paymentMethod] ?? p.paymentMethod}</td>
                <td className="px-6 py-4 text-sm text-slate-500">{p.reference ?? '—'}</td>
                <td className="px-6 py-4 text-center">
                  <button
                    onClick={() => handleDelete(p.id)}
                    disabled={deletePayment.isPending}
                    className="p-1.5 text-slate-400 hover:text-error hover:bg-error-container/20 rounded transition-all"
                  >
                    <span className="material-symbols-outlined text-lg">delete</span>
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function RecordPaymentModal({
  driver,
  selectedJobIds,
  onClose,
}: {
  driver: DriverPaySummary;
  selectedJobIds?: string[];
  onClose: () => void;
}) {
  const createPayment = useCreateDriverPayment();
  const markJobsPaid = useMarkJobsAsPaid();
  const { addToast } = useToast();

  const isMarkingJobs = !!selectedJobIds?.length;
  const prefilledAmount = isMarkingJobs
    ? selectedJobIds!.reduce((sum, id) => {
        const job = driver.jobs.find((j) => j.jobId === id);
        return sum + (job?.amount ?? 0);
      }, 0)
    : null;

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Toronto' });
  const [amount, setAmount] = useState(prefilledAmount != null ? prefilledAmount.toFixed(2) : '');
  const [paidAt, setPaidAt] = useState(today);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  const isPending = createPayment.isPending || markJobsPaid.isPending;

  const handleSubmit = useCallback(() => {
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      addToast('Please enter a valid amount', 'error');
      return;
    }

    if (isMarkingJobs) {
      markJobsPaid.mutate(
        {
          driverId: driver.driverId,
          jobIds: selectedJobIds!,
          amount: parsedAmount,
          paidAt,
          paymentMethod,
          reference: reference || null,
          notes: notes || null,
        },
        {
          onSuccess: () => {
            addToast(`${selectedJobIds!.length} job${selectedJobIds!.length !== 1 ? 's' : ''} marked as paid`, 'success');
            onClose();
          },
          onError: (err) => addToast(err.message, 'error'),
        },
      );
    } else {
      createPayment.mutate(
        {
          driverId: driver.driverId,
          amount: parsedAmount,
          paidAt,
          paymentMethod,
          reference: reference || null,
          notes: notes || null,
        },
        {
          onSuccess: () => {
            addToast('Payment recorded successfully', 'success');
            onClose();
          },
          onError: (err) => addToast(err.message, 'error'),
        },
      );
    }
  }, [amount, paidAt, paymentMethod, reference, notes, driver.driverId, isMarkingJobs, selectedJobIds, createPayment, markJobsPaid, addToast, onClose]);

  return (
    <Modal
      open
      onClose={onClose}
      title={isMarkingJobs ? `Mark as Paid — ${driver.driverName}` : `Record Payment — ${driver.driverName}`}
      actions={
        <>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="gradient-primary text-white px-5 py-2.5 rounded-lg text-sm font-semibold shadow-md disabled:opacity-50 transition-all"
          >
            {isPending ? 'Saving...' : isMarkingJobs ? `Mark ${selectedJobIds!.length} Job${selectedJobIds!.length !== 1 ? 's' : ''} Paid` : 'Record Payment'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Context hint */}
        <div className="bg-blue-50 rounded-lg p-3 flex items-center gap-3">
          <span className="material-symbols-outlined text-blue-500 text-lg">info</span>
          {isMarkingJobs ? (
            <span className="text-xs text-blue-700 font-medium">
              Marking <span className="font-bold">{selectedJobIds!.length} job{selectedJobIds!.length !== 1 ? 's' : ''}</span> as paid &middot; Driver pay: <span className="font-bold">{formatCurrency(prefilledAmount!)}</span>
            </span>
          ) : (
            <span className="text-xs text-blue-700 font-medium">
              Current balance owed: <span className="font-bold">{formatCurrency(driver.balance)}</span>
            </span>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
            Amount
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-4 py-2.5 bg-surface-container-low border-none rounded-lg text-sm focus:ring-1 focus:ring-primary"
            placeholder="0.00"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
            Date
          </label>
          <input
            type="date"
            value={paidAt}
            onChange={(e) => setPaidAt(e.target.value)}
            className="w-full px-4 py-2.5 bg-surface-container-low border-none rounded-lg text-sm focus:ring-1 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
            Payment Method
          </label>
          <Select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
            Reference
          </label>
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            className="w-full px-4 py-2.5 bg-surface-container-low border-none rounded-lg text-sm focus:ring-1 focus:ring-primary"
            placeholder="Check #, transaction ID, etc."
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full px-4 py-2.5 bg-surface-container-low border-none rounded-lg text-sm focus:ring-1 focus:ring-primary resize-none"
            placeholder="Optional notes..."
          />
        </div>
      </div>
    </Modal>
  );
}
