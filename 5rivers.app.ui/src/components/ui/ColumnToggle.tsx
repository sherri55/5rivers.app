import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/cn';
import type { ColumnDef } from '@/hooks/useColumnVisibility';

interface ColumnToggleProps {
  columns: ColumnDef[];
  isVisible: (key: string) => boolean;
  onToggle: (key: string) => void;
}

export function ColumnToggle({ columns, isVisible, onToggle }: ColumnToggleProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const toggleable = columns.filter((c) => !c.alwaysVisible);
  const hiddenCount = toggleable.filter((c) => !isVisible(c.key)).length;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ghost-border',
          open
            ? 'bg-primary/10 text-primary'
            : 'bg-surface-container-low text-slate-600 hover:text-slate-800',
        )}
      >
        <span className="material-symbols-outlined text-sm">view_column</span>
        Columns
        {hiddenCount > 0 && (
          <span className="bg-primary text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {hiddenCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-surface-container-lowest rounded-xl shadow-lg ghost-border py-2 z-50 animate-[scaleIn_0.1s_ease-out]">
          <div className="px-3 py-1.5 border-b border-slate-100">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Toggle Columns
            </span>
          </div>
          {toggleable.map((col) => {
            const visible = isVisible(col.key);
            return (
              <button
                key={col.key}
                onClick={() => onToggle(col.key)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-slate-50 transition-colors"
              >
                <span
                  className={cn(
                    'material-symbols-outlined text-base',
                    visible ? 'text-primary filled' : 'text-slate-300',
                  )}
                >
                  {visible ? 'check_box' : 'check_box_outline_blank'}
                </span>
                <span className={cn('text-xs font-medium', visible ? 'text-slate-700' : 'text-slate-400')}>
                  {col.label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
