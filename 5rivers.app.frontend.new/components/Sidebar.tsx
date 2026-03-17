
import React from 'react';
import { ViewType } from '../types';

interface SidebarProps {
  activeView: ViewType;
  onNavigate: (view: ViewType) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, onNavigate }) => {
  const sections: { title: string; items: { id: ViewType; icon: string; label: string }[] }[] = [
    {
      title: 'Operations',
      items: [
        { id: 'dashboard', icon: 'space_dashboard', label: 'Dashboard' },
        { id: 'jobs', icon: 'local_shipping', label: 'Jobs Hub' },
        { id: 'fleet', icon: 'groups', label: 'Fleet Index' },
      ]
    },
    {
      title: 'Finance',
      items: [
        { id: 'billing', icon: 'receipt_long', label: 'Create Billing' },
        { id: 'invoices', icon: 'history_edu', label: 'Invoices' },
        { id: 'reports', icon: 'analytics', label: 'Analytics' },
      ]
    },
    {
      title: 'Management',
      items: [
        { id: 'companies', icon: 'corporate_fare', label: 'Companies' },
        { id: 'job-types', icon: 'category', label: 'Job Types' },
      ]
    }
  ];

  return (
    <aside className="w-64 h-full bg-navy-deep border-r border-slate-800 flex flex-col shrink-0">
      <div className="p-8 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="bg-primary p-2 rounded-xl shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined text-navy font-bold text-2xl">local_shipping</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight italic">5Rivers</h2>
        </div>
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-2 ml-1">Command Center</p>
      </div>

      <nav className="flex-1 p-4 space-y-6 overflow-y-auto no-scrollbar">
        {sections.map(section => (
          <div key={section.title} className="space-y-2">
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] px-4">{section.title}</p>
            {section.items.map(item => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all group ${
                  activeView === item.id 
                    ? 'bg-primary text-navy font-bold shadow-lg shadow-primary/10' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className={`material-symbols-outlined text-[20px] ${activeView === item.id ? 'fill-current' : ''}`}>
                  {item.icon}
                </span>
                <span className="text-sm tracking-tight whitespace-nowrap">{item.label}</span>
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live Feed</span>
          </div>
          <p className="text-[10px] text-slate-500 font-mono tracking-tight">v2.4.0 • 5 Active Jobs</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
