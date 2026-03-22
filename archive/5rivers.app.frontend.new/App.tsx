
import React, { useState } from 'react';
import { ViewType } from './types';
import { ErrorBoundary } from './components/ErrorBoundary';
import Dashboard from './components/Dashboard';
import JobsHub from './components/JobsHub';
import FleetIndex from './components/FleetIndex';
import Billing from './components/Billing';
import Invoices from './components/Invoices';
import Reports from './components/Reports';
import Companies from './components/Companies';
import JobTypes from './components/JobTypes';
import CreateJob from './components/CreateJob';
import CreateDriver from './components/CreateDriver';
import CreateCompany from './components/CreateCompany';
import CreateUnit from './components/CreateUnit';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Assistant from './components/Assistant';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard onNavigate={setCurrentView} />;
      case 'jobs': return <JobsHub />;
      case 'fleet': return <FleetIndex onNavigate={setCurrentView} />;
      case 'billing': return <Billing />;
      case 'invoices': return <Invoices />;
      case 'reports': return <Reports />;
      case 'companies': return <Companies onNavigate={setCurrentView} />;
      case 'job-types': return <JobTypes />;
      case 'create-job': return <CreateJob onCancel={() => setCurrentView('jobs')} />;
      case 'create-driver': return <CreateDriver onCancel={() => setCurrentView('fleet')} />;
      case 'create-company': return <CreateCompany onCancel={() => setCurrentView('companies')} />;
      case 'create-unit': return <CreateUnit onCancel={() => setCurrentView('fleet')} />;
      default: return <Dashboard onNavigate={setCurrentView} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-navy transition-colors duration-200 overflow-hidden">
      <div className="hidden md:block">
        <Sidebar activeView={currentView} onNavigate={setCurrentView} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar 
          currentView={currentView} 
          onMenuClick={() => setIsSidebarOpen(true)}
          onAssistantClick={() => setIsAssistantOpen(true)}
        />
        
        <main className="flex-1 overflow-y-auto no-scrollbar pb-24 md:pb-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="animate-slide-up">
              <ErrorBoundary>{renderView()}</ErrorBoundary>
            </div>
          </div>
        </main>

        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-navy-light border-t border-slate-200 dark:border-slate-800 px-6 py-3 z-40 flex justify-between items-center shadow-lg">
          <MobileNavButton icon="dashboard" label="Dash" active={currentView === 'dashboard'} onClick={() => setCurrentView('dashboard')} />
          <MobileNavButton icon="local_shipping" label="Jobs" active={currentView === 'jobs'} onClick={() => setCurrentView('jobs')} />
          <div className="relative -top-6">
            <button onClick={() => setCurrentView('create-job')} className="w-14 h-14 bg-navy dark:bg-primary text-white dark:text-navy rounded-full shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform">
              <span className="material-symbols-outlined text-3xl font-bold">add</span>
            </button>
          </div>
          <MobileNavButton icon="groups" label="Fleet" active={currentView === 'fleet'} onClick={() => setCurrentView('fleet')} />
          <MobileNavButton icon="history_edu" label="Bills" active={currentView === 'invoices'} onClick={() => setCurrentView('invoices')} />
        </div>
      </div>

      {isAssistantOpen && (
        <Assistant onClose={() => setIsAssistantOpen(false)} onAction={setCurrentView} />
      )}
    </div>
  );
};

const MobileNavButton: React.FC<{ icon: string, label: string, active: boolean, onClick: () => void }> = ({ icon, label, active, onClick }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 ${active ? 'text-primary' : 'text-slate-400'}`}>
    <span className={`material-symbols-outlined ${active ? 'fill-current' : ''}`}>{icon}</span>
    <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
  </button>
);

export default App;
