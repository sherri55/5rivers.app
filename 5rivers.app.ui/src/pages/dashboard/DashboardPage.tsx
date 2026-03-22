import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi, jobsApi } from '@/api/endpoints';
import type { DashboardStats, DriverRevenue } from '@/api/endpoints';
import { useLookupMaps } from '@/hooks/useLookups';
import { formatCurrency, formatDate } from '@/lib/format';
import { SourceTypeBadge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

// ============================================
// Dashboard — TailAdmin-inspired overview
// ============================================

const CHART_COLORS = ['#465fff', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export function DashboardPage() {
  const stats = useQuery({ queryKey: ['dashboard', 'stats'], queryFn: analyticsApi.dashboard });
  const dailyRevenue = useQuery({ queryKey: ['dashboard', 'dailyRevenue'], queryFn: () => analyticsApi.revenueDaily(60) });
  const monthlyRevenue = useQuery({ queryKey: ['dashboard', 'monthlyRevenue'], queryFn: () => analyticsApi.revenueMonthly(24) });
  const companyRevenue = useQuery({ queryKey: ['dashboard', 'companyRevenue'], queryFn: () => analyticsApi.revenueByCompany() });
  const sourceBreakdown = useQuery({ queryKey: ['dashboard', 'source'], queryFn: () => analyticsApi.sourceBreakdown() });
  const driverRevenue = useQuery({ queryKey: ['dashboard', 'drivers'], queryFn: () => analyticsApi.revenueByDriver() });
  const paymentStatus = useQuery({ queryKey: ['dashboard', 'payments'], queryFn: () => analyticsApi.paymentStatus() });
  const topJobTypes = useQuery({ queryKey: ['dashboard', 'jobTypes'], queryFn: () => analyticsApi.topJobTypes(undefined, undefined, 5) });
  const monthlyProfit = useQuery({ queryKey: ['dashboard', 'monthlyProfit'], queryFn: () => analyticsApi.monthlyProfit(12) });
  const recentJobs = useQuery({
    queryKey: ['dashboard', 'recentJobs'],
    queryFn: () => jobsApi.list({ sortBy: 'jobDate', order: 'desc', limit: 10 }),
  });
  const { driverMap, jobTypeMap, isLoading: lookupsLoading } = useLookupMaps();

  if (stats.isLoading || lookupsLoading) return <PageSpinner />;

  const s: DashboardStats = stats.data ?? {
    revenue: { total: 0, thisMonth: 0, lastMonth: 0, thisWeek: 0, today: 0 },
    jobs: { total: 0, thisMonth: 0, lastMonth: 0, thisWeek: 0, today: 0, unpaidCount: 0, paidCount: 0 },
    invoices: { total: 0, totalOutstanding: 0, createdCount: 0, raisedCount: 0, receivedCount: 0 },
    drivers: { totalBalance: 0, activeCount: 0 },
    units: { total: 0, activeCount: 0, maintenanceCount: 0, inactiveCount: 0 },
    dateRange: { minDate: null, maxDate: null },
    expenses: { total: 0, thisMonth: 0, lastMonth: 0, thisWeek: 0, today: 0, count: 0 },
    profit: { total: 0, thisMonth: 0, lastMonth: 0 },
  };

  const revenueChange = s.revenue.lastMonth > 0
    ? ((s.revenue.thisMonth - s.revenue.lastMonth) / s.revenue.lastMonth * 100)
    : undefined;
  const jobsChange = s.jobs.lastMonth > 0
    ? ((s.jobs.thisMonth - s.jobs.lastMonth) / s.jobs.lastMonth * 100)
    : undefined;
  const profitChange = s.profit.lastMonth !== 0
    ? ((s.profit.thisMonth - s.profit.lastMonth) / Math.abs(s.profit.lastMonth) * 100)
    : undefined;

  // Payment collection rate
  const received = (paymentStatus.data ?? []).find(p => p.status === 'Received');
  const outstanding = (paymentStatus.data ?? []).find(p => p.status === 'Outstanding');
  const totalPaymentAmount = (received?.amount ?? 0) + (outstanding?.amount ?? 0);
  const collectionRate = totalPaymentAmount > 0 ? (received?.amount ?? 0) / totalPaymentAmount * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {s.dateRange?.minDate && s.dateRange?.maxDate
              ? `Data from ${formatDate(s.dateRange.minDate)} to ${formatDate(s.dateRange.maxDate)}`
              : 'No job data yet'}
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/reports"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">analytics</span>
            Reports
          </Link>
          <Link
            to="/jobs/new"
            className="inline-flex items-center gap-2 rounded-lg bg-[#465fff] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#3b4fe0] transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Job
          </Link>
        </div>
      </div>

      {/* Metric Cards Row 1 — Primary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 md:gap-6">
        <MetricCard
          label="Total Revenue"
          value={formatCurrency(s.revenue.total)}
          change={revenueChange}
          subtext={`${formatCurrency(s.revenue.thisMonth)} this month`}
          icon="payments"
          iconBg="bg-blue-100 text-blue-600"
        />
        <MetricCard
          label="Total Expenses"
          value={formatCurrency(s.expenses.total)}
          subtext={`${formatCurrency(s.expenses.thisMonth)} this month`}
          badge={`${s.expenses.count} entries`}
          badgeColor="warning"
          icon="account_balance"
          iconBg="bg-red-100 text-red-600"
        />
        <MetricCard
          label="Net Profit"
          value={formatCurrency(s.profit.total)}
          change={profitChange}
          subtext={`${formatCurrency(s.profit.thisMonth)} this month`}
          icon="trending_up"
          iconBg={s.profit.total >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}
        />
        <MetricCard
          label="Total Jobs"
          value={String(s.jobs.total)}
          change={jobsChange}
          subtext={`${s.jobs.thisMonth} this month`}
          icon="local_shipping"
          iconBg="bg-cyan-100 text-cyan-600"
        />
        <MetricCard
          label="Outstanding"
          value={formatCurrency(s.invoices.totalOutstanding)}
          badge={`${s.invoices.createdCount + s.invoices.raisedCount} pending`}
          badgeColor="warning"
          icon="receipt_long"
          iconBg="bg-amber-100 text-amber-600"
        />
      </div>

      {/* Quick Stats Row — Period metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <QuickStat label="Revenue Today" value={formatCurrency(s.revenue.today)} sub={`${s.jobs.today} jobs`} color="blue" />
        <QuickStat label="Revenue This Week" value={formatCurrency(s.revenue.thisWeek)} sub={`${s.jobs.thisWeek} jobs`} color="emerald" />
        <QuickStat label="Expenses This Month" value={formatCurrency(s.expenses.thisMonth)} sub={`vs ${formatCurrency(s.expenses.lastMonth)} last month`} color="red" />
        <QuickStat label="Profit This Month" value={formatCurrency(s.profit.thisMonth)} sub={`${s.profit.thisMonth >= 0 ? 'Positive' : 'Negative'}`} color={s.profit.thisMonth >= 0 ? 'emerald' : 'red'} />
        <QuickStat label="Collection Rate" value={`${collectionRate.toFixed(0)}%`} sub={`${received?.count ?? 0} of ${(received?.count ?? 0) + (outstanding?.count ?? 0)} jobs`} color="purple" />
      </div>

      {/* Charts Row 1 — Revenue Area + Source Donut */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 md:gap-6">
        {/* Revenue Trend */}
        <div className="xl:col-span-8 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Revenue Overview</h3>
              <p className="text-xs text-gray-500 mt-0.5">Daily revenue trend (last 60 days)</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#465fff]" />
                <span className="text-xs text-gray-500 font-medium">Revenue</span>
              </div>
            </div>
          </div>
          <div className="h-[300px]">
            {dailyRevenue.isLoading ? <ChartSkeleton /> : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyRevenue.data ?? []} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#465fff" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#465fff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d) => {
                      const dt = new Date(d + 'T00:00:00');
                      return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    }}
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    axisLine={false} tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tickFormatter={(v) => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}`}
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    axisLine={false} tickLine={false} width={55}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="revenue" stroke="#465fff" strokeWidth={2} fill="url(#revGrad)" dot={false} activeDot={{ r: 4, fill: '#465fff' }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Donut — Source Breakdown */}
        <div className="xl:col-span-4 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-1">Job Sources</h3>
          <p className="text-xs text-gray-500 mb-4">Dispatched vs Direct</p>
          {sourceBreakdown.isLoading ? <ChartSkeleton height={200} /> : (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {(sourceBreakdown.data ?? []).map((item, i) => (
                  <div key={item.sourceType} className={`rounded-xl p-3 ${i === 0 ? 'bg-blue-50' : 'bg-emerald-50'}`}>
                    <p className={`text-xl font-bold ${i === 0 ? 'text-blue-700' : 'text-emerald-700'}`}>{item.count}</p>
                    <p className={`text-[10px] font-semibold uppercase tracking-wider mt-0.5 ${i === 0 ? 'text-blue-500' : 'text-emerald-500'}`}>{item.sourceType}</p>
                    <p className={`text-xs font-semibold mt-0.5 ${i === 0 ? 'text-blue-600' : 'text-emerald-600'}`}>{formatCurrency(item.revenue)}</p>
                  </div>
                ))}
              </div>
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sourceBreakdown.data ?? []}
                      cx="50%" cy="50%"
                      innerRadius={55} outerRadius={80}
                      dataKey="revenue" nameKey="sourceType"
                      strokeWidth={3} stroke="#fff"
                    >
                      {(sourceBreakdown.data ?? []).map((_, i) => (
                        <Cell key={i} fill={i === 0 ? '#465fff' : '#10b981'} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Charts Row 2 — Monthly Bar + Sidebar (Companies / Invoice / Fleet) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 md:gap-6">
        {/* Monthly Profit — Revenue vs Expenses */}
        <div className="xl:col-span-7 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Monthly Profit</h3>
              <p className="text-xs text-gray-500 mt-0.5">Revenue vs Expenses by month</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#465fff]" />
                <span className="text-xs text-gray-500 font-medium">Revenue</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ef4444]" />
                <span className="text-xs text-gray-500 font-medium">Expenses</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#10b981]" />
                <span className="text-xs text-gray-500 font-medium">Profit</span>
              </div>
            </div>
          </div>
          <div className="h-[280px]">
            {monthlyProfit.isLoading ? <ChartSkeleton height={280} /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyProfit.data ?? []} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickFormatter={(m) => {
                      const [, mon] = m.split('-');
                      return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(mon)-1] || m;
                    }}
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    axisLine={false} tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : v <= -1000 ? `-$${(Math.abs(v)/1000).toFixed(0)}k` : `$${v}`}
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    axisLine={false} tickLine={false} width={55}
                  />
                  <Tooltip content={<ProfitTooltip />} />
                  <Bar dataKey="revenue" fill="#465fff" radius={[4, 4, 0, 0]} maxBarSize={20} />
                  <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={20} />
                  <Bar dataKey="profit" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right sidebar — Companies, Invoices, Fleet */}
        <div className="xl:col-span-5 space-y-4 md:space-y-6">
          {/* Top Companies */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-800">Top Companies</h3>
              <Link to="/reports?tab=companies" className="text-xs font-medium text-[#465fff] hover:underline">View All</Link>
            </div>
            <div className="space-y-3">
              {(companyRevenue.data ?? []).slice(0, 5).map((c, i) => {
                const maxRev = Math.max(...(companyRevenue.data ?? []).map(x => x.revenue), 1);
                return (
                  <div key={c.companyId}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-600">{c.companyName}</span>
                      <span className="text-sm font-semibold text-gray-800">{formatCurrency(c.revenue)}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${(c.revenue / maxRev) * 100}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                      />
                    </div>
                  </div>
                );
              })}
              {(companyRevenue.data ?? []).length === 0 && (
                <p className="text-sm text-gray-400 py-4 text-center">No company data yet</p>
              )}
            </div>
          </div>

          {/* Invoice & Fleet Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-[18px] text-gray-400">receipt_long</span>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Invoices</span>
              </div>
              <div className="space-y-2">
                <StatusRow label="Created" count={s.invoices.createdCount} color="bg-gray-200 text-gray-700" />
                <StatusRow label="Raised" count={s.invoices.raisedCount} color="bg-amber-100 text-amber-700" />
                <StatusRow label="Received" count={s.invoices.receivedCount} color="bg-emerald-100 text-emerald-700" />
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Total</span>
                  <span className="font-bold text-gray-700">{s.invoices.total}</span>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-[18px] text-gray-400">precision_manufacturing</span>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Fleet</span>
              </div>
              <div className="space-y-2">
                <StatusRow label="Active" count={s.units.activeCount} color="bg-emerald-100 text-emerald-700" />
                <StatusRow label="Maintenance" count={s.units.maintenanceCount} color="bg-amber-100 text-amber-700" />
                <StatusRow label="Inactive" count={s.units.inactiveCount} color="bg-gray-100 text-gray-600" />
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Total</span>
                  <span className="font-bold text-gray-700">{s.units.total}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3 — Payment Collection + Top Drivers + Top Job Types */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Payment Collection Progress */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-1">Payment Collection</h3>
          <p className="text-xs text-gray-500 mb-5">Received vs Outstanding</p>
          {paymentStatus.isLoading ? <ChartSkeleton height={160} /> : (
            <>
              <div className="flex items-center justify-center mb-5">
                <div className="relative h-32 w-32">
                  <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#10b981" strokeWidth="3" strokeDasharray={`${collectionRate}, 100`} strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-gray-800">{collectionRate.toFixed(0)}%</span>
                    <span className="text-[10px] text-gray-400 font-medium">Collected</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <span className="text-sm text-gray-600">Received</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-800">{formatCurrency(received?.amount ?? 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
                    <span className="text-sm text-gray-600">Outstanding</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-800">{formatCurrency(outstanding?.amount ?? 0)}</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Top Drivers */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Top Drivers</h3>
              <p className="text-xs text-gray-500 mt-0.5">By revenue</p>
            </div>
            <Link to="/reports?tab=drivers" className="text-xs font-medium text-[#465fff] hover:underline">View All</Link>
          </div>
          <div className="space-y-3">
            {(driverRevenue.data ?? []).slice(0, 5).map((d, i) => (
              <DriverRow key={d.driverId} driver={d} rank={i + 1} maxRevenue={Math.max(...(driverRevenue.data ?? []).map(x => x.revenue), 1)} />
            ))}
            {(driverRevenue.data ?? []).length === 0 && (
              <p className="text-sm text-gray-400 py-4 text-center">No driver data yet</p>
            )}
          </div>
        </div>

        {/* Top Job Types */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Top Job Types</h3>
              <p className="text-xs text-gray-500 mt-0.5">By revenue</p>
            </div>
            <Link to="/reports?tab=job-types" className="text-xs font-medium text-[#465fff] hover:underline">View All</Link>
          </div>
          <div className="space-y-3">
            {(topJobTypes.data ?? []).slice(0, 5).map((jt, i) => {
              const maxRev = Math.max(...(topJobTypes.data ?? []).map(x => x.revenue), 1);
              return (
                <div key={jt.jobTypeId}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-700 truncate">{jt.jobTypeTitle}</p>
                      <p className="text-[10px] text-gray-400">{jt.companyName} &middot; {jt.jobs} jobs</p>
                    </div>
                    <span className="text-sm font-semibold text-gray-800 ml-3">{formatCurrency(jt.revenue)}</span>
                  </div>
                  <div className="h-1 w-full rounded-full bg-gray-100">
                    <div className="h-full rounded-full" style={{ width: `${(jt.revenue / maxRev) * 100}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                  </div>
                </div>
              );
            })}
            {(topJobTypes.data ?? []).length === 0 && (
              <p className="text-sm text-gray-400 py-4 text-center">No job type data yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Jobs Table */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-5 py-4 sm:px-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800">Recent Jobs</h3>
          <div className="flex items-center gap-3">
            <Link to="/jobs" className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors">
              View All
            </Link>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {['Date', 'Job Type', 'Driver', 'Source', 'Amount', 'Received', 'Driver Paid'].map((h) => (
                  <th key={h} className={`px-5 py-3 sm:px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${h === 'Amount' ? 'text-right' : ''} ${h === 'Received' || h === 'Driver Paid' ? 'text-center' : ''}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(recentJobs.data?.data ?? []).map((job) => (
                <tr key={job.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3.5 sm:px-6 text-sm font-medium text-gray-700 whitespace-nowrap">{formatDate(job.jobDate)}</td>
                  <td className="px-5 py-3.5 sm:px-6 text-sm text-gray-600 max-w-[180px] truncate">
                    {jobTypeMap.get(job.jobTypeId) ?? '—'}
                  </td>
                  <td className="px-5 py-3.5 sm:px-6">
                    <div className="flex items-center gap-2.5">
                      {job.driverId && (
                        <div className="h-7 w-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                          {(driverMap.get(job.driverId) ?? '?')[0]?.toUpperCase()}
                        </div>
                      )}
                      <span className="text-sm text-gray-700">{driverMap.get(job.driverId ?? '') ?? '—'}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 sm:px-6"><SourceTypeBadge sourceType={job.sourceType} /></td>
                  <td className="px-5 py-3.5 sm:px-6 text-right text-sm font-semibold text-gray-800">{formatCurrency(job.amount)}</td>
                  <td className="px-5 py-3.5 sm:px-6 text-center">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${job.jobPaid ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                      {job.jobPaid ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 sm:px-6 text-center">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${job.driverPaid ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                      {job.driverPaid ? 'Yes' : 'No'}
                    </span>
                  </td>
                </tr>
              ))}
              {(recentJobs.data?.data ?? []).length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-sm text-gray-400">
                    No jobs yet. <Link to="/jobs/new" className="text-[#465fff] hover:underline">Create your first job</Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {recentJobs.data && recentJobs.data.total > 0 && (
          <div className="px-5 py-3 sm:px-6 border-t border-gray-100 bg-gray-50/30">
            <span className="text-xs text-gray-500">
              Showing {recentJobs.data.data.length} of {recentJobs.data.total} total jobs
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// Sub-components
// ============================================

function MetricCard({ label, value, change, subtext, badge, badgeColor, icon, iconBg }: {
  label: string; value: string; icon: string; iconBg: string;
  change?: number; subtext?: string;
  badge?: string; badgeColor?: 'success' | 'warning' | 'info';
}) {
  const badgeStyles = {
    success: 'bg-emerald-50 text-emerald-600',
    warning: 'bg-amber-50 text-amber-600',
    info: 'bg-blue-50 text-blue-600',
  };
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6">
      <div className="flex items-center justify-between">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconBg}`}>
          <span className="material-symbols-outlined text-[22px]">{icon}</span>
        </div>
        {change !== undefined && change !== 0 && (
          <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-1 text-xs font-semibold ${change > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
            <span className="material-symbols-outlined text-[14px]">
              {change > 0 ? 'trending_up' : 'trending_down'}
            </span>
            {Math.abs(change).toFixed(0)}%
          </span>
        )}
        {badge && badgeColor && (
          <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${badgeStyles[badgeColor]}`}>
            {badge}
          </span>
        )}
      </div>
      <div className="mt-5">
        <span className="text-2xl font-bold text-gray-800">{value}</span>
        <p className="text-sm text-gray-500 mt-1">{label}</p>
        {subtext && <p className="text-xs text-gray-400 mt-0.5">{subtext}</p>}
      </div>
    </div>
  );
}

function QuickStat({ label, value, sub, color }: { label: string; value: string; sub: string; color: 'blue' | 'emerald' | 'gray' | 'purple' | 'red' }) {
  const borderColors = { blue: 'border-l-blue-500', emerald: 'border-l-emerald-500', gray: 'border-l-gray-400', purple: 'border-l-purple-500', red: 'border-l-red-500' };
  return (
    <div className={`rounded-2xl border border-gray-200 bg-white p-4 border-l-4 ${borderColors[color]}`}>
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <p className="text-lg font-bold text-gray-800">{value}</p>
      <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>
    </div>
  );
}

function DriverRow({ driver, rank, maxRevenue }: { driver: DriverRevenue; rank: number; maxRevenue: number }) {
  const pct = maxRevenue > 0 ? (driver.revenue / maxRevenue * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
        {driver.driverName[0]?.toUpperCase() ?? '?'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-sm font-medium text-gray-700 truncate">{driver.driverName}</span>
          <span className="text-sm font-semibold text-gray-800 ml-2">{formatCurrency(driver.revenue)}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[10px] text-gray-400 whitespace-nowrap">{driver.jobs} jobs</span>
        </div>
      </div>
    </div>
  );
}

function StatusRow({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`inline-flex items-center justify-center h-6 min-w-[24px] rounded-md px-1.5 text-xs font-bold ${color}`}>
        {count}
      </span>
    </div>
  );
}

function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div className="flex items-center justify-center" style={{ height }}>
      <div className="flex items-center gap-2 text-gray-300">
        <span className="material-symbols-outlined animate-spin text-lg">sync</span>
        <span className="text-sm">Loading chart...</span>
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg text-xs">
      {label && <p className="font-semibold text-gray-700 mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-medium" style={{ color: p.color || '#465fff' }}>
          {p.name || 'Revenue'}: {typeof p.value === 'number' && p.value >= 10 ? formatCurrency(p.value) : p.value}
        </p>
      ))}
      {payload[0]?.payload?.jobs !== undefined && (
        <p className="text-gray-400 mt-0.5">{payload[0].payload.jobs} jobs</p>
      )}
    </div>
  );
}

function ProfitTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg text-xs min-w-[160px]">
      {label && <p className="font-semibold text-gray-700 mb-2">{label}</p>}
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-[#465fff] font-medium">Revenue</span>
          <span className="font-semibold text-gray-800">{formatCurrency(d?.revenue ?? 0)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-[#ef4444] font-medium">Expenses</span>
          <span className="font-semibold text-gray-800">{formatCurrency(d?.expenses ?? 0)}</span>
        </div>
        <div className="border-t border-gray-100 pt-1 flex justify-between gap-4">
          <span className={`font-medium ${(d?.profit ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>Profit</span>
          <span className={`font-bold ${(d?.profit ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(d?.profit ?? 0)}</span>
        </div>
      </div>
      {d?.jobs > 0 && <p className="text-gray-400 mt-1.5">{d.jobs} jobs</p>}
    </div>
  );
}
