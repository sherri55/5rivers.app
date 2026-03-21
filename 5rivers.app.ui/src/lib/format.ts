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
  });
}

/**
 * Format time string. Passes through if already in HH:MM format.
 */
export function formatTime(timeStr: string | null | undefined): string {
  if (!timeStr) return '—';
  return timeStr;
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
