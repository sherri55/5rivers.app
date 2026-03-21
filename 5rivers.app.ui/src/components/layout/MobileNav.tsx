import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/cn';

// ============================================
// MobileNav — bottom tab bar (mobile only)
// ============================================

const tabs = [
  { label: 'Dashboard', icon: 'dashboard', path: '/dashboard' },
  { label: 'Jobs', icon: 'local_shipping', path: '/jobs' },
  { label: 'Units', icon: 'precision_manufacturing', path: '/units' },
  { label: 'More', icon: 'more_horiz', path: '/settings' },
];

export function MobileNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 w-full z-50 bg-white border-t border-slate-100 shadow-[0_-4px_12px_rgba(0,0,0,0.02)] flex justify-around items-center px-2 py-3 pb-safe">
      {tabs.map((tab) => (
        <NavLink
          key={tab.path}
          to={tab.path}
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center justify-center px-3 py-1 active:scale-95 transition-all',
              isActive
                ? 'text-blue-700 font-bold bg-blue-50/50 rounded-xl'
                : 'text-slate-400',
            )
          }
        >
          <span className="material-symbols-outlined mb-0.5">{tab.icon}</span>
          <span className="text-[11px] font-medium uppercase tracking-wider">
            {tab.label}
          </span>
        </NavLink>
      ))}
    </nav>
  );
}
