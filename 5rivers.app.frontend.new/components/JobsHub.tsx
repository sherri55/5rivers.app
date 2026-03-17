import React, { useState, useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { GET_JOBS } from '../lib/graphql/jobs';
import { mapJobNodeToUi } from '../lib/mapJobToUi';
import { JobStatus, Job } from '../types';

const PAGE_SIZE = 50;

const JobsHub: React.FC = () => {
  const [filter, setFilter] = useState<JobStatus | 'All'>('All');
  const [search, setSearch] = useState('');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const { data, loading, error } = useQuery(GET_JOBS, {
    variables: {
      pagination: { limit: PAGE_SIZE, offset: 0 },
    },
  });

  const jobs: Job[] = useMemo(() => {
    const nodes = data?.jobs?.nodes ?? [];
    return nodes.map((node: any) => mapJobNodeToUi(node));
  }, [data]);

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const matchesFilter = filter === 'All' || job.status === filter;
      const searchLower = search.toLowerCase().trim();
      const matchesSearch =
        !searchLower ||
        job.customer.toLowerCase().includes(searchLower) ||
        job.id.toLowerCase().includes(searchLower) ||
        job.origin.toLowerCase().includes(searchLower) ||
        job.destination.toLowerCase().includes(searchLower);
      return matchesFilter && matchesSearch;
    });
  }, [jobs, filter, search]);

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 p-6 text-center">
        <p className="text-red-700 dark:text-red-400 font-medium">Failed to load jobs</p>
        <p className="text-sm text-red-600 dark:text-red-500 mt-1">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-navy-light p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm sticky top-0 z-20">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
            <input 
              type="text" 
              placeholder="Search ID, customer, or city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-primary focus:border-primary"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar w-full md:w-auto pb-1 md:pb-0">
            {['All', JobStatus.RAISED, JobStatus.IN_TRANSIT, JobStatus.PENDING, JobStatus.COMPLETED].map(s => (
              <button
                key={s}
                onClick={() => setFilter(s as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                  filter === s 
                    ? 'bg-navy dark:bg-primary text-white dark:text-navy' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredJobs.map((job) => (
            <JobCard key={job.id} job={job} onClick={() => setSelectedJob(job)} />
          ))}
          {filteredJobs.length === 0 && (
            <div className="text-center py-20 bg-white dark:bg-navy-light rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
              <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">inventory_2</span>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">No jobs found</p>
            </div>
          )}
        </div>
      )}

      {selectedJob && (
        <JobDetailModal job={selectedJob} onClose={() => setSelectedJob(null)} />
      )}
    </div>
  );
};

const JobCard: React.FC<{ job: Job, onClick: () => void }> = ({ job, onClick }) => (
  <div 
    onClick={onClick}
    className="bg-white dark:bg-navy-light rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden group hover:border-primary/40 transition-all cursor-pointer p-4 md:p-6"
  >
    <div className="flex flex-col lg:flex-row lg:items-center gap-6">
      <div className="lg:w-48 shrink-0">
        <div className="flex items-center justify-between lg:block space-y-1">
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Job ID</span>
            <span className="font-mono text-sm font-bold text-navy dark:text-white group-hover:text-primary transition-colors truncate" title={job.id}>{job.id || '—'}</span>
          </div>
          <StatusPill status={job.status} />
        </div>
      </div>

      <div className="flex-1 flex items-center gap-4 min-w-0">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Origin</p>
          <p className="text-sm font-bold text-navy dark:text-white truncate" title={job.origin}>{job.origin || '—'}</p>
          <p className="text-[10px] text-slate-500 font-medium">{job.date}, {job.time}</p>
        </div>
        <div className="flex items-center text-slate-300 dark:text-slate-700 px-2 shrink-0">
          <span className="material-symbols-outlined text-2xl">trending_flat</span>
        </div>
        <div className="flex-1 min-w-0 text-right">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Destination</p>
          <p className="text-sm font-bold text-navy dark:text-white truncate" title={job.destination}>{job.destination || '—'}</p>
          <p className="text-[10px] text-slate-500 font-medium">ETA: Next Day</p>
        </div>
      </div>

      <div className="lg:w-64 flex items-center justify-between border-t lg:border-t-0 lg:border-l border-slate-100 dark:border-slate-800 pt-4 lg:pt-0 lg:pl-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className={`size-8 rounded-full flex items-center justify-center text-[10px] font-bold transition-all shrink-0 ${
            !job.driverName || job.driverName === 'Unassigned' 
              ? 'border-2 border-dashed border-slate-200 text-slate-400 bg-slate-50' 
              : 'bg-navy dark:bg-slate-800 text-primary border border-primary/20'
          }`}>
            {!job.driverName || job.driverName === 'Unassigned' ? '?' : (job.driverName || '').split(/\s+/).filter(Boolean).map(n => n[0]).join('').slice(0, 2) || '?'}
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-navy dark:text-white">{job.driverName}</span>
            <span className="text-[10px] font-mono text-slate-500">{job.unitId || 'UNIT-TBD'}</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className="text-lg font-black text-navy dark:text-white tracking-tighter">${Number(job.rate).toLocaleString()}</span>
        </div>
      </div>
    </div>
  </div>
);

const JobDetailModal: React.FC<{ job: Job, onClose: () => void }> = ({ job, onClose }) => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-navy/60 backdrop-blur-sm">
    <div className="bg-white dark:bg-navy-light w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-slide-up">
      <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="bg-primary/20 p-2 rounded-lg text-primary">
            <span className="material-symbols-outlined">assignment</span>
          </div>
          <h3 className="text-sm font-black uppercase tracking-widest text-navy dark:text-white">Job Dossier: {job.id}</h3>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <DetailStat label="Status" value={job.status} isStatus />
          <DetailStat label="Customer" value={job.customer} />
          <DetailStat label="Cargo Type" value="Refrigerated Goods" />
          <DetailStat label="Total Rate" value={`$${Number(job.rate).toLocaleString()}`} />
        </div>

        <div className="space-y-4">
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Route Progress</h4>
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-100 dark:bg-slate-800"></div>
            <div className="space-y-6">
              <TimelineItem label="Origin Pickup" sub={job.origin} time={job.time} completed />
              <TimelineItem label="En Route" sub="Checkpoint Alpha - Transit Hub" time="Active" current={job.status === JobStatus.IN_TRANSIT} />
              <TimelineItem label="Final Destination" sub={job.destination} time="ETA: Tomorrow" />
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-navy rounded-xl border border-slate-100 dark:border-slate-800">
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">Assigned Assets</h4>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-navy dark:text-white">
                {!job.driverName || job.driverName === 'Unassigned' ? '?' : (job.driverName || '?')[0]}
              </div>
              <div>
                <p className="text-xs font-bold text-navy dark:text-white">{job.driverName}</p>
                <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Driver License: DL-8823</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-navy dark:text-white">{job.unitId || 'Not Assigned'}</p>
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Plate: ABC-9921</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex gap-4">
        <button className="flex-1 py-3 border border-slate-200 dark:border-slate-700 text-slate-500 font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-slate-100 transition-all">
          Modify Job
        </button>
        <button className="flex-1 py-3 bg-navy text-white dark:bg-primary dark:text-navy rounded-xl font-bold text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg">
          Live Tracking
        </button>
      </div>
    </div>
  </div>
);

const DetailStat: React.FC<{ label: string, value: string, isStatus?: boolean }> = ({ label, value, isStatus }) => (
  <div className="bg-slate-50 dark:bg-navy p-3 rounded-xl border border-slate-100 dark:border-slate-800">
    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
    {isStatus ? <StatusPill status={value as JobStatus} /> : <p className="text-xs font-bold text-navy dark:text-white truncate">{value}</p>}
  </div>
);

const TimelineItem: React.FC<{ label: string, sub: string, time: string, completed?: boolean, current?: boolean }> = ({ label, sub, time, completed, current }) => (
  <div className="relative pl-10">
    <div className={`absolute left-2.5 -translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 ${
      completed ? 'bg-emerald-500 border-emerald-500' : 
      current ? 'bg-primary border-primary animate-pulse' : 
      'bg-white dark:bg-navy border-slate-200 dark:border-slate-800'
    } z-10`}></div>
    <div className="flex justify-between items-start">
      <div>
        <p className={`text-xs font-bold ${completed ? 'text-slate-500' : 'text-navy dark:text-white'}`}>{label}</p>
        <p className="text-[10px] text-slate-500 font-medium">{sub}</p>
      </div>
      <span className="text-[10px] font-bold text-slate-400 uppercase">{time}</span>
    </div>
  </div>
);

const StatusPill: React.FC<{ status: JobStatus }> = ({ status }) => {
  const styles = {
    [JobStatus.RAISED]: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50',
    [JobStatus.PENDING]: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50',
    [JobStatus.IN_TRANSIT]: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-primary dark:border-primary/20',
    [JobStatus.COMPLETED]: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${styles[status]}`}>
      {status}
    </span>
  );
};

export default JobsHub;
