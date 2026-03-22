import { useState, useRef, useCallback, useMemo, type KeyboardEvent } from 'react';

/* ------------------------------------------------------------------ */
/*  TagsInput — generic tag-based string entry                        */
/*  Each value is a removable tag. Supports:                          */
/*    • Enter / Tab / comma to add a tag                              */
/*    • Backspace to remove last tag when input is empty              */
/*    • Paste comma/space-separated values                             */
/*  Value format: JSON array string '["A","B","C"]'                   */
/* ------------------------------------------------------------------ */

interface TagsInputProps {
  /** JSON array string, space/comma-separated string */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Tag color scheme */
  color?: 'blue' | 'slate' | 'emerald' | 'amber';
}

const COLOR_MAP = {
  blue:    { tag: 'bg-blue-50 text-blue-800 border-blue-200/60 hover:bg-blue-100', remove: 'text-blue-400 hover:text-blue-700' },
  slate:   { tag: 'bg-slate-50 text-slate-700 border-slate-200/60 hover:bg-slate-100', remove: 'text-slate-400 hover:text-slate-600' },
  emerald: { tag: 'bg-emerald-50 text-emerald-800 border-emerald-200/60 hover:bg-emerald-100', remove: 'text-emerald-400 hover:text-emerald-700' },
  amber:   { tag: 'bg-amber-50 text-amber-800 border-amber-200/60 hover:bg-amber-100', remove: 'text-amber-400 hover:text-amber-700' },
};

function parseTags(raw: string): string[] {
  if (!raw) return [];
  // Try JSON array first
  if (raw.startsWith('[')) {
    try {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr.map(String).filter(Boolean);
    } catch { /* fall through */ }
  }
  // Fall back to comma/space separated
  return raw.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);
}

function serializeTags(tags: string[]): string {
  return JSON.stringify(tags);
}

export function TagsInput({ value, onChange, placeholder, disabled, color = 'blue' }: TagsInputProps) {
  const tags = useMemo(() => parseTags(value), [value]);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const colors = COLOR_MAP[color];

  const addTags = useCallback(
    (newTags: string[]) => {
      if (newTags.length === 0) return;
      const updated = [...tags, ...newTags];
      onChange(serializeTags(updated));
    },
    [tags, onChange],
  );

  const removeTag = useCallback(
    (index: number) => {
      const updated = tags.filter((_, i) => i !== index);
      onChange(serializeTags(updated));
    },
    [tags, onChange],
  );

  const clearAll = useCallback(() => {
    onChange('[]');
  }, [onChange]);

  const processInput = useCallback(
    (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed) return;
      // Split by comma or whitespace
      const parsed = trimmed.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);
      if (parsed.length > 0) {
        addTags(parsed);
        setInputValue('');
      }
    },
    [addTags],
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === 'Tab' || e.key === ',') {
      e.preventDefault();
      processInput(inputValue);
    } else if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text');
    if (pasted.includes(',') || pasted.includes(' ') || pasted.includes('\n')) {
      e.preventDefault();
      processInput(pasted);
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
        {tags.map((tag, i) => (
          <span
            key={i}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${colors.tag}`}
          >
            {tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(i);
              }}
              className={`ml-0.5 transition-colors ${colors.remove}`}
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
          placeholder={tags.length === 0 ? (placeholder ?? 'Type and press Enter...') : 'Add more...'}
          className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-sm font-medium placeholder:text-slate-400"
          disabled={disabled}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] text-slate-500">
          {tags.length > 0 && (
            <span className="font-semibold">{tags.length} {tags.length === 1 ? 'item' : 'items'}</span>
          )}
        </span>
        {tags.length > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-error hover:bg-error-container/10 rounded-md transition-colors"
          >
            <span className="material-symbols-outlined text-[14px]">delete_sweep</span>
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
