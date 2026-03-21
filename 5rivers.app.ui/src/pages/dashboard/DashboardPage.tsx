import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { jobsApi, driverPayApi, unitsApi } from '@/api/endpoints';
import { useLookupMaps } from '@/hooks/useLookups';
import { formatCurrency, formatDate } from '@/lib/format';
import { SourceTypeBadge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';

// ============================================
// Dashboard — operational overview
// ============================================

export function DashboardPage() {
  // Get current date info for filters
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Fetch dashboard data in parallel
  const recentJobs = useQuery({
    queryKey: ['dashboard', 'recentJobs'],
    queryFn: () => jobsApi.list({ sortBy: 'jobDate', order: 'desc', limit: 50 }),
  });

  const monthJobs = useQuery({
    queryKey: ['dashboard', 'monthJobs', currentMonth],
    queryFn: () => jobsApi.list({ filter_jobDate: currentMonth, limit: 100 }),
  });

  const driverPay = useQuery({
    queryKey: ['dashboard', 'driverPay'],
    queryFn: () => driverPayApi.summary(),
  });

  const maintenanceUnits = useQuery({
    queryKey: ['dashboard', 'maintenanceUnits'],
    queryFn: () => unitsApi.list({ filter_status: 'MAINTENANCE', limit: 100 }),
  });

  const { driverMap, isLoading: lookupsLoading } = useLookupMaps();

  const isLoading =
    recentJobs.isLoading ||
    monthJobs.isLoading ||
    driverPay.isLoading ||
    maintenanceUnits.isLoading ||
    lookupsLoading;

  if (isLoading) return <PageSpinner />;

  // Compute summary values
  const totalRevenue =
    monthJobs.data?.data.reduce((sum, j) => sum + (j.amount ?? 0), 0) ?? 0;

  const unpaidBalance =
    driverPay.data?.drivers.reduce(
      (sum, d) => sum + Math.max(0, d.balance),
      0,
    ) ?? 0;

  const jobsThisWeek = getJobsThisWeek(recentJobs.data?.data ?? []);
  const maintenanceCount = maintenanceUnits.data?.total ?? 0;

  return (
    <div>
      {/* Page header */}
      <section className="mb-8 flex justify-between items-end">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-1 block">
            Operational Analytics
          </span>
          <h1 className="text-[2.5rem] font-semibold tracking-tight text-on-surface leading-tight">
            Fleet Overview
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
      </section>

      {/* Summary cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <SummaryCard
          label="Total Revenue"
          value={formatCurrency(totalRevenue)}
          subtitle="This Month"
          accent="emerald"
        />
        <SummaryCard
          label="Driver Balance"
          value={formatCurrency(unpaidBalance)}
          subtitle="Outstanding"
          icon="account_balance_wallet"
        />
        <SummaryCard
          label="Jobs This Week"
          value={String(jobsThisWeek)}
          subtitle="Active Deliveries"
          icon="route"
          accent="blue"
        />
        <SummaryCard
          label="Maintenance"
          value={String(maintenanceCount)}
          subtitle={maintenanceCount > 0 ? 'Needs attention' : 'All clear'}
          accent={maintenanceCount > 0 ? 'red' : undefined}
          dot={maintenanceCount > 0}
        />
      </section>

      {/* Recent jobs table */}
      <section className="bg-surface-container-lowest rounded-xl ghost-border overflow-hidden">
        <div className="px-8 py-6 flex justify-between items-center border-b border-slate-100">
          <h3 className="text-lg font-semibold text-on-surface">Recent Jobs</h3>
          <Link
            to="/jobs"
            className="text-blue-600 font-semibold text-sm hover:underline"
          >
            View All Jobs
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Date
                </th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Driver
                </th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Source
                </th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">
                  Amount
                </th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">
                  Paid
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentJobs.data?.data.slice(0, 8).map((job) => (
                <tr
                  key={job.id}
                  className="hover:bg-slate-50/50 transition-colors"
                >
                  <td className="px-8 py-5 text-sm font-medium text-slate-600">
                    {formatDate(job.jobDate)}
                  </td>
                  <td className="px-8 py-5 text-sm font-medium text-slate-700">
                    {driverMap.get(job.driverId ?? '') ?? '—'}
                  </td>
                  <td className="px-8 py-5">
                    <SourceTypeBadge sourceType={job.sourceType} />
                  </td>
                  <td className="px-8 py-5 text-right font-mono text-sm font-bold text-on-surface">
                    {formatCurrency(job.amount)}
                  </td>
                  <td className="px-8 py-5 text-center">
                    {job.driverPaid ? (
                      <span className="material-symbols-outlined filled text-emerald-500">
                        check_circle
                      </span>
                    ) : (
                      <span className="material-symbols-outlined text-slate-300">
                        radio_button_unchecked
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-8 py-4 bg-slate-50/30 border-t border-slate-100">
          <span className="text-xs text-slate-500">
            Showing {Math.min(8, recentJobs.data?.data.length ?? 0)} of{' '}
            {recentJobs.data?.total ?? 0} total jobs
          </span>
        </div>
      </section>
    </div>
  );
}

// --- Summary Card Component ---

function SummaryCard({
  label,
  value,
  subtitle,
  icon,
  accent,
  dot,
}: {
  label: string;
  value: string;
  subtitle: string;
  icon?: string;
  accent?: 'emerald' | 'blue' | 'red';
  dot?: boolean;
}) {
  return (
    <div className="bg-surface-container-lowest p-6 rounded-xl ghost-border flex flex-col justify-between h-40">
      <div className="flex justify-between items-start">
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
          {label}
        </span>
        {dot && <span className="flex h-2 w-2 rounded-full bg-error" />}
        {icon && (
          <span
            className={`material-symbols-outlined ${
              accent === 'blue'
                ? 'text-blue-500'
                : accent === 'emerald'
                  ? 'text-emerald-500'
                  : 'text-slate-300'
            }`}
          >
            {icon}
          </span>
        )}
      </div>
      <div>
        <span className="text-3xl font-bold text-on-surface">{value}</span>
        <p
          className={`text-[11px] mt-1 font-medium ${
            accent === 'red' ? 'text-error' : 'text-slate-500'
          }`}
        >
          {subtitle}
        </p>
      </div>
    </div>
  );
}

// --- Helpers ---

function getJobsThisWeek(jobs: { jobDate: string }[]): number {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return jobs.filter((j) => {
    const d = new Date(j.jobDate + 'T00:00:00');
    return d >= monday && d <= sunday;
  }).length;
}
