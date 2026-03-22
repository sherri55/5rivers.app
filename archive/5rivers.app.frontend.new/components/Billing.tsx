
import React, { useState, useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { JobStatus } from '../types';
import { GET_JOBS } from '../lib/graphql/jobs';
import { mapJobNodeToUi } from '../lib/mapJobToUi';

const Billing: React.FC = () => {
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const { data, loading, error } = useQuery(GET_JOBS, {
    variables: { pagination: { limit: 200, offset: 0 } },
  });
  const jobs = useMemo(() => {
    const nodes = data?.jobs?.nodes ?? [];
    return nodes.map((node: any) => mapJobNodeToUi(node));
  }, [data]);
  const completedJobs = jobs.filter(j => j.status === JobStatus.COMPLETED);

  const toggleJob = (id: string) => {
    setSelectedJobs(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const totalSelected = jobs.filter(j => selectedJobs.includes(j.id)).reduce((acc, j) => acc + j.rate, 0);

  const handleGenerateInvoices = () => {
    setIsProcessing(true);
    // Simulate API call
    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setSelectedJobs([]);
      }, 3000);
    }, 2000);
  };

  return (
    <div className="space-y-6">
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 p-4 text-center text-sm text-red-700 dark:text-red-400">
          {error.message}
        </div>
      )}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-navy dark:text-white">New Invoice Batch</h2>
          <p className="text-sm text-slate-500 font-medium">Select completed jobs to generate professional invoices.</p>
        </div>
        <button 
          onClick={() => setSelectedJobs(completedJobs.map(j => j.id))}
          className="text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-all uppercase tracking-widest"
        >
          Select All
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 pb-32">
        {completedJobs.map(job => (
          <div 
            key={job.id} 
            onClick={() => toggleJob(job.id)}
            className={`p-4 rounded-xl border transition-all cursor-pointer flex gap-4 ${
              selectedJobs.includes(job.id) 
                ? 'bg-primary/5 border-primary shadow-md' 
                : 'bg-white dark:bg-navy-light border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="pt-1">
              <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                selectedJobs.includes(job.id) ? 'bg-navy border-navy text-primary' : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'
              }`}>
                {selectedJobs.includes(job.id) && <span className="material-symbols-outlined text-sm font-bold">check</span>}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded tracking-widest">{job.id}</span>
                  <span className="text-xs font-bold text-navy dark:text-white">{job.customer}</span>
                </div>
                <span className="font-mono text-sm font-black text-navy dark:text-white tracking-tighter">${job.rate.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                <span className="truncate">{job.origin}</span>
                <span className="material-symbols-outlined text-[14px]">trending_flat</span>
                <span className="truncate font-bold text-navy dark:text-slate-300">{job.destination}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className={`fixed bottom-24 left-4 right-4 md:left-auto md:right-8 md:bottom-8 lg:w-96 bg-navy dark:bg-navy-deep p-6 rounded-2xl shadow-2xl border border-white/10 transition-all transform z-40 ${
        selectedJobs.length > 0 ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'
      }`}>
        <div className="flex justify-between items-end mb-4">
          <div>
            <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] mb-1">Selected: {selectedJobs.length} Jobs</p>
            <p className="text-2xl font-black text-white tracking-tighter">${totalSelected.toLocaleString()}.00</p>
          </div>
          <div className="flex gap-2">
            {selectedJobs.slice(0, 3).map(id => (
              <span key={id} className="text-[9px] font-mono font-bold bg-white/10 text-slate-400 px-1 rounded uppercase">{id.slice(1)}</span>
            ))}
            {selectedJobs.length > 3 && <span className="text-[9px] font-bold text-slate-500">+{selectedJobs.length - 3}</span>}
          </div>
        </div>
        <button 
          onClick={handleGenerateInvoices}
          disabled={isProcessing}
          className="w-full py-4 bg-primary text-navy font-black text-sm uppercase tracking-[0.1em] rounded-xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-primary/20"
        >
          {isProcessing ? (
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined animate-spin">refresh</span>
              PROCESSING BATCH
            </div>
          ) : (
            <>
              <span className="material-symbols-outlined">description</span>
              Generate Invoice Batch
            </>
          )}
        </button>
      </div>

      {isSuccess && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-navy/80 backdrop-blur-md">
          <div className="bg-white dark:bg-navy-light p-8 rounded-2xl shadow-2xl text-center max-w-sm w-full animate-slide-up border border-primary/20">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center text-primary mx-auto mb-4">
              <span className="material-symbols-outlined text-4xl">check_circle</span>
            </div>
            <h3 className="text-xl font-black text-navy dark:text-white mb-2 tracking-tight">Batch Generated</h3>
            <p className="text-sm text-slate-500">Invoices INV-{Math.floor(Math.random() * 1000)} to INV-{Math.floor(Math.random() * 1000)} have been created and moved to the Invoices archive.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Billing;
