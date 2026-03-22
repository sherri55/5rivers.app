import { useState, useRef, useCallback, useMemo, type KeyboardEvent } from 'react';

/* ------------------------------------------------------------------ */
/*  WeightTagsInput — tag-based tonnage entry                         */
/*  Each weight is a removable tag. Supports:                         */
/*    • Enter / Tab / comma to add a tag                              */
/*    • "x5" suffix to add multiples (e.g. "22.5x5" adds 5 tags)     */
/*    • Duplicate last tag button for quick repeat entries             */
/*    • Backspace to remove last tag when input is empty              */
/*    • Paste comma/space-separated values                             */
/*    • Total weight + count summary                                  */
/*  Value format: JSON array string "[22.5,22.5,20]"                  */
/* ------------------------------------------------------------------ */

interface WeightTagsInputProps {
  /** JSON array string, space-separated string, or comma-separated string */
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
}

function parseWeights(raw: string): number[] {
  if (!raw) return [];
  // Try JSON array first
  if (raw.startsWith('[')) {
    try {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr.filter((v) => typeof v === 'number' && !isNaN(v) && v > 0);
    } catch { /* fall through */ }
  }
  // Fall back to space/comma separated
  return raw
    .split(/[\s,]+/)
    .map((s) => parseFloat(s))
    .filter((n) => !isNaN(n) && n > 0);
}

function serializeWeights(weights: number[]): string {
  return JSON.stringify(weights);
}

export function WeightTagsInput({ value, onChange, required, disabled }: WeightTagsInputProps) {
  const weights = useMemo(() => parseWeights(value), [value]);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const totalWeight = useMemo(() => weights.reduce((s, w) => s + w, 0), [weights]);

  const addWeights = useCallback(
    (newWeights: number[]) => {
      if (newWeights.length === 0) return;
      const updated = [...weights, ...newWeights];
      onChange(serializeWeights(updated));
    },
    [weights, onChange],
  );

  const removeWeight = useCallback(
    (index: number) => {
      const updated = weights.filter((_, i) => i !== index);
      onChange(serializeWeights(updated));
    },
    [weights, onChange],
  );

  const clearAll = useCallback(() => {
    onChange('[]');
  }, [onChange]);

  const processInput = useCallback(
    (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed) return;

      // Support "22.5x5" syntax → adds 22.5 five times
      const multiMatch = trimmed.match(/^([\d.]+)\s*[xX]\s*(\d+)$/);
      if (multiMatch) {
        const w = parseFloat(multiMatch[1]);
        const count = parseInt(multiMatch[2], 10);
        if (!isNaN(w) && w > 0 && count > 0 && count <= 100) {
          addWeights(Array(count).fill(w));
          setInputValue('');
          return;
        }
      }

      // Support pasting multiple values
      const parsed = trimmed
        .split(/[\s,]+/)
        .map((s) => parseFloat(s))
        .filter((n) => !isNaN(n) && n > 0);

      if (parsed.length > 0) {
        addWeights(parsed);
        setInputValue('');
      }
    },
    [addWeights],
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === 'Tab' || e.key === ',') {
      e.preventDefault();
      processInput(inputValue);
    } else if (e.key === 'Backspace' && inputValue === '' && weights.length > 0) {
      removeWeight(weights.length - 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text');
    if (pasted.includes(',') || pasted.includes(' ') || pasted.includes('\n')) {
      e.preventDefault();
      processInput(pasted);
    }
  };

  const duplicateLast = () => {
    if (weights.length > 0) {
      addWeights([weights[weights.length - 1]]);
    }
  };

  return (
    <div className="space-y-2">
      {/* Tags container + input */}
      <div
        className={`flex flex-wrap items-center gap-1.5 min-h-[48px] px-3 py-2 bg-surface-container rounded-xl border border-outline-variant/20 transition-all
          focus-within:bg-white focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-transparent
          ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
        onClick={() => inputRef.current?.focus()}
      >
        {weights.map((w, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-800 rounded-lg text-xs font-semibold border border-amber-200/60 group hover:bg-amber-100 transition-colors"
          >
            {w}
            <span className="text-[10px] text-amber-500">t</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeWeight(i);
              }}
              className="ml-0.5 text-amber-400 hover:text-amber-700 transition-colors"
              tabIndex={-1}
            >
              <span className="material-symbols-outlined text-[14px]">close</span>
            </button>
          </span>
        ))}

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={() => processInput(inputValue)}
          placeholder={weights.length === 0 ? 'Type weight and press Enter...' : 'Add more...'}
          className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-sm font-medium placeholder:text-slate-400"
          disabled={disabled}
          required={required && weights.length === 0}
        />
      </div>

      {/* Footer: summary + actions */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-3 text-[11px] text-slate-500">
          {weights.length > 0 && (
            <>
              <span className="font-semibold text-amber-700">
                {weights.length} {weights.length === 1 ? 'entry' : 'entries'}
              </span>
              <span className="text-slate-300">|</span>
              <span>
                Total: <span className="font-bold text-on-surface">{totalWeight.toFixed(2)}t</span>
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1">
          {weights.length > 0 && (
            <>
              <button
                type="button"
                onClick={duplicateLast}
                className="inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                title={`Duplicate last (${weights[weights.length - 1]})`}
              >
                <span className="material-symbols-outlined text-[14px]">content_copy</span>
                Dup
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-error hover:bg-error-container/10 rounded-md transition-colors"
              >
                <span className="material-symbols-outlined text-[14px]">delete_sweep</span>
                Clear
              </button>
            </>
          )}
        </div>
      </div>

      {/* Hint */}
      <p className="text-[10px] text-slate-400 ml-1">
        Press <kbd className="px-1 py-0.5 bg-slate-100 rounded text-[9px] font-mono">Enter</kbd> to add.
        Use <kbd className="px-1 py-0.5 bg-slate-100 rounded text-[9px] font-mono">22.5x5</kbd> to add 5 entries of 22.5t.
      </p>
    </div>
  );
}
