/**
 * JobTypeLabel — single source of truth for how a job type is rendered
 * across the app.
 *
 * Display contract (per design 2026-05):
 *
 *   Row 1:  {company name} - {start location} to {end location}
 *   Row 2:  ({dispatch type})
 *
 * For tight contexts where a two-row layout doesn't fit (Select options,
 * chart bars, CSV exports) use the existing `formatJobTypeLabel()` string
 * helper from `@/lib/format` — it returns the same content on a single
 * line: "Company - From to To (dispatch)". `JobTypeLabel` here is the
 * visual wrapper of that string.
 */

import { formatJobTypeLabel } from '@/lib/format';
import { cn } from '@/lib/cn';

export interface JobTypeLabelProps {
  companyName?: string | null;
  startLocation?: string | null;
  endLocation?: string | null;
  dispatchType?: string | null;
  /** Used when structured fields can't be assembled into a route. */
  fallbackTitle?: string | null;
  className?: string;
}

export function JobTypeLabel({
  companyName,
  startLocation,
  endLocation,
  dispatchType,
  fallbackTitle,
  className,
}: JobTypeLabelProps) {
  // Build the row-1 string by reusing the canonical helper, then trim off
  // the trailing "(dispatch)" so we can render it on its own line.
  const inline = formatJobTypeLabel({
    companyName,
    startLocation,
    endLocation,
    dispatchType: undefined, // exclude — we render dispatchType separately below
    title: fallbackTitle,
  });
  const dispatch = dispatchType?.trim();

  if (!inline && !dispatch) {
    return <span className={cn('text-on-surface-variant', className)}>—</span>;
  }

  return (
    <span className={cn('flex flex-col leading-tight', className)}>
      {inline && <span className="font-medium">{inline}</span>}
      {dispatch && (
        <span className="text-xs text-on-surface-variant mt-0.5">({dispatch})</span>
      )}
    </span>
  );
}
