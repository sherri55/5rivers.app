import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { useAuth } from '@/context/auth';

// ============================================
// Sidebar — main navigation (desktop)
// ============================================

interface NavItem {
  label: string;
  icon: string;
  path: string;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: 'dashboard', path: '/dashboard' },
  { label: 'Jobs', icon: 'local_shipping', path: '/jobs' },
  { label: 'Drivers', icon: 'person', path: '/drivers' },
  { label: 'Units', icon: 'precision_manufacturing', path: '/units' },
  { label: 'Companies', icon: 'business', path: '/companies' },
  { label: 'Dispatchers', icon: 'support_agent', path: '/dispatchers' },
  { label: 'Carriers', icon: 'conveyor_belt', path: '/carriers' },
  { label: 'Invoices', icon: 'receipt_long', path: '/invoices' },
  { label: 'Expenses', icon: 'account_balance', path: '/expenses' },
  { label: 'Reports', icon: 'analytics', path: '/reports' },
];

const bottomItems: NavItem[] = [
  { label: 'Settings', icon: 'settings', path: '/settings' },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { logout } = useAuth();

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 bg-on-surface/30 backdrop-blur-sm z-40"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 h-screen w-64 bg-slate-50 border-r border-slate-100',
          'flex flex-col py-6 px-4 gap-2 pt-20 z-40',
          'transition-transform duration-300 ease-in-out',
          // Desktop: always visible. Mobile: slide in/out
          'lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Branding */}
        <div className="mb-6 px-2">
          <h2 className="text-xl font-black text-blue-700 uppercase tracking-widest">
            5Rivers
          </h2>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
            Fleet Operations
          </p>
        </div>

        {/* Main nav */}
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-[13px]',
                  'transition-all duration-200 hover:translate-x-1',
                  isActive
                    ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-200'
                    : 'text-slate-500 hover:bg-slate-100',
                )
              }
            >
              <span className="material-symbols-outlined text-[20px]">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Bottom section */}
        <div className="mt-auto border-t border-slate-100 pt-4 space-y-1">
          {bottomItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-[13px]',
                  'transition-all duration-200 hover:translate-x-1',
                  isActive
                    ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-200'
                    : 'text-slate-500 hover:bg-slate-100',
                )
              }
            >
              <span className="material-symbols-outlined text-[20px]">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </NavLink>
          ))}
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium text-slate-500 hover:text-error hover:bg-error-container/20 transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
