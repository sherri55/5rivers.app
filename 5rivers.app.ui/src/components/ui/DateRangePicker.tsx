import { useState, useRef, useEffect } from 'react';

interface DateRangePickerProps {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  placeholder?: string;
  className?: string;
}

function formatDisplay(from: string, to: string, placeholder: string): string {
  const fmt = (d: string) => {
    const [y, m, day] = d.split('-');
    return `${m}/${day}/${y}`;
  };
  if (from && to) return `${fmt(from)} – ${fmt(to)}`;
  if (from) return `From ${fmt(from)}`;
  if (to) return `To ${fmt(to)}`;
  return placeholder;
}

export function DateRangePicker({ from, to, onChange, placeholder = 'Date range', className = '' }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const hasValue = !!(from || to);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger — identical classes to Select filter variant */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="relative w-full appearance-none rounded-xl bg-surface-container-low text-on-surface transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40 focus:bg-white hover:bg-surface-container pl-3 pr-9 py-2 text-xs font-medium border border-outline-variant/15 ghost-border text-left"
        >
          {formatDisplay(from, to, placeholder)}
        </button>
        {/* Chevron — identical to Select */}
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant/50 text-[16px]">
          expand_more
        </span>
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white rounded-xl shadow-lg border border-outline-variant/15 p-4 flex flex-col gap-3 min-w-[200px]">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/60">From</label>
            <input
              type="date"
              value={from}
              max={to || undefined}
              onChange={(e) => onChange(e.target.value, to)}
              className="w-full appearance-none rounded-xl bg-surface-container-low text-on-surface pl-3 pr-3 py-2 text-xs font-medium border border-outline-variant/15 ghost-border focus:outline-none focus:ring-2 focus:ring-primary/40 focus:bg-white transition-all duration-200"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/60">To</label>
            <input
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => onChange(from, e.target.value)}
              className="w-full appearance-none rounded-xl bg-surface-container-low text-on-surface pl-3 pr-3 py-2 text-xs font-medium border border-outline-variant/15 ghost-border focus:outline-none focus:ring-2 focus:ring-primary/40 focus:bg-white transition-all duration-200"
            />
          </div>
          {hasValue && (
            <button
              type="button"
              onClick={() => { onChange('', ''); setOpen(false); }}
              className="text-xs text-on-surface-variant/50 hover:text-on-surface text-left transition-colors"
            >
              Clear dates
            </button>
          )}
        </div>
      )}
    </div>
  );
}
