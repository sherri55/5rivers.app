import React, { useState } from 'react';
import { useMutation } from '@apollo/client';
import { CREATE_UNIT } from '../lib/graphql/mutations';
import { GET_UNITS } from '../lib/graphql/fleet';

interface CreateUnitProps {
  onCancel: () => void;
  onSuccess?: () => void;
}

const CreateUnit: React.FC<CreateUnitProps> = ({ onCancel, onSuccess }) => {
  const [name, setName] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [description, setDescription] = useState('');
  const [vin, setVin] = useState('');

  const [createUnit, { loading, error }] = useMutation(CREATE_UNIT, {
    refetchQueries: [{ query: GET_UNITS, variables: { pagination: { limit: 100, offset: 0 } } }],
    onCompleted: () => {
      onSuccess?.();
      onCancel();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createUnit({
      variables: {
        input: {
          name: name.trim(),
          plateNumber: plateNumber.trim() || undefined,
          description: description.trim() || undefined,
          vin: vin.trim() || undefined,
        },
      },
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-navy-light rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-slide-up">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-3">
          <span className="material-symbols-outlined text-primary">local_shipping</span>
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">Add New Unit</h2>
        </div>

        <div className="p-8 space-y-8">
          {error && (
            <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-300">
              {error.message}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Unit Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                placeholder="e.g. Freightliner Cascadia"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm font-bold text-navy dark:text-white focus:ring-primary focus:border-primary"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Plate Number</label>
              <input
                type="text"
                placeholder="ABC-1234"
                value={plateNumber}
                onChange={(e) => setPlateNumber(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm font-bold font-mono text-navy dark:text-white focus:ring-primary focus:border-primary"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">VIN</label>
              <input
                type="text"
                placeholder="Optional"
                value={vin}
                onChange={(e) => setVin(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm font-bold font-mono text-navy dark:text-white focus:ring-primary focus:border-primary"
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Description / Model</label>
              <input
                type="text"
                placeholder="e.g. 2023 model"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm font-bold text-navy dark:text-white focus:ring-primary focus:border-primary"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-4 p-8 pt-0">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-4 bg-white dark:bg-navy-light border border-slate-200 dark:border-slate-800 text-slate-500 font-bold rounded-xl hover:bg-slate-50 transition-all uppercase tracking-widest text-xs"
          >
            Discard
          </button>
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="flex-[2] py-4 bg-navy dark:bg-primary text-white dark:text-navy font-black rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl uppercase tracking-widest text-xs disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? 'Adding…' : 'Add Unit'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateUnit;
