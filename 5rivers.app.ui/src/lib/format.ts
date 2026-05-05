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
 * Gracefully omits any part that is null/empty.
 * Falls back to `title` if no other data is available.
 */
export function formatJobTypeLabel(opts: {
  companyName?: string | null;
  startLocation?: string | null;
  endLocation?: string | null;
  dispatchType?: string | null;
  title?: string | null;
}): string {
  const { companyName, startLocation, endLocation, dispatchType, title } = opts;
  let label = '';
  if (companyName) label = companyName;
  if (startLocation && endLocation) {
    const route = `${startLocation} to ${endLocation}`;
    label = label ? `${label} - ${route}` : route;
  }
  if (dispatchType) {
    label = label ? `${label} (${dispatchType})` : `(${dispatchType})`;
  }
  return label || title || '';
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
