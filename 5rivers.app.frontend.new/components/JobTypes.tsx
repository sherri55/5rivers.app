import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation } from '@apollo/client';
import { GET_JOB_TYPES } from '../lib/graphql/jobTypes';
import { GET_COMPANIES } from '../lib/graphql/companies';
import { CREATE_JOB_TYPE } from '../lib/graphql/mutations';
import { mapJobTypeNodeToUi } from '../lib/mapJobTypeToUi';

const DISPATCH_TYPES = [
  { value: 'Load', label: 'Load' },
  { value: 'Tonnage', label: 'Tonnage' },
  { value: 'Hourly', label: 'Hourly' },
];

const JobTypes: React.FC = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { data, loading, error } = useQuery(GET_JOB_TYPES, {
    variables: { pagination: { limit: 100, offset: 0 } },
  });
  const { data: companiesData } = useQuery(GET_COMPANIES, {
    variables: { pagination: { limit: 200, offset: 0 } },
  });
  const jobTypes = useMemo(() => {
    const list = data?.jobTypes ?? [];
    return list.map((node: any) => mapJobTypeNodeToUi(node));
  }, [data]);
  const companies = companiesData?.companies?.nodes ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-navy dark:text-white">Job Categorization</h2>
          <p className="text-sm text-slate-500">Manage base rates and specifications for different transport types.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-navy dark:bg-primary text-white dark:text-navy rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:opacity-90"
        >
          <span className="material-symbols-outlined text-sm">add</span> New Category
        </button>
      </div>

      {showCreateModal && createPortal(
        <CreateJobTypeModal
          companies={companies}
          dispatchTypes={DISPATCH_TYPES}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => setShowCreateModal(false)}
        />,
        document.body
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 p-4 text-center text-sm text-red-700 dark:text-red-400">
          {error.message}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {jobTypes.map(type => (
          <div key={type.id} className="bg-white dark:bg-navy-light p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-primary/40 transition-all cursor-pointer group">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 group-hover:text-primary transition-colors">
                  <span className="material-symbols-outlined text-2xl">{type.icon}</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-navy dark:text-white">{type.name}</h3>
                  <p className="text-xs text-slate-500 font-medium">Standard Class B-1</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Base Rate</p>
                <p className="text-lg font-black text-navy dark:text-white">${type.baseRate.toFixed(2)}/mi</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {type.description}
            </p>
            <div className="mt-6 pt-6 border-t border-slate-50 dark:border-slate-800 flex justify-between items-center">
              <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-50 dark:bg-slate-900 px-2 py-1 rounded">{type.id}</span>
              <button className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                Edit Config <span className="material-symbols-outlined text-sm">settings</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface CreateJobTypeModalProps {
  companies: Array<{ id: string; name: string }>;
  dispatchTypes: Array<{ value: string; label: string }>;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateJobTypeModal: React.FC<CreateJobTypeModalProps> = ({ companies, dispatchTypes, onClose, onSuccess }) => {
  const [title, setTitle] = useState('');
  const [startLocation, setStartLocation] = useState('');
  const [endLocation, setEndLocation] = useState('');
  const [dispatchType, setDispatchType] = useState(dispatchTypes[0]?.value ?? 'Load');
  const [rateOfJob, setRateOfJob] = useState('');
  const [companyId, setCompanyId] = useState('');

  const [createJobType, { loading, error }] = useMutation(CREATE_JOB_TYPE, {
    refetchQueries: [{ query: GET_JOB_TYPES, variables: { pagination: { limit: 100, offset: 0 } } }],
    onCompleted: () => {
      onSuccess();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    const rate = parseFloat(rateOfJob);
    createJobType({
      variables: {
        input: {
          title: trimmedTitle,
          startLocation: startLocation.trim() || undefined,
          endLocation: endLocation.trim() || undefined,
          dispatchType: dispatchType || 'Load',
          rateOfJob: Number.isFinite(rate) ? rate : 0,
          companyId: companyId || undefined,
        },
      },
    });
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="create-job-type-title">
      <div className="bg-white dark:bg-navy-light w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-slide-up border border-slate-200 dark:border-slate-700">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-100 dark:bg-slate-900">
          <h3 id="create-job-type-title" className="text-sm font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">New Job Category</h3>
          <button type="button" onClick={onClose} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form id="create-job-type-form" onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-300">
              {error.message}
            </div>
          )}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Title <span className="text-red-500">*</span></label>
            <input
              type="text"
              required
              placeholder="e.g. Refrigerated (Reefer)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 text-sm font-bold text-navy dark:text-white focus:ring-primary focus:border-primary"
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Company</label>
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="mt-1 w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 text-sm font-bold text-navy dark:text-white focus:ring-primary focus:border-primary"
            >
              <option value="">None</option>
              {companies.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Origin</label>
              <input
                type="text"
                placeholder="Start location"
                value={startLocation}
                onChange={(e) => setStartLocation(e.target.value)}
                className="mt-1 w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 text-sm font-bold text-navy dark:text-white focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Destination</label>
              <input
                type="text"
                placeholder="End location"
                value={endLocation}
                onChange={(e) => setEndLocation(e.target.value)}
                className="mt-1 w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 text-sm font-bold text-navy dark:text-white focus:ring-primary focus:border-primary"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Dispatch Type <span className="text-red-500">*</span></label>
              <select
                value={dispatchType}
                onChange={(e) => setDispatchType(e.target.value)}
                className="mt-1 w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 text-sm font-bold text-navy dark:text-white focus:ring-primary focus:border-primary"
              >
                {dispatchTypes.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Rate ($) <span className="text-red-500">*</span></label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                placeholder="0"
                value={rateOfJob}
                onChange={(e) => setRateOfJob(e.target.value)}
                className="mt-1 w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 text-sm font-bold text-navy dark:text-white focus:ring-primary focus:border-primary"
              />
            </div>
          </div>
        </form>
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex gap-3 justify-end bg-slate-100 dark:bg-slate-900">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold rounded-lg text-xs uppercase tracking-wider hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="create-job-type-form"
            disabled={loading || !title.trim()}
            className="px-4 py-2 bg-navy dark:bg-primary text-white dark:text-navy font-bold rounded-lg text-xs uppercase tracking-wider hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Creating…' : 'Create Category'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default JobTypes;
