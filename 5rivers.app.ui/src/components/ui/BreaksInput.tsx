import { useState, useMemo } from 'react';

interface Break {
  start: string;
  end: string;
  tag: string;
}

interface BreaksInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

function parseBreaks(raw: string): Break[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return arr;
  } catch { /* ignore */ }
  return [];
}

function breakMins(b: Break): number {
  const [sh, sm] = b.start.split(':').map(Number);
  const [eh, em] = b.end.split(':').map(Number);
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return 0;
  return (eh * 60 + em) - (sh * 60 + sm);
}

function fmtMins(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

export function BreaksInput({ value, onChange, disabled }: BreaksInputProps) {
  const breaks = useMemo(() => parseBreaks(value), [value]);
  const [draftStart, setDraftStart] = useState('');
  const [draftEnd, setDraftEnd] = useState('');
  const [draftTag, setDraftTag] = useState('');

  const totalMins = useMemo(() => breaks.reduce((s, b) => s + Math.max(0, breakMins(b)), 0), [breaks]);

  const addBreak = () => {
    if (!draftStart || !draftEnd) return;
    const mins = breakMins({ start: draftStart, end: draftEnd, tag: '' });
    if (mins <= 0) return;
    const updated = [...breaks, { start: draftStart, end: draftEnd, tag: draftTag.trim() }];
    onChange(JSON.stringify(updated));
    setDraftStart('');
    setDraftEnd('');
    setDraftTag('');
  };

  const removeBreak = (index: number) => {
    const updated = breaks.filter((_, i) => i !== index);
    onChange(JSON.stringify(updated));
  };

  return (
    <div className="space-y-3">
      {/* Existing breaks as chips */}
      {breaks.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {breaks.map((b, i) => {
            const mins = Math.max(0, breakMins(b));
            return (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-800 rounded-lg text-xs font-medium border border-blue-200/60"
              >
                {b.tag && <span className="font-semibold">{b.tag}</span>}
                <span>{b.start}–{b.end}</span>
                <span className="text-blue-500">({fmtMins(mins)})</span>
                <button
                  type="button"
                  onClick={() => removeBreak(i)}
                  className="ml-0.5 text-blue-400 hover:text-blue-700 transition-colors"
                  tabIndex={-1}
                  disabled={disabled}
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Add-break row */}
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Start</label>
          <input
            type="time"
            value={draftStart}
            onChange={(e) => setDraftStart(e.target.value)}
            className="px-2 py-1.5 text-sm bg-surface-container rounded-lg border border-outline-variant/20 focus:outline-none focus:ring-2 focus:ring-primary/40"
            disabled={disabled}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">End</label>
          <input
            type="time"
            value={draftEnd}
            onChange={(e) => setDraftEnd(e.target.value)}
            className="px-2 py-1.5 text-sm bg-surface-container rounded-lg border border-outline-variant/20 focus:outline-none focus:ring-2 focus:ring-primary/40"
            disabled={disabled}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Label (optional)</label>
          <input
            type="text"
            value={draftTag}
            onChange={(e) => setDraftTag(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addBreak())}
            placeholder="e.g. Lunch"
            className="px-2 py-1.5 text-sm bg-surface-container rounded-lg border border-outline-variant/20 focus:outline-none focus:ring-2 focus:ring-primary/40 w-28"
            disabled={disabled}
          />
        </div>
        <button
          type="button"
          onClick={addBreak}
          disabled={!draftStart || !draftEnd || disabled}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <span className="material-symbols-outlined text-[14px]">add</span>
          Add
        </button>
      </div>

      {/* Footer summary */}
      {breaks.length > 0 && (
        <p className="text-[11px] text-slate-500 ml-0.5">
          Total breaks: <span className="font-bold text-on-surface">{fmtMins(totalMins)}</span>
        </p>
      )}
    </div>
  );
}
