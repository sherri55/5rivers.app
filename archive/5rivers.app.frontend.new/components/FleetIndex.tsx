
import React, { useState, useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { FleetStatus, FleetUnit, Driver, ViewType } from '../types';
import { GET_UNITS, GET_DRIVERS } from '../lib/graphql/fleet';
import { mapUnitNodeToUi, mapDriverNodeToUi } from '../lib/mapFleetToUi';

const PAGE_SIZE = 100;

interface FleetIndexProps {
  onNavigate: (view: ViewType) => void;
}

const FleetIndex: React.FC<FleetIndexProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'Units' | 'Drivers'>('Units');
  const [selectedUnit, setSelectedUnit] = useState<FleetUnit | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

  const { data: unitsData, loading: unitsLoading, error: unitsError } = useQuery(GET_UNITS, {
    variables: { pagination: { limit: PAGE_SIZE, offset: 0 } },
  });
  const { data: driversData, loading: driversLoading, error: driversError } = useQuery(GET_DRIVERS, {
    variables: { pagination: { limit: PAGE_SIZE, offset: 0 } },
  });
  const units = useMemo(() => {
    const list = unitsData?.units ?? [];
    return list.map((node: any) => mapUnitNodeToUi(node));
  }, [unitsData]);
  const drivers = useMemo(() => {
    const list = driversData?.drivers ?? [];
    return list.map((node: any) => mapDriverNodeToUi(node));
  }, [driversData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="bg-white dark:bg-navy-light p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex max-w-sm">
          <button 
            onClick={() => setActiveTab('Units')}
            className={`flex-1 py-2 px-6 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${
              activeTab === 'Units' ? 'bg-navy dark:bg-primary text-white dark:text-navy shadow-md' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            Units
          </button>
          <button 
            onClick={() => setActiveTab('Drivers')}
            className={`flex-1 py-2 px-6 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${
              activeTab === 'Drivers' ? 'bg-navy dark:bg-primary text-white dark:text-navy shadow-md' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            Drivers
          </button>
        </div>
        
        <button 
          onClick={() => activeTab === 'Drivers' ? onNavigate('create-driver') : onNavigate('create-unit')}
          className="px-4 py-2 bg-navy dark:bg-primary text-white dark:text-navy rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">add</span> Add {activeTab === 'Units' ? 'Unit' : 'Driver'}
        </button>
      </div>

      {(unitsLoading || driversLoading) && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
        </div>
      )}
      {(unitsError || driversError) && (
        <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 p-4 text-center text-sm text-red-700 dark:text-red-400">
          {unitsError?.message ?? driversError?.message}
        </div>
      )}
      {activeTab === 'Units' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {units.map(unit => (
            <div key={unit.id} onClick={() => setSelectedUnit(unit)} className="bg-white dark:bg-navy-light p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-primary/40 transition-all cursor-pointer group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${unit.status === FleetStatus.MAINTENANCE ? 'bg-red-50 dark:bg-red-900/10 text-red-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                    <span className="material-symbols-outlined">{unit.status === FleetStatus.MAINTENANCE ? 'build' : 'local_shipping'}</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-navy dark:text-white group-hover:text-primary transition-colors">{unit.name}</h3>
                    <p className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-widest">{unit.plate} • {unit.model}</p>
                  </div>
                </div>
                <StatusDot status={unit.status} />
              </div>
              
              <div className="pt-3 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between">
                {unit.mileage ? (
                  <div className="flex gap-4">
                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase">
                      <span className="material-symbols-outlined text-sm">distance</span> {unit.mileage}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase">
                      <span className="material-symbols-outlined text-sm">oil_barrel</span> {unit.oil}
                    </span>
                  </div>
                ) : unit.issue ? (
                  <div className="flex items-center gap-1.5 text-red-600">
                    <span className="material-symbols-outlined text-sm">error</span>
                    <span className="text-[10px] font-bold uppercase tracking-tight truncate max-w-[120px]">{unit.issue}</span>
                  </div>
                ) : (
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Available</span>
                )}
                <span className="material-symbols-outlined text-slate-300 text-lg">chevron_right</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {drivers.map(driver => (
            <div key={driver.id} onClick={() => setSelectedDriver(driver)} className="bg-white dark:bg-navy-light p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-primary/40 transition-all cursor-pointer group">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img src={driver.avatar} alt={driver.name} className="w-12 h-12 rounded-full border border-slate-200 dark:border-slate-700 object-cover" />
                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-navy-light ${
                      driver.status === FleetStatus.AVAILABLE ? 'bg-emerald-500' : 'bg-blue-500'
                    }`}></div>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-navy dark:text-white group-hover:text-primary transition-colors">{driver.name}</h3>
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-mono text-slate-500 font-bold tracking-widest">{driver.license}</p>
                      <span className="text-[9px] font-bold text-primary bg-primary/10 px-1 rounded">{driver.performance}% EFF</span>
                    </div>
                  </div>
                </div>
                {driver.status === FleetStatus.IN_TRANSIT && (
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full uppercase tracking-widest border border-blue-100 dark:border-blue-900/30">
                    ON JOB
                  </span>
                )}
              </div>
              <div className="pt-3 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {driver.status === FleetStatus.AVAILABLE ? 'Available - Nearby' : `Job ${driver.currentJobId} • Active`}
                </p>
                <span className="material-symbols-outlined text-slate-300 text-lg">chevron_right</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedUnit && (
        <UnitDetailModal unit={selectedUnit} onClose={() => setSelectedUnit(null)} />
      )}
      {selectedDriver && (
        <DriverDetailModal driver={selectedDriver} onClose={() => setSelectedDriver(null)} />
      )}
    </div>
  );
};

const UnitDetailModal: React.FC<{ unit: FleetUnit, onClose: () => void }> = ({ unit, onClose }) => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-navy/60 backdrop-blur-sm">
    <div className="bg-white dark:bg-navy-light w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-slide-up">
      <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="bg-navy p-2 rounded-lg text-primary">
            <span className="material-symbols-outlined">local_shipping</span>
          </div>
          <h3 className="text-sm font-black uppercase tracking-widest text-navy dark:text-white">Unit Profile: {unit.plate}</h3>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-slate-50 dark:bg-navy rounded-xl border border-slate-100 dark:border-slate-800">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
            <StatusDot status={unit.status} />
          </div>
          <div className="text-center p-3 bg-slate-50 dark:bg-navy rounded-xl border border-slate-100 dark:border-slate-800">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Mileage</p>
            <p className="text-xs font-bold text-navy dark:text-white">{unit.mileage || 'N/A'}</p>
          </div>
          <div className="text-center p-3 bg-slate-50 dark:bg-navy rounded-xl border border-slate-100 dark:border-slate-800">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Oil Life</p>
            <p className="text-xs font-bold text-navy dark:text-white">{unit.oil || 'N/A'}</p>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Maintenance History</h4>
          {unit.history && unit.history.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
              {unit.history.map(record => (
                <div key={record.id} className="p-3 bg-white dark:bg-navy-light flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold text-navy dark:text-white">{record.type}</p>
                    <p className="text-[10px] text-slate-500">{record.date} • Tech: {record.technician}</p>
                  </div>
                  <span className="text-xs font-mono font-bold text-navy dark:text-white">${record.cost}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-slate-50 dark:bg-navy rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
              <span className="material-symbols-outlined text-slate-300">history_toggle_off</span>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">No recent maintenance</p>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
);

const DriverDetailModal: React.FC<{ driver: Driver, onClose: () => void }> = ({ driver, onClose }) => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-navy/60 backdrop-blur-sm">
    <div className="bg-white dark:bg-navy-light w-full max-w-sm rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slide-up">
      <div className="h-24 bg-navy-deep relative">
        <button onClick={onClose} className="absolute right-4 top-4 p-1 bg-white/10 hover:bg-white/20 text-white rounded-lg z-10">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>
      <div className="px-6 pb-6 -mt-12 relative">
        <div className="flex flex-col items-center text-center">
          <img src={driver.avatar} className="w-24 h-24 rounded-full border-4 border-white dark:border-navy-light shadow-lg object-cover mb-4" alt="" />
          <h3 className="text-xl font-black text-navy dark:text-white tracking-tight">{driver.name}</h3>
          <p className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest">{driver.license}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-8">
          <div className="p-4 bg-slate-50 dark:bg-navy rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Efficiency</p>
            <p className="text-2xl font-black text-primary tracking-tighter">{driver.performance}%</p>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-navy rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
            <p className="text-xs font-bold text-navy dark:text-white">{driver.status}</p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Current Assignment</h4>
          {driver.currentJobId ? (
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-navy dark:text-white">Active Job {driver.currentJobId}</p>
                <p className="text-[10px] text-slate-500">Scheduled: Oct 24, 2023</p>
              </div>
              <span className="material-symbols-outlined text-primary">local_shipping</span>
            </div>
          ) : (
            <div className="p-3 bg-slate-50 dark:bg-navy border border-slate-100 dark:border-slate-800 rounded-xl text-center">
              <p className="text-xs font-bold text-slate-400">Awaiting Assignment</p>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
);

const StatusDot: React.FC<{ status: FleetStatus }> = ({ status }) => (
  <div className={`w-2.5 h-2.5 rounded-full ${
    status === FleetStatus.ACTIVE || status === FleetStatus.AVAILABLE ? 'bg-emerald-600 shadow-[0_0_8px_rgba(5,150,105,0.4)]' :
    status === FleetStatus.MAINTENANCE ? 'bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.4)]' :
    'bg-amber-600 shadow-[0_0_8px_rgba(217,119,6,0.4)]'
  }`}></div>
);

export default FleetIndex;
