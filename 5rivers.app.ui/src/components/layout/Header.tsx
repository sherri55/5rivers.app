import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/auth';
import { getInitials } from '@/lib/format';

// ============================================
// Header — top navigation bar
// ============================================

interface HeaderProps {
  onToggleSidebar: () => void;
}

export function Header({ onToggleSidebar }: HeaderProps) {
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showUserMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showUserMenu]);

  return (
    <header className="fixed top-0 w-full z-50 border-b border-slate-200/60 bg-white/80 backdrop-blur-md flex items-center justify-between px-6 h-16 text-sm tracking-tight">
      <div className="flex items-center gap-4">
        {/* Mobile hamburger */}
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-1.5 hover:bg-slate-50 rounded-full transition-colors"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>

        {/* Brand (mobile only — desktop shows in sidebar) */}
        <Link
          to="/dashboard"
          className="lg:hidden text-lg font-bold tracking-tighter text-blue-700"
        >
          5Rivers Trucking
        </Link>

      </div>

      <div className="flex items-center gap-4">
        {/* User menu */}
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setShowUserMenu((v) => !v)}
            className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center ring-1 ring-slate-200 text-xs font-bold text-blue-600 hover:ring-blue-300 transition-all"
          >
            {getInitials(user?.name ?? user?.email)}
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-12 w-56 bg-surface-container-lowest rounded-xl shadow-lg ghost-border py-2 animate-[scaleIn_0.1s_ease-out]">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-sm font-medium text-on-surface truncate">
                  {user?.name ?? user?.email}
                </p>
                <p className="text-[11px] text-slate-400 uppercase tracking-wider">
                  {user?.role}
                </p>
              </div>
              <Link
                to="/settings"
                onClick={() => setShowUserMenu(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <span className="material-symbols-outlined text-lg">settings</span>
                Settings
              </Link>
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  logout();
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-error hover:bg-error-container/20 transition-colors"
              >
                <span className="material-symbols-outlined text-lg">logout</span>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
