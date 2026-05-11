/**
 * Format a number as USD currency.
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
}

/**
 * Compute what a job's amount WOULD be from its job type rate × the job's
 * own data (hours, loads, weight). Returns null when:
 *   - the job type's rate is unset (rate pending at the type level)
 *   - the dispatch type is hourly/tonnage but the necessary data is missing
 *
 * This is the same formula the JobFormPage uses for its "Calculated Amount"
 * preview — shared here so the JobsListPage can decide whether a job with a
 * NULL `amount` column is "rate pending" or just "not explicitly entered yet,
 * but derivable from the type's rate".
 */
export function computeJobPreviewAmount(opts: {
  rate: number | null | undefined;
  dispatchType: string | null | undefined;
  startTime: string | null | undefined;
  endTime: string | null | undefined;
  loads: number | null | undefined;
  weight: string | null | undefined;
}): number | null {
  const { rate, dispatchType, startTime, endTime, loads, weight } = opts;
  if (rate == null || rate === 0) return null;

  switch ((dispatchType ?? '').toLowerCase()) {
    case 'fixed':
      return rate;
    case 'load':
    case 'loads': {
      // Mirrors server `autoCalcAmount`: a load-type job with no `loads`
      // count is treated as a single load. Otherwise every single-trip
      // ticket (where drivers rarely fill in a count) would render as
      // "Rate Pending" even though the job type has a rate.
      const effectiveLoads = loads ?? 1;
      return Math.round(rate * effectiveLoads * 100) / 100;
    }
    case 'hourly': {
      if (!startTime || !endTime) return null;
      const start = new Date(startTime).getTime();
      const end   = new Date(endTime).getTime();
      if (isNaN(start) || isNaN(end) || end <= start) return null;
      const hours = (end - start) / (1000 * 60 * 60);
      return Math.round(rate * hours * 100) / 100;
    }
    case 'tonnage': {
      if (!weight) return null;
      let weights: number[] = [];
      if (weight.startsWith('[')) {
        try { weights = JSON.parse(weight).filter((n: number) => !isNaN(n) && n > 0); } catch { /* ignore */ }
      }
      if (weights.length === 0) {
        weights = weight.split(/[\s,]+/).map((w) => parseFloat(w)).filter((w) => !isNaN(w) && w > 0);
      }
      if (weights.length === 0) return null;
      const total = weights.reduce((s, w) => s + w, 0);
      return Math.round(rate * total * 100) / 100;
    }
    default:
      // Unknown dispatch type but a rate is present — fall back to flat-rate.
      // Avoids rendering "Rate Pending" when a JobType was created with a
      // dispatch label the UI doesn't recognise yet (e.g. an old enum value
      // or a new one not yet handled).
      return rate;
  }
}

/**
 * Format an ISO date string to a readable format.
 * e.g. "2026-03-15" → "Mar 15, 2026"
 * All dates are treated as Eastern Time (America/Toronto).
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  // Handle both "2026-03-21" and "2026-03-21T00:00:00.000Z" formats
  const cleaned = String(dateStr).slice(0, 10); // Always take YYYY-MM-DD part
  const date = new Date(cleaned + 'T00:00:00');
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/Toronto',
  });
}

/**
 * Returns today's date as YYYY-MM-DD in Eastern Time.
 * Use this instead of new Date().toISOString().split('T')[0] to avoid
 * UTC date boundary issues (e.g. after 8pm ET, toISOString() returns tomorrow).
 */
export function todayEastern(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Toronto' });
}

/**
 * Format time for display. Returns "7:30am" in Eastern time.
 *
 * Handles:
 *   "2025-12-05T12:00:00.000Z" → UTC ISO (convert to Eastern)
 *   "2025-10-03T07:30"         → legacy ISO without Z (Eastern implied)
 *   "07:30"                    → bare HH:MM (Eastern implied)
 */
export function formatTime(timeStr: string | null | undefined): string {
  if (!timeStr) return '—';
  const s = String(timeStr);

  // UTC ISO string → convert to Eastern for display
  if (s.includes('T') && (s.endsWith('Z') || /[+-]\d{2}:\d{2}/.test(s))) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString('en-US', {
        timeZone: 'America/Toronto',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).toLowerCase().replace(' ', '');
    }
  }

  // Legacy: extract HH:MM from "2025-10-03T07:30" or "07:30"
  const match = s.match(/(\d{1,2}):(\d{2})/);
  if (!match) return timeStr;
  const h = parseInt(match[1], 10);
  const m = match[2];
  const suffix = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m}${suffix}`;
}

/**
 * Extract "HH:MM" (24h, Eastern) from a time value — for <input type="time">.
 *
 * Handles:
 *   "2025-12-05T12:00:00.000Z" → "07:00" (UTC → Eastern)
 *   "2025-10-03T07:30"         → "07:30"
 *   "07:30"                    → "07:30"
 */
export function extractTimeForInput(timeStr: string | null | undefined): string {
  if (!timeStr) return '';
  const s = String(timeStr);

  // UTC ISO string → convert to Eastern, return HH:MM
  if (s.includes('T') && (s.endsWith('Z') || /[+-]\d{2}:\d{2}/.test(s))) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Toronto',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).formatToParts(d);
      const h = parts.find(p => p.type === 'hour')?.value ?? '00';
      const m = parts.find(p => p.type === 'minute')?.value ?? '00';
      return `${h}:${m}`;
    }
  }

  // Legacy: extract HH:MM
  const match = s.match(/(\d{1,2}):(\d{2})/);
  if (match) {
    return match[1].padStart(2, '0') + ':' + match[2];
  }
  return '';
}

/**
 * Parse a time value into total minutes from midnight (Eastern time).
 * Used for hours/amount calculations.
 */
export function parseTimeMinutesET(timeStr: string | null | undefined): number | null {
  if (!timeStr) return null;
  const hhmm = extractTimeForInput(timeStr);
  if (!hhmm) return null;
  const [h, m] = hhmm.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

/**
 * Format a job-type label from its constituent fields.
 * Produces: "{Company} - {Start} to {End} ({dispatchType})"
 *
 * Three resolution paths in priority order:
 *
 *   1. Full structured data (company + start + end) — render the canonical
 *      "{Company} - {Start} to {End}" string.
 *   2. Title fallback — when the structured route can't be assembled, use the
 *      legacy `title` field (which historically encodes the route as
 *      "Company - Start ⇄ End - $85/hr"). We strip the trailing rate suffix
 *      so it reads cleanly. This handles old JobType rows from before
 *      startLocation/endLocation became required.
 *   3. Company-only — if no title either, just the company name.
 *
 * The dispatchType, when provided, is appended in parens regardless of which
 * branch produced the body.
 */
export function formatJobTypeLabel(opts: {
  companyName?: string | null;
  startLocation?: string | null;
  endLocation?: string | null;
  dispatchType?: string | null;
  title?: string | null;
}): string {
  const { companyName, startLocation, endLocation, dispatchType, title } = opts;

  // Build the route portion from whichever location pieces are available.
  // If both are present, render "Start to End"; if only one, render just
  // that one (no "to" keyword); if neither, the route is empty.
  const start = startLocation?.trim() || '';
  const end = endLocation?.trim() || '';
  const route = start && end
    ? `${start} to ${end}`
    : (start || end);

  let body = '';
  if (companyName && route) {
    body = `${companyName} - ${route}`;
  } else if (companyName && title) {
    // No structured locations at all — fall back to the title (legacy job
    // types often encode the route as "Company - Start ⇄ End - $85/hr").
    // Strip the trailing rate suffix so it reads cleanly.
    body = title.replace(/\s+-\s+\$[\d,.]+\s*\/?\s*(hr|hour|load|loads|ton|tons|tonne|tonnes|job)?\s*$/i, '').trim();
  } else if (companyName) {
    body = companyName;
  } else if (route) {
    body = route;
  } else if (title) {
    body = title.replace(/\s+-\s+\$[\d,.]+\s*\/?\s*(hr|hour|load|loads|ton|tons|tonne|tonnes|job)?\s*$/i, '').trim();
  }

  if (dispatchType) {
    return body ? `${body} (${dispatchType})` : `(${dispatchType})`;
  }
  return body;
}

/**
 * Get initials from a name (e.g. "James Sullivan" → "JS").
 */
export function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
