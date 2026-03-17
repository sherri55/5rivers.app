
import React from 'react';
import { useQuery } from '@apollo/client';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from 'recharts';
import { ViewType } from '../types';
import { GET_DASHBOARD_STATS } from '../lib/graphql/dashboard';
import { recentJobsToActions } from '../lib/mapDashboardToUi';

const CHART_DATA = [
  { name: 'Mon', volume: 40, revenue: 12000 },
  { name: 'Tue', volume: 30, revenue: 8500 },
  { name: 'Wed', volume: 75, revenue: 21000 },
  { name: 'Thu', volume: 25, revenue: 7000 },
  { name: 'Fri', volume: 85, revenue: 25000 },
  { name: 'Sat', volume: 15, revenue: 4000 },
  { name: 'Sun', volume: 10, revenue: 2500 },
];

interface DashboardProps {
  onNavigate: (view: ViewType) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { data, loading, error } = useQuery(GET_DASHBOARD_STATS);
  const stats = data?.dashboardStats;
  const overall = stats?.overallStats;
  const monthly = stats?.monthlyComparison;
  const revenueFormatted = overall?.totalAmount != null
    ? `$${Number(overall.totalAmount).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
    : '$0';
  const revenueChange = monthly?.percentageChange != null
    ? `${monthly.percentageChange >= 0 ? '+' : ''}${monthly.percentageChange.toFixed(0)}% vs last mo.`
    : '';
  const actions = stats?.recentJobs?.length ? recentJobsToActions(stats.recentJobs) : [];

  return (
    <div className="space-y-6">
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/10 p-4 text-center text-sm text-amber-800 dark:text-amber-200">
          {error.message}
        </div>
      )}
      {/* KPI Section */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard 
          title="Est. Revenue" 
          value={revenueFormatted} 
          change={revenueChange || undefined} 
          icon="trending_up" 
          color="emerald" 
          onClick={() => onNavigate('billing')}
        />
        <KPICard 
          title="Total Jobs" 
          value={String(overall?.totalJobs ?? 0)} 
          change={monthly?.jobsChange != null ? `${monthly.jobsChange >= 0 ? '+' : ''}${monthly.jobsChange} this mo.` : undefined} 
          icon="local_shipping" 
          color="navy" 
          onClick={() => onNavigate('jobs')}
        />
        <KPICard 
          title="Active Staff" 
          value={String((Number(overall?.totalDispatchers ?? 0) + Number(overall?.totalDrivers ?? 0)) || 0)} 
          customContent={
            (overall?.totalDispatchers != null || overall?.totalDrivers != null) ? (
              <div className="flex items-end gap-3 mt-1">
                <div>
                  <p className="text-lg font-bold text-navy dark:text-white leading-none">{overall?.totalDispatchers ?? 0}</p>
                  <p className="text-[10px] text-slate-500 uppercase font-bold mt-1">Dispatch</p>
                </div>
                <div className="w-px h-6 bg-slate-200 dark:bg-slate-700"></div>
                <div>
                  <p className="text-lg font-bold text-navy dark:text-white leading-none">{overall?.totalDrivers ?? 0}</p>
                  <p className="text-[10px] text-slate-500 uppercase font-bold mt-1">Drivers</p>
                </div>
              </div>
            ) : undefined
          }
          icon="groups" 
          color="navy" 
          onClick={() => onNavigate('fleet')}
        />
        <KPICard 
          title="Pending Inv." 
          value={String(overall?.totalInvoices ?? 0)} 
          change="Action required" 
          icon="pending" 
          color="amber" 
          onClick={() => onNavigate('billing')}
        />
      </section>

      {/* Chart and Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Graph */}
        <section className="lg:col-span-2 bg-white dark:bg-navy-light rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-sm font-bold text-navy dark:text-white uppercase tracking-wider">Daily Volume</h2>
              <p className="text-xs text-slate-500 font-medium">Last 7 Days (Oct 18 - 24)</p>
            </div>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">TACTICAL DATA</span>
          </div>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={CHART_DATA} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }} 
                />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    border: 'none', 
                    borderRadius: '8px', 
                    fontSize: '12px',
                    color: '#fff' 
                  }}
                />
                <Bar dataKey="volume" radius={[4, 4, 0, 0]}>
                  {CHART_DATA.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.name === 'Fri' ? '#0df2aa' : '#1e293b'} 
                      opacity={0.8}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Latest Actions */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold text-navy dark:text-white uppercase tracking-wider">Latest Actions</h2>
            <button className="text-xs font-bold text-primary hover:underline">VIEW ALL</button>
          </div>
          <div className="bg-white dark:bg-navy-light rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 shadow-sm">
            {(actions.length ? actions : [{ id: '1', type: 'Job Created' as const, description: 'No recent activity', time: '—', refId: '—', color: 'slate' }]).map(action => (
              <div key={action.id} className="p-4 flex items-start gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-${action.color}-100 dark:border-${action.color}-900/30 bg-${action.color}-50 dark:bg-${action.color}-900/10 text-${action.color}-600`}>
                  <span className="material-symbols-outlined text-[18px]">
                    {action.type === 'Job Created' ? 'add_task' : action.type === 'Status Update' ? 'local_shipping' : 'description'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-navy dark:text-white truncate group-hover:text-primary transition-colors">{action.type}</p>
                    <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">{action.time}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-1 rounded">{action.refId}</span>
                    <span className="text-xs text-slate-500 truncate">{action.description}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <button 
            onClick={() => onNavigate('create-job')}
            className="w-full py-4 bg-navy dark:bg-white text-white dark:text-navy rounded-xl font-bold text-sm tracking-widest flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-navy/10"
          >
            <span className="material-symbols-outlined text-lg">add_circle</span>
            CREATE NEW JOB
          </button>
        </section>
      </div>
    </div>
  );
};

const KPICard: React.FC<{ title: string, value: string, change?: string, customContent?: React.ReactNode, icon: string, color: string, onClick: () => void }> = ({ title, value, change, customContent, icon, color, onClick }) => (
  <div 
    onClick={onClick}
    className="bg-white dark:bg-navy-light border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-primary/40 transition-all cursor-pointer group relative overflow-hidden"
  >
    <div className={`absolute top-0 right-0 w-12 h-12 bg-${color}-600/5 dark:bg-primary/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-125`}></div>
    <div className="flex items-center justify-between mb-3">
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{title}</span>
      <span className={`material-symbols-outlined text-${color === 'emerald' ? 'emerald-600' : color === 'amber' ? 'amber-600' : 'slate-500'} text-[18px]`}>{icon}</span>
    </div>
    <div>
      <p className="text-2xl font-black text-navy dark:text-white tracking-tight">{value}</p>
      {change && (
        <p className={`text-[11px] font-bold mt-1 flex items-center gap-0.5 ${color === 'emerald' ? 'text-emerald-600' : color === 'amber' ? 'text-amber-600' : 'text-slate-500'}`}>
          {color === 'emerald' && <span className="material-symbols-outlined text-[12px]">arrow_upward</span>}
          {change}
        </p>
      )}
      {customContent}
    </div>
  </div>
);

export default Dashboard;
