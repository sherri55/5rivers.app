
import React, { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { XAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { GET_DRIVERS } from '../lib/graphql/fleet';
import { mapDriverNodeToUi } from '../lib/mapFleetToUi';

const CHART_DATA = [
  { name: 'Mon', volume: 40, revenue: 12000 },
  { name: 'Tue', volume: 30, revenue: 8500 },
  { name: 'Wed', volume: 75, revenue: 21000 },
  { name: 'Thu', volume: 25, revenue: 7000 },
  { name: 'Fri', volume: 85, revenue: 25000 },
  { name: 'Sat', volume: 15, revenue: 4000 },
  { name: 'Sun', volume: 10, revenue: 2500 },
];

const Reports: React.FC = () => {
  const { data, loading, error } = useQuery(GET_DRIVERS, {
    variables: { pagination: { limit: 50, offset: 0 } },
  });
  const drivers = useMemo(() => {
    const list = data?.drivers ?? [];
    return list.map((node: any) => mapDriverNodeToUi(node));
  }, [data]);
  const sortedByPerformance = useMemo(() => [...drivers].sort((a, b) => b.performance - a.performance), [drivers]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-navy dark:text-white">Business Intelligence</h2>
          <p className="text-sm text-slate-500">Growth and operational metrics for Q4 2023.</p>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 bg-white dark:bg-navy-light border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-500">Weekly</button>
          <button className="px-3 py-1.5 bg-navy text-white rounded-lg text-xs font-bold uppercase tracking-wider">Monthly</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white dark:bg-navy-light rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <div className="mb-6 flex justify-between items-start">
            <div>
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Revenue Trend</h3>
              <p className="text-2xl font-black text-navy dark:text-white tracking-tighter">$91,500.00</p>
            </div>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">+14.2%</span>
          </div>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={CHART_DATA}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0df2aa" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0df2aa" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} />
                <Tooltip />
                <Area type="monotone" dataKey="revenue" stroke="#0df2aa" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="bg-white dark:bg-navy-light rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-6">Efficiency Leaderboard</h3>
          {loading && <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" /></div>}
          {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error.message}</p>}
          <div className="space-y-6">
            {(sortedByPerformance.length ? sortedByPerformance : []).map(driver => (
              <div key={driver.id} className="space-y-2">
                <div className="flex justify-between items-end">
                  <div className="flex items-center gap-3">
                    <img src={driver.avatar} className="w-8 h-8 rounded-lg" alt="" />
                    <span className="text-sm font-bold text-navy dark:text-slate-200">{driver.name}</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-primary">{driver.performance}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-1000" 
                    style={{ width: `${driver.performance}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ReportMetric title="Avg. Rate / Mile" value="$2.84" change="+0.12" />
        <ReportMetric title="Deadhead Rate" value="12.5%" change="-2.1%" good={false} />
        <ReportMetric title="On-Time Delivery" value="98.2%" change="+1.4%" />
      </div>
    </div>
  );
};

const ReportMetric: React.FC<{ title: string, value: string, change: string, good?: boolean }> = ({ title, value, change, good = true }) => (
  <div className="bg-white dark:bg-navy-light p-4 rounded-xl border border-slate-200 dark:border-slate-800">
    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">{title}</p>
    <div className="flex items-end justify-between">
      <p className="text-2xl font-black text-navy dark:text-white tracking-tighter">{value}</p>
      <span className={`text-[10px] font-bold ${good ? 'text-emerald-600' : 'text-red-600'}`}>
        {change.startsWith('+') ? '↑' : '↓'} {change}
      </span>
    </div>
  </div>
);

export default Reports;
