
import React, { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { ViewType } from '../types';
import { GET_COMPANIES } from '../lib/graphql/companies';
import { mapCompanyNodeToUi } from '../lib/mapCompanyToUi';

interface CompaniesProps {
  onNavigate: (view: ViewType) => void;
}

const PAGE_SIZE = 100;

const Companies: React.FC<CompaniesProps> = ({ onNavigate }) => {
  const { data, loading, error } = useQuery(GET_COMPANIES, {
    variables: { pagination: { limit: PAGE_SIZE, offset: 0 } },
  });
  const companies = useMemo(() => {
    const nodes = data?.companies?.nodes ?? [];
    return nodes.map((node: any) => mapCompanyNodeToUi(node));
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-navy dark:text-white">Customer Directory</h2>
          <p className="text-sm text-slate-500">Manage billing entities and contact points.</p>
        </div>
        <button 
          onClick={() => onNavigate('create-company')}
          className="px-4 py-2 bg-navy dark:bg-primary text-white dark:text-navy rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">add_business</span> Add Company
        </button>
      </div>

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
      <div className="bg-white dark:bg-navy-light rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Company ID</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Name</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Primary Contact</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Email</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Status</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {companies.map(company => (
              <tr key={company.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer">
                <td className="px-6 py-4">
                  <span className="font-mono text-sm font-bold text-navy dark:text-white">{company.id}</span>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm font-bold text-navy dark:text-white">{company.name}</p>
                  <p className="text-[10px] text-slate-500">{company.address}</p>
                </td>
                <td className="px-6 py-4 text-xs font-medium text-slate-700 dark:text-slate-300">{company.contact}</td>
                <td className="px-6 py-4 text-xs text-slate-500">{company.email}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                    company.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'
                  }`}>
                    {company.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-slate-300 hover:text-primary transition-colors">
                    <span className="material-symbols-outlined">edit</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Companies;
