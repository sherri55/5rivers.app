import React, { useState } from 'react';
import { useMutation } from '@apollo/client';
import { CREATE_DRIVER } from '../lib/graphql/mutations';
import { GET_DRIVERS } from '../lib/graphql/fleet';

interface CreateDriverProps {
  onCancel: () => void;
  onSuccess?: () => void;
}

const CreateDriver: React.FC<CreateDriverProps> = ({ onCancel, onSuccess }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [hourlyRate, setHourlyRate] = useState<string>('0');
  const [address, setAddress] = useState('');

  const [createDriver, { loading, error }] = useMutation(CREATE_DRIVER, {
    refetchQueries: [{ query: GET_DRIVERS, variables: { pagination: { limit: 100, offset: 0 } } }],
    onCompleted: () => {
      onSuccess?.();
      onCancel();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName || !trimmedEmail) return;
    const rate = parseFloat(hourlyRate);
    createDriver({
      variables: {
        input: {
          name: trimmedName,
          email: trimmedEmail,
          phone: phone.trim() || undefined,
          hourlyRate: Number.isFinite(rate) ? rate : 0,
          description: address.trim() || undefined,
        },
      },
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-navy-light rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-slide-up">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-3">
          <span className="material-symbols-outlined text-primary">person_add</span>
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">Add New Fleet Driver</h2>
        </div>

        <div className="p-8 space-y-8">
          {error && (
            <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-300">
              {error.message}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Full Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                placeholder="Johnathan Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm font-bold text-navy dark:text-white focus:ring-primary focus:border-primary"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Email <span className="text-red-500">*</span></label>
              <input
                type="email"
                required
                placeholder="driver@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm font-bold text-navy dark:text-white focus:ring-primary focus:border-primary"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">License / ID</label>
              <input
                type="text"
                placeholder="DL-XXXX-XXXX"
                className="w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm font-bold font-mono text-navy dark:text-white focus:ring-primary focus:border-primary"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Mobile Phone</label>
              <input
                type="tel"
                placeholder="+1 (000) 000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm font-bold text-navy dark:text-white focus:ring-primary focus:border-primary"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Hourly Rate ($) <span className="text-red-500">*</span></label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                placeholder="0"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm font-bold text-navy dark:text-white focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Home Base Address</label>
            <textarea
              placeholder="Full address of driver headquarters..."
              rows={3}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm font-bold text-navy dark:text-white focus:ring-primary focus:border-primary"
            />
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
            disabled={loading || !name.trim() || !email.trim()}
            className="flex-[2] py-4 bg-navy dark:bg-primary text-white dark:text-navy font-black rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl uppercase tracking-widest text-xs disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? 'Onboarding…' : 'Onboard Driver'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateDriver;
