import { useState, useCallback, useMemo } from 'react';

const STORAGE_PREFIX = '5rivers_columns_';

export interface ColumnDef {
  key: string;
  label: string;
  alwaysVisible?: boolean; // e.g. actions column
  defaultVisible?: boolean; // defaults to true
}

export function useColumnVisibility(pageKey: string, columnDefs: ColumnDef[]) {
  const storageKey = STORAGE_PREFIX + pageKey;

  // Load initial state from localStorage
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as string[];
        return new Set(parsed);
      }
    } catch { /* ignore */ }
    // Default: hide columns with defaultVisible=false
    const defaultHidden = columnDefs
      .filter((c) => c.defaultVisible === false && !c.alwaysVisible)
      .map((c) => c.key);
    return new Set(defaultHidden);
  });

  const toggleColumn = useCallback(
    (key: string) => {
      setHiddenKeys((prev) => {
        const next = new Set(prev);
        if (next.has(key)) {
          next.delete(key);
        } else {
          next.add(key);
        }
        localStorage.setItem(storageKey, JSON.stringify([...next]));
        return next;
      });
    },
    [storageKey],
  );

  const isVisible = useCallback(
    (key: string) => {
      const def = columnDefs.find((c) => c.key === key);
      if (def?.alwaysVisible) return true;
      return !hiddenKeys.has(key);
    },
    [hiddenKeys, columnDefs],
  );

  const visibleKeys = useMemo(
    () => new Set(columnDefs.filter((c) => isVisible(c.key)).map((c) => c.key)),
    [columnDefs, isVisible],
  );

  const toggleableColumns = useMemo(
    () => columnDefs.filter((c) => !c.alwaysVisible),
    [columnDefs],
  );

  return { hiddenKeys, visibleKeys, toggleColumn, isVisible, toggleableColumns };
}
