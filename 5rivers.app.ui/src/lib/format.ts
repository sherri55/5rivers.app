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
 * Format time string. Handles both "07:30" and "2025-10-03T07:30" formats.
 * Always returns HH:MM (12-hour with am/pm).
 */
export function formatTime(timeStr: string | null | undefined): string {
  if (!timeStr) return '—';
  // Extract HH:MM from "2025-10-03T07:30" or "07:30"
  const match = String(timeStr).match(/(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return timeStr;
  const h = parseInt(match[1], 10);
  const m = match[2];
  const suffix = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m}${suffix}`;
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
