import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi, pdfApi } from '@/api/endpoints';
import type {
  CompanyRevenue, DriverRevenue, DispatcherRevenue,
  SourceTypeBreakdown, PaymentStatus, JobTypeRevenue,
  ExpenseByCategoryItem,
} from '@/api/endpoints';
import { formatCurrency } from '@/lib/format';
import { Select } from '@/components/ui/Select';
import { PageSpinner, ButtonSpinner } from '@/components/ui/Spinner';
import { useToast } from '@/context/toast';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

// ============================================
// Reports Page — TailAdmin-inspired analytics
// ============================================

type ReportTab = 'overview' | 'companies' | 'drivers' | 'dispatchers' | 'job-types' | 'expenses';

const TABS: { key: ReportTab; label: string; icon: string }[] = [
  { key: 'overview', label: 'Overview', icon: 'dashboard' },
  { key: 'companies', label: 'Companies', icon: 'business' },
  { key: 'drivers', label: 'Drivers', icon: 'person' },
  { key: 'dispatchers', label: 'Dispatchers', icon: 'support_agent' },
  { key: 'job-types', label: 'Job Types', icon: 'work' },
  { key: 'expenses', label: 'Expenses', icon: 'account_balance' },
];

const PRESETS = [
  { label: 'All Time', key: 'all-time' },
  { label: 'This Month', key: 'this-month' },
  { label: 'Last Month', key: 'last-month' },
  { label: 'This Quarter', key: 'this-quarter' },
  { label: 'Last Quarter', key: 'last-quarter' },
  { label: 'This Year', key: 'this-year' },
  { label: 'Last Year', key: 'last-year' },
  { label: 'Custom', key: 'custom' },
];

const COLORS = ['#465fff', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#14b8a6'];

function getPresetDates(preset: string): { startDate?: string; endDate?: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  switch (preset) {
    case 'this-month': return { startDate: fmt(new Date(y, m, 1)), endDate: fmt(now) };
    case 'last-month': return { startDate: fmt(new Date(y, m - 1, 1)), endDate: fmt(new Date(y, m, 0)) };
    case 'this-quarter': { const q = Math.floor(m / 3) * 3; return { startDate: fmt(new Date(y, q, 1)), endDate: fmt(now) }; }
    case 'last-quarter': { const q = Math.floor(m / 3) * 3 - 3; return { startDate: fmt(new Date(y, q, 1)), endDate: fmt(new Date(y, q + 3, 0)) }; }
    case 'this-year': return { startDate: fmt(new Date(y, 0, 1)), endDate: fmt(now) };
    case 'last-year': return { startDate: fmt(new Date(y - 1, 0, 1)), endDate: fmt(new Date(y - 1, 11, 31)) };
    default: return {};
  }
}

export function ReportsPage() {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<ReportTab>('overview');
  const [preset, setPreset] = useState('all-time');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [exporting, setExporting] = useState<string | null>(null);

  const { startDate, endDate } = useMemo(() => {
    if (preset === 'custom') return { startDate: customStart || undefined, endDate: customEnd || undefined };
    return getPresetDates(preset);
  }, [preset, customStart, customEnd]);

  const companyData = useQuery({ queryKey: ['reports', 'company', startDate, endDate], queryFn: () => analyticsApi.revenueByCompany(startDate, endDate) });
  const driverData = useQuery({ queryKey: ['reports', 'driver', startDate, endDate], queryFn: () => analyticsApi.revenueByDriver(startDate, endDate) });
  const dispatcherData = useQuery({ queryKey: ['reports', 'dispatcher', startDate, endDate], queryFn: () => analyticsApi.revenueByDispatcher(startDate, endDate) });
  const sourceData = useQuery({ queryKey: ['reports', 'source', startDate, endDate], queryFn: () => analyticsApi.sourceBreakdown(startDate, endDate) });
  const paymentData = useQuery({ queryKey: ['reports', 'payment', startDate, endDate], queryFn: () => analyticsApi.paymentStatus(startDate, endDate) });
  const jobTypeData = useQuery({ queryKey: ['reports', 'jobTypes', startDate, endDate], queryFn: () => analyticsApi.topJobTypes(startDate, endDate, 50) });
  const expenseByCat = useQuery({ queryKey: ['reports', 'expensesByCat', startDate, endDate], queryFn: () => analyticsApi.expensesByCategory(startDate, endDate) });

  const isLoading = companyData.isLoading && driverData.isLoading;
  const totalRevenue = useMemo(() => (companyData.data ?? []).reduce((s, c) => s + c.revenue, 0), [companyData.data]);
  const totalJobs = useMemo(() => (companyData.data ?? []).reduce((s, c) => s + c.jobs, 0), [companyData.data]);
  const totalCommission = useMemo(() => (dispatcherData.data ?? []).reduce((s, d) => s + d.commission, 0), [dispatcherData.data]);
  const totalExpenses = useMemo(() => (expenseByCat.data ?? []).reduce((s, e) => s + e.total, 0), [expenseByCat.data]);
  const netProfit = totalRevenue - totalExpenses;
  const avgPerJob = totalJobs > 0 ? totalRevenue / totalJobs : 0;

  async function handleExport(type: string) {
    setExporting(type);
    try {
      const params = startDate || endDate ? { filter_startDate: startDate, filter_endDate: endDate } as any : undefined;
      switch (type) {
        case 'jobs': await pdfApi.exportJobs(params); break;
        case 'invoices': await pdfApi.exportInvoices(params); break;
        case 'drivers': await pdfApi.exportDrivers(params); break;
        case 'dispatchers': await pdfApi.exportDispatchers(params); break;
        case 'companies': await pdfApi.exportCompanies(params); break;
      }
      addToast(`${type} report downloaded`, 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Export failed', 'error');
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Reports</h1>
          <p className="text-sm text-gray-500 mt-0.5">Analyze performance across companies, drivers, and dispatchers.</p>
        </div>
        {/* Export buttons */}
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'jobs', label: 'Jobs', icon: 'local_shipping' },
            { key: 'drivers', label: 'Drivers', icon: 'person' },
            { key: 'companies', label: 'Companies', icon: 'business' },
            { key: 'invoices', label: 'Invoices', icon: 'receipt_long' },
          ].map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => handleExport(key)}
              disabled={exporting !== null}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-600 shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {exporting === key ? <ButtonSpinner /> : <span className="material-symbols-outlined text-[14px]">{icon}</span>}
              {label} PDF
            </button>
          ))}
        </div>
      </div>

      {/* Date Range */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[180px]">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-1.5">Period</label>
            <Select value={preset} onChange={(e) => setPreset(e.target.value)} icon="date_range">
              {PRESETS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </Select>
          </div>
          {preset === 'custom' && (
            <>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-1.5">Start</label>
                <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
                  className="px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm focus:ring-2 focus:ring-[#465fff]/20 focus:border-[#465fff] transition-all" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-1.5">End</label>
                <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
                  className="px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm focus:ring-2 focus:ring-[#465fff]/20 focus:border-[#465fff] transition-all" />
              </div>
            </>
          )}
          <div className="flex items-center gap-1.5 text-xs text-gray-400 pb-2.5">
            <span className="material-symbols-outlined text-[14px]">info</span>
            {startDate && endDate ? `${startDate} to ${endDate}` : 'All time data'}
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <MiniMetric label="Total Revenue" value={formatCurrency(totalRevenue)} icon="payments" color="blue" />
        <MiniMetric label="Total Expenses" value={formatCurrency(totalExpenses)} icon="account_balance" color="red" />
        <MiniMetric label="Net Profit" value={formatCurrency(netProfit)} icon="trending_up" color={netProfit >= 0 ? 'emerald' : 'red'} />
        <MiniMetric label="Total Jobs" value={String(totalJobs)} icon="local_shipping" color="emerald" />
        <MiniMetric label="Commission" value={formatCurrency(totalCommission)} icon="percent" color="amber" />
        <MiniMetric label="Avg / Job" value={formatCurrency(avgPerJob)} icon="analytics" color="cyan" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 overflow-x-auto">
        {TABS.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-white text-gray-800 shadow-sm border border-gray-200'
                : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
            }`}>
            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? <PageSpinner /> : (
        <>
          {activeTab === 'overview' && <OverviewTab sourceData={sourceData.data} paymentData={paymentData.data} companyData={companyData.data} driverData={driverData.data} />}
          {activeTab === 'companies' && <DataTableTab data={companyData.data ?? []} />}
          {activeTab === 'drivers' && <DriversTab data={driverData.data ?? []} />}
          {activeTab === 'dispatchers' && <DispatchersTab data={dispatcherData.data ?? []} />}
          {activeTab === 'job-types' && <JobTypesTab data={jobTypeData.data ?? []} />}
          {activeTab === 'expenses' && <ExpensesTab data={expenseByCat.data ?? []} totalRevenue={totalRevenue} />}
        </>
      )}
    </div>
  );
}

// ============================================
// Overview Tab
// ============================================

function OverviewTab({ sourceData, paymentData, companyData, driverData }: {
  sourceData?: SourceTypeBreakdown[]; paymentData?: PaymentStatus[];
  companyData?: CompanyRevenue[]; driverData?: DriverRevenue[];
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Source */}
        <ChartCard title="Dispatched vs Direct" subtitle="Revenue by source type">
          <div className="grid grid-cols-2 gap-3 mb-4">
            {(sourceData ?? []).map((s, i) => (
              <div key={s.sourceType} className={`rounded-xl p-4 ${i === 0 ? 'bg-blue-50' : 'bg-emerald-50'}`}>
                <p className={`text-2xl font-bold ${i === 0 ? 'text-blue-700' : 'text-emerald-700'}`}>{s.count}</p>
                <p className={`text-[10px] font-semibold uppercase tracking-wider mt-1 ${i === 0 ? 'text-blue-500' : 'text-emerald-500'}`}>{s.sourceType}</p>
                <p className={`text-sm font-semibold mt-1 ${i === 0 ? 'text-blue-600' : 'text-emerald-600'}`}>{formatCurrency(s.revenue)}</p>
              </div>
            ))}
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={sourceData ?? []} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="revenue" nameKey="sourceType" strokeWidth={3} stroke="#fff">
                  {(sourceData ?? []).map((_, i) => <Cell key={i} fill={i === 0 ? '#465fff' : '#10b981'} />)}
                </Pie>
                <Tooltip content={<TT />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Payment Status */}
        <ChartCard title="Payment Collection" subtitle="Received vs Outstanding">
          <div className="grid grid-cols-2 gap-3 mb-4">
            {(paymentData ?? []).map((p) => (
              <div key={p.status} className={`rounded-xl p-4 ${p.status === 'Received' ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                <p className={`text-2xl font-bold ${p.status === 'Received' ? 'text-emerald-700' : 'text-amber-700'}`}>{p.count}</p>
                <p className={`text-[10px] font-semibold uppercase tracking-wider mt-1 ${p.status === 'Received' ? 'text-emerald-500' : 'text-amber-500'}`}>{p.status}</p>
                <p className={`text-sm font-semibold mt-1 ${p.status === 'Received' ? 'text-emerald-600' : 'text-amber-600'}`}>{formatCurrency(p.amount)}</p>
              </div>
            ))}
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={paymentData ?? []} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="amount" nameKey="status" strokeWidth={3} stroke="#fff">
                  {(paymentData ?? []).map((p, i) => <Cell key={i} fill={p.status === 'Received' ? '#10b981' : '#f59e0b'} />)}
                </Pie>
                <Tooltip content={<TT />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Horizontal bar charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Top Companies" subtitle="Revenue ranking">
          <HBarChart data={(companyData ?? []).slice(0, 8)} nameKey="companyName" valueKey="revenue" />
        </ChartCard>
        <ChartCard title="Top Drivers" subtitle="Revenue ranking">
          <HBarChart data={(driverData ?? []).slice(0, 8)} nameKey="driverName" valueKey="revenue" />
        </ChartCard>
      </div>
    </div>
  );
}

// ============================================
// Company / Driver / Dispatcher / Job Type Tabs
// ============================================

function DataTableTab({ data }: { data: CompanyRevenue[] }) {
  const totalRev = data.reduce((s, r) => s + r.revenue, 0);
  return (
    <div className="space-y-6">
      <ChartCard title="Revenue by Company" subtitle="Distribution chart">
        <div className="h-[350px] overflow-x-auto"><div className="min-w-[400px] h-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="companyName" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} angle={-35} textAnchor="end" interval={0} />
              <YAxis tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} width={55} />
              <Tooltip content={<TT />} />
              <Bar dataKey="revenue" radius={[6, 6, 0, 0]} maxBarSize={40}>{data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </div></div>
      </ChartCard>
      <ReportTable
        headers={['Name', 'Revenue', 'Jobs', 'Avg/Job', 'Share']}
        rows={data.map((c, i) => ({
          cells: [
            <CellWithDot key="n" color={COLORS[i % COLORS.length]} text={c.companyName} />,
            <span key="r" className="font-mono font-semibold">{formatCurrency(c.revenue)}</span>,
            c.jobs,
            formatCurrency(c.jobs > 0 ? c.revenue / c.jobs : 0),
            <ProgressCell key="p" value={totalRev > 0 ? c.revenue / totalRev : 0} color={COLORS[i % COLORS.length]} />,
          ],
        }))}
        footerCells={['Total', formatCurrency(totalRev), data.reduce((s, r) => s + r.jobs, 0), '', '100%']}
      />
    </div>
  );
}

function DriversTab({ data }: { data: DriverRevenue[] }) {
  const totalRev = data.reduce((s, r) => s + r.revenue, 0);
  return (
    <div className="space-y-6">
      <ChartCard title="Driver Performance" subtitle="Paid vs Unpaid jobs">
        <div className="h-[350px] overflow-x-auto"><div className="min-w-[400px] h-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="driverName" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} angle={-35} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} width={40} />
              <Tooltip content={<TT />} />
              <Legend formatter={(v) => <span className="text-xs text-gray-600">{v}</span>} />
              <Bar dataKey="paid" name="Paid" stackId="s" fill="#10b981" maxBarSize={36} />
              <Bar dataKey="unpaid" name="Unpaid" stackId="s" fill="#f59e0b" radius={[6,6,0,0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div></div>
      </ChartCard>
      <ReportTable
        headers={['Driver', 'Revenue', 'Jobs', 'Avg/Job', 'Paid', 'Unpaid', 'Share']}
        rows={data.map((d, i) => ({
          cells: [
            <CellWithDot key="n" color={COLORS[i % COLORS.length]} text={d.driverName} />,
            <span key="r" className="font-mono font-semibold">{formatCurrency(d.revenue)}</span>,
            d.jobs,
            formatCurrency(d.jobs > 0 ? d.revenue / d.jobs : 0),
            <Badge key="p" value={d.paid} color="emerald" />,
            <Badge key="u" value={d.unpaid} color={d.unpaid > 0 ? 'amber' : 'gray'} />,
            `${totalRev > 0 ? (d.revenue / totalRev * 100).toFixed(0) : 0}%`,
          ],
        }))}
        footerCells={['Total', formatCurrency(totalRev), data.reduce((s,r)=>s+r.jobs,0), '', data.reduce((s,r)=>s+r.paid,0), data.reduce((s,r)=>s+r.unpaid,0), '']}
      />
    </div>
  );
}

function DispatchersTab({ data }: { data: DispatcherRevenue[] }) {
  const totalRev = data.reduce((s, r) => s + r.revenue, 0);
  return (
    <div className="space-y-6">
      <ChartCard title="Dispatcher Revenue & Commission" subtitle="Side-by-side comparison">
        <div className="h-[350px] overflow-x-auto"><div className="min-w-[400px] h-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="dispatcherName" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} angle={-35} textAnchor="end" interval={0} />
              <YAxis tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} width={55} />
              <Tooltip content={<TT />} />
              <Legend formatter={(v) => <span className="text-xs text-gray-600">{v}</span>} />
              <Bar dataKey="revenue" name="Revenue" fill="#465fff" radius={[6,6,0,0]} maxBarSize={32} />
              <Bar dataKey="commission" name="Commission" fill="#f59e0b" radius={[6,6,0,0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div></div>
      </ChartCard>
      <ReportTable
        headers={['Dispatcher', 'Revenue', 'Jobs', 'Commission', 'Net Revenue', 'Share']}
        rows={data.map((d, i) => ({
          cells: [
            <CellWithDot key="n" color={COLORS[i % COLORS.length]} text={d.dispatcherName} />,
            <span key="r" className="font-mono font-semibold">{formatCurrency(d.revenue)}</span>,
            d.jobs,
            <span key="c" className="text-amber-600 font-semibold">{formatCurrency(d.commission)}</span>,
            <span key="net" className="text-emerald-600 font-semibold">{formatCurrency(d.revenue - d.commission)}</span>,
            `${totalRev > 0 ? (d.revenue / totalRev * 100).toFixed(0) : 0}%`,
          ],
        }))}
        footerCells={['Total', formatCurrency(totalRev), data.reduce((s,r)=>s+r.jobs,0), formatCurrency(data.reduce((s,r)=>s+r.commission,0)), formatCurrency(data.reduce((s,r)=>s+(r.revenue-r.commission),0)), '']}
      />
    </div>
  );
}

function JobTypesTab({ data }: { data: JobTypeRevenue[] }) {
  const totalRev = data.reduce((s, r) => s + r.revenue, 0);
  return (
    <div className="space-y-6">
      <ChartCard title="Top Job Types" subtitle="Revenue by job type">
        <div className="h-[400px] overflow-x-auto"><div className="min-w-[400px] h-full">
          <HBarChart data={data.slice(0, 12)} nameKey="jobTypeTitle" valueKey="revenue" height={400} />
        </div></div>
      </ChartCard>
      <ReportTable
        headers={['Job Type', 'Company', 'Type', 'Revenue', 'Jobs', 'Avg/Job']}
        rows={data.map((jt, i) => ({
          cells: [
            <CellWithDot key="n" color={COLORS[i % COLORS.length]} text={jt.jobTypeTitle} />,
            <span key="c" className="text-gray-500">{jt.companyName}</span>,
            <span key="t" className="inline-flex rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-gray-600">{jt.dispatchType}</span>,
            <span key="r" className="font-mono font-semibold">{formatCurrency(jt.revenue)}</span>,
            jt.jobs,
            formatCurrency(jt.jobs > 0 ? jt.revenue / jt.jobs : 0),
          ],
        }))}
        footerCells={['Total', '', '', formatCurrency(totalRev), data.reduce((s,r)=>s+r.jobs,0), '']}
      />
    </div>
  );
}

// ============================================
// Shared Components
// ============================================

function MiniMetric({ label, value, icon, color }: { label: string; value: string; icon: string; color: 'blue' | 'emerald' | 'purple' | 'amber' | 'cyan' | 'red' }) {
  const styles: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
    cyan: 'bg-cyan-50 text-cyan-600',
    red: 'bg-red-50 text-red-600',
  };
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 flex items-center gap-3">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${styles[color]}`}>
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-lg font-bold text-gray-800">{value}</p>
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 overflow-hidden">
      <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
      {subtitle && <p className="text-xs text-gray-500 mt-0.5 mb-5">{subtitle}</p>}
      {!subtitle && <div className="mb-5" />}
      {children}
    </div>
  );
}

function HBarChart({ data, nameKey, valueKey, height = 300 }: { data: any[]; nameKey: string; valueKey: string; height?: number }) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
          <XAxis type="number" tickFormatter={(v) => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}`} tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey={nameKey} tick={{ fontSize: 11, fill: '#374151' }} axisLine={false} tickLine={false} width={130} />
          <Tooltip content={<TT />} />
          <Bar dataKey={valueKey} radius={[0, 6, 6, 0]} maxBarSize={22}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ReportTable({ headers, rows, footerCells }: {
  headers: string[];
  rows: { cells: React.ReactNode[] }[];
  footerCells?: React.ReactNode[];
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              {headers.map((h) => (
                <th key={h} className="px-5 py-3 sm:px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row, ri) => (
              <tr key={ri} className="hover:bg-gray-50/50 transition-colors">
                {row.cells.map((cell, ci) => (
                  <td key={ci} className="px-5 py-3.5 sm:px-6 text-sm text-gray-700">{cell}</td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={headers.length} className="px-5 py-8 text-center text-sm text-gray-400">No data for the selected period</td></tr>
            )}
          </tbody>
          {footerCells && rows.length > 0 && (
            <tfoot>
              <tr className="bg-gray-50 border-t border-gray-200">
                {footerCells.map((cell, i) => (
                  <td key={i} className="px-5 py-3 sm:px-6 text-sm font-bold text-gray-700">{cell}</td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

function CellWithDot({ color, text }: { color: string; text: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      <span className="font-medium">{text}</span>
    </div>
  );
}

function ProgressCell({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-14 h-1.5 rounded-full bg-gray-100">
        <div className="h-full rounded-full" style={{ width: `${value * 100}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-semibold text-gray-500">{(value * 100).toFixed(0)}%</span>
    </div>
  );
}

function Badge({ value, color }: { value: number | string; color: 'emerald' | 'amber' | 'gray' }) {
  const s = { emerald: 'bg-emerald-50 text-emerald-700', amber: 'bg-amber-50 text-amber-700', gray: 'bg-gray-100 text-gray-500' };
  return <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold ${s[color]}`}>{value}</span>;
}

function ExpensesTab({ data, totalRevenue }: { data: ExpenseByCategoryItem[]; totalRevenue: number }) {
  const totalExp = data.reduce((s, e) => s + e.total, 0);
  const maxExp = Math.max(...data.map(e => e.total), 1);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Donut */}
        <ChartCard title="Expenses by Category" subtitle="Distribution across categories">
          {data.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No expense data for this period</p>
          ) : (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="total" nameKey="categoryName" strokeWidth={3} stroke="#fff">
                    {data.map((e, i) => (
                      <Cell key={i} fill={e.categoryColor || COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<TT />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        {/* Category breakdown */}
        <ChartCard title="Category Breakdown" subtitle={`Total: ${formatCurrency(totalExp)} across ${data.length} categories`}>
          <div className="space-y-3">
            {data.map((e, i) => (
              <div key={e.categoryId ?? 'none'}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: e.categoryColor || COLORS[i % COLORS.length] }} />
                    <span className="text-sm font-medium text-gray-700">{e.categoryName}</span>
                    <span className="text-[10px] text-gray-400">{e.count} entries</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-800">{formatCurrency(e.total)}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${(e.total / maxExp) * 100}%`, backgroundColor: e.categoryColor || COLORS[i % COLORS.length] }}
                  />
                </div>
              </div>
            ))}
            {data.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">No expense data</p>
            )}
          </div>
        </ChartCard>
      </div>

      {/* Expense vs Revenue summary */}
      {totalRevenue > 0 && totalExp > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Expense Ratio</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl bg-blue-50 p-4 text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-500 mb-1">Revenue</p>
              <p className="text-xl font-bold text-blue-700">{formatCurrency(totalRevenue)}</p>
            </div>
            <div className="rounded-xl bg-red-50 p-4 text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-red-500 mb-1">Expenses</p>
              <p className="text-xl font-bold text-red-700">{formatCurrency(totalExp)}</p>
              <p className="text-[10px] text-red-400 mt-1">{totalRevenue > 0 ? `${(totalExp / totalRevenue * 100).toFixed(1)}% of revenue` : ''}</p>
            </div>
            <div className={`rounded-xl p-4 text-center ${totalRevenue - totalExp >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
              <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${totalRevenue - totalExp >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>Net Profit</p>
              <p className={`text-xl font-bold ${totalRevenue - totalExp >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{formatCurrency(totalRevenue - totalExp)}</p>
              <p className={`text-[10px] mt-1 ${totalRevenue - totalExp >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {totalRevenue > 0 ? `${((totalRevenue - totalExp) / totalRevenue * 100).toFixed(1)}% margin` : ''}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <ReportTable
        headers={['Category', 'Count', 'Total', '% of Total']}
        rows={data.map((e, i) => ({
          cells: [
            <CellWithDot key="name" color={e.categoryColor || COLORS[i % COLORS.length]} text={e.categoryName} />,
            <span key="count" className="font-semibold">{e.count}</span>,
            <span key="total" className="font-bold text-red-600">{formatCurrency(e.total)}</span>,
            <ProgressCell key="pct" value={totalExp > 0 ? e.total / totalExp : 0} color={e.categoryColor || COLORS[i % COLORS.length]} />,
          ],
        }))}
        footerCells={['Total', String(data.reduce((s, e) => s + e.count, 0)), formatCurrency(totalExp), '100%']}
      />
    </div>
  );
}

function TT({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg text-xs">
      {label && <p className="font-semibold text-gray-700 mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-medium" style={{ color: p.color || '#465fff' }}>
          {p.name}: {typeof p.value === 'number' && p.value >= 10 ? formatCurrency(p.value) : p.value}
        </p>
      ))}
    </div>
  );
}
