import React, { useState, useMemo } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { CREATE_JOB } from '../lib/graphql/mutations';
import { GET_JOBS } from '../lib/graphql/jobs';
import { GET_DASHBOARD_STATS } from '../lib/graphql/dashboard';
import { GET_COMPANIES } from '../lib/graphql/companies';
import { GET_JOB_TYPES } from '../lib/graphql/jobTypes';
import { GET_DRIVERS, GET_UNITS } from '../lib/graphql/fleet';
import { GET_DISPATCHERS } from '../lib/graphql/dispatchers';

const PAGINATION = { limit: 200, offset: 0 };

interface CreateJobProps {
  onCancel: () => void;
  onSuccess?: () => void;
}

const CreateJob: React.FC<CreateJobProps> = ({ onCancel, onSuccess }) => {
  const [companyId, setCompanyId] = useState('');
  const [jobTypeId, setJobTypeId] = useState('');
  const [jobDate, setJobDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [driverId, setDriverId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [dispatcherId, setDispatcherId] = useState('');
  const [invoiceStatus, setInvoiceStatus] = useState('pending');
  const [driverPaid, setDriverPaid] = useState(false);

  const { data: companiesData } = useQuery(GET_COMPANIES, { variables: { pagination: PAGINATION } });
  const { data: jobTypesData } = useQuery(GET_JOB_TYPES, { variables: { pagination: PAGINATION } });
  const { data: driversData } = useQuery(GET_DRIVERS, { variables: { pagination: PAGINATION } });
  const { data: unitsData } = useQuery(GET_UNITS, { variables: { pagination: PAGINATION } });
  const { data: dispatchersData } = useQuery(GET_DISPATCHERS, { variables: { pagination: PAGINATION } });

  const companies = companiesData?.companies?.nodes ?? [];
  const allJobTypes = jobTypesData?.jobTypes ?? [];
  const jobTypes = useMemo(() => {
    if (!companyId) return allJobTypes;
    return allJobTypes.filter((jt: any) => jt.company?.id === companyId);
  }, [companyId, allJobTypes]);
  const drivers = driversData?.drivers ?? [];
  const units = unitsData?.units ?? [];
  const dispatchers = dispatchersData?.dispatchers ?? [];

  const [createJob, { loading, error }] = useMutation(CREATE_JOB, {
    refetchQueries: [
      { query: GET_JOBS, variables: { pagination: { limit: 50, offset: 0 } } },
      { query: GET_DASHBOARD_STATS },
    ],
    onCompleted: () => {
      onSuccess?.();
      onCancel();
    },
  });

  const selectedJobType = useMemo(() => allJobTypes.find((jt: any) => jt.id === jobTypeId), [allJobTypes, jobTypeId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobTypeId || !jobDate.trim()) return;
    createJob({
      variables: {
        input: {
          jobDate: jobDate.trim(),
          startTime: startTime.trim() || undefined,
          endTime: endTime.trim() || undefined,
          jobTypeId: jobTypeId || undefined,
          driverId: driverId || undefined,
          unitId: unitId || undefined,
          dispatcherId: dispatcherId || undefined,
          invoiceStatus: invoiceStatus || 'pending',
          driverPaid: !!driverPaid,
        },
      },
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <form onSubmit={handleSubmit}>
        <div className="bg-white dark:bg-navy-light rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">local_shipping</span>
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">Section 01: Logistics</h2>
          </div>

          <div className="p-6 space-y-6">
            {error && (
              <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-300">
                {error.message}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Company (filter job types)</label>
              <select
                value={companyId}
                onChange={(e) => {
                  setCompanyId(e.target.value);
                  setJobTypeId('');
                }}
                className="w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-4 pr-10 text-sm font-bold text-navy dark:text-white appearance-none focus:ring-primary focus:border-primary"
              >
                <option value="">All companies</option>
                {companies.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Job Type / Route <span className="text-red-500">*</span></label>
              <select
                required
                value={jobTypeId}
                onChange={(e) => setJobTypeId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-4 pr-10 text-sm font-bold text-navy dark:text-white appearance-none focus:ring-primary focus:border-primary"
              >
                <option value="">Select job type</option>
                {jobTypes.map((jt: any) => (
                  <option key={jt.id} value={jt.id}>
                    {jt.company?.name ? `${jt.company.name} – ` : ''}{jt.title}
                    {jt.startLocation || jt.endLocation ? ` (${jt.startLocation || '?'} → ${jt.endLocation || '?'})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Job Date <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  required
                  value={jobDate}
                  onChange={(e) => setJobDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm font-bold text-navy dark:text-white focus:ring-primary focus:border-primary"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Start Time</label>
                <input
                  type="text"
                  placeholder="08:00"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm font-bold text-navy dark:text-white focus:ring-primary focus:border-primary"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500">End Time</label>
                <input
                  type="text"
                  placeholder="17:00"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm font-bold text-navy dark:text-white focus:ring-primary focus:border-primary"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-white dark:bg-navy-light rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">badge</span>
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">Section 02: Assignment</h2>
          </div>
          <div className="p-6 space-y-6">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Driver</label>
              <select
                value={driverId}
                onChange={(e) => setDriverId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-4 pr-10 text-sm font-bold text-navy dark:text-white appearance-none focus:ring-primary focus:border-primary"
              >
                <option value="">Unassigned</option>
                {drivers.map((d: any) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Unit</label>
              <select
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-4 pr-10 text-sm font-bold text-navy dark:text-white appearance-none focus:ring-primary focus:border-primary"
              >
                <option value="">None</option>
                {units.map((u: any) => (
                  <option key={u.id} value={u.id}>{u.name} {u.plateNumber ? `(${u.plateNumber})` : ''}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Dispatcher</label>
              <select
                value={dispatcherId}
                onChange={(e) => setDispatcherId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-4 pr-10 text-sm font-bold text-navy dark:text-white appearance-none focus:ring-primary focus:border-primary"
              >
                <option value="">None</option>
                {dispatchers.map((d: any) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Invoice Status</label>
                <select
                  value={invoiceStatus}
                  onChange={(e) => setInvoiceStatus(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-4 pr-10 text-sm font-bold text-navy dark:text-white appearance-none focus:ring-primary focus:border-primary"
                >
                  <option value="pending">Pending</option>
                  <option value="raised">Raised</option>
                  <option value="invoiced">Invoiced</option>
                  <option value="sent">Sent</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
              <div className="flex items-center gap-3 pt-8">
                <input
                  type="checkbox"
                  id="driverPaid"
                  checked={driverPaid}
                  onChange={(e) => setDriverPaid(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                />
                <label htmlFor="driverPaid" className="text-sm font-bold text-navy dark:text-white">Driver paid</label>
              </div>
            </div>
          </div>
        </div>

        {selectedJobType && (
          <div className="mt-6 bg-navy dark:bg-navy-deep rounded-2xl p-8 border border-white/10 shadow-2xl flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Estimated rate (from job type)</p>
              <p className="text-xs text-slate-400">Rate of job: ${Number(selectedJobType.rateOfJob).toFixed(2)}</p>
            </div>
            <div className="text-center md:text-right">
              <p className="text-2xl font-black text-white tracking-tighter leading-none">${Number(selectedJobType.rateOfJob || 0).toLocaleString()}</p>
              <p className="text-[10px] font-mono text-primary font-bold uppercase tracking-widest">Final amount calculated on save</p>
            </div>
          </div>
        )}

        <div className="flex gap-4 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-4 bg-white dark:bg-navy-light border border-slate-200 dark:border-slate-800 text-navy dark:text-white font-bold rounded-xl hover:bg-slate-50 transition-all uppercase tracking-widest text-xs"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !jobTypeId || !jobDate.trim()}
            className="flex-[2] py-4 bg-primary text-navy font-black rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-primary/20 uppercase tracking-widest text-xs flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? 'Creating…' : 'Create Job'}
            <span className="material-symbols-outlined text-lg">arrow_forward</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateJob;
