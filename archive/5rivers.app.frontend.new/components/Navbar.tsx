import React from 'react';
import { ViewType } from '../types';
import { useAuth } from '@/features/auth';

interface NavbarProps {
  currentView: ViewType;
  onMenuClick: () => void;
  onAssistantClick: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ currentView, onMenuClick, onAssistantClick }) => {
  const { logout } = useAuth();
  const getTitle = () => {
    switch (currentView) {
      case 'dashboard': return 'Dashboard';
      case 'jobs': return 'Jobs Hub';
      case 'fleet': return 'Fleet Index';
      case 'billing': return 'Invoice Center';
      case 'create-job': return 'New Job';
      case 'create-driver': return 'New Driver';
      case 'create-company': return 'New Company';
      case 'create-unit': return 'New Unit';
      default: return 'Command Center';
    }
  };

  return (
    <header className="h-16 bg-white dark:bg-navy-light border-b border-slate-200 dark:border-slate-800 px-4 md:px-8 flex items-center justify-between shrink-0 z-30">
      <div className="flex items-center gap-4">
        <button onClick={onMenuClick} className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg">
          <span className="material-symbols-outlined">menu</span>
        </button>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-primary/20 rounded-lg flex items-center justify-center text-primary border border-primary/30">
            <span className="material-symbols-outlined text-lg">local_shipping</span>
          </div>
          <h1 className="text-lg font-bold tracking-tight text-navy dark:text-white">{getTitle()}</h1>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button 
          onClick={onAssistantClick}
          className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 text-primary rounded-full hover:bg-primary/20 transition-all group"
        >
          <span className="material-symbols-outlined text-sm">smart_toy</span>
          <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">AI Assistant</span>
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
        </button>
        
        <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>

        <button
          onClick={logout}
          className="flex items-center gap-2 px-3 py-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-sm font-medium"
          title="Sign out"
        >
          <span className="material-symbols-outlined text-lg">logout</span>
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </header>
  );
};

export default Navbar;
