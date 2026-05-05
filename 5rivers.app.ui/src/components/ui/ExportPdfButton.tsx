import { useState, useRef, useEffect } from 'react';

export interface PdfColumnDef {
  key: string;
  label: string;
  defaultVisible?: boolean; // defaults to true
}

interface ExportPdfButtonProps {
  onExport: (selectedColumns?: string[]) => Promise<void>;
  columns?: PdfColumnDef[];
  label?: string;
}

export function ExportPdfButton({ onExport, columns, label = 'Export PDF' }: ExportPdfButtonProps) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set((columns ?? []).filter(c => c.defaultVisible !== false).map(c => c.key)),
  );
  const containerRef = useRef<HTMLDivElement>(null);

  // Re-initialise selection when columns prop changes
  useEffect(() => {
    if (columns) {
      setSelected(new Set(columns.filter(c => c.defaultVisible !== false).map(c => c.key)));
    }
  }, [columns]);

  // Close popover on outside click
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  async function handleExport() {
    setLoading(true);
    try {
      await onExport(columns ? [...selected] : undefined);
      setOpen(false);
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleButtonClick() {
    if (columns) {
      setOpen(prev => !prev);
    } else {
      handleExport();
    }
  }

  function toggle(key: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function toggleAll() {
    if (columns && selected.size === columns.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set((columns ?? []).map(c => c.key)));
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={handleButtonClick}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 bg-surface-container-low hover:bg-surface-container ghost-border transition-colors disabled:opacity-50"
      >
        <span className="material-symbols-outlined text-[16px]">
          {loading ? 'hourglass_empty' : 'picture_as_pdf'}
        </span>
        {loading ? 'Generating...' : label}
        {columns && (
          <span className="material-symbols-outlined text-[14px] ml-0.5">
            {open ? 'expand_less' : 'expand_more'}
          </span>
        )}
      </button>

      {/* Column picker popover */}
      {open && columns && (
        <div className="absolute right-0 top-full mt-1.5 z-50 bg-white rounded-xl shadow-xl border border-slate-200 p-3 w-52">
          {/* Header */}
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Columns
            </span>
            <button
              type="button"
              onClick={toggleAll}
              className="text-[11px] text-blue-600 hover:text-blue-800 font-medium"
            >
              {selected.size === columns.length ? 'Deselect all' : 'Select all'}
            </button>
          </div>

          {/* Checkboxes */}
          <div className="flex flex-col gap-1.5 mb-3">
            {columns.map(col => (
              <label key={col.key} className="flex items-center gap-2 cursor-pointer group select-none">
                <input
                  type="checkbox"
                  checked={selected.has(col.key)}
                  onChange={() => toggle(col.key)}
                  className="w-3.5 h-3.5 rounded accent-primary"
                />
                <span className="text-[12px] text-slate-700 group-hover:text-slate-900">
                  {col.label}
                </span>
              </label>
            ))}
          </div>

          {/* Export action */}
          <button
            type="button"
            onClick={handleExport}
            disabled={loading || selected.size === 0}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            <span className="material-symbols-outlined text-[14px]">
              {loading ? 'hourglass_empty' : 'download'}
            </span>
            {loading ? 'Generating…' : 'Export PDF'}
          </button>
        </div>
      )}
    </div>
  );
}
